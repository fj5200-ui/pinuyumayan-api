import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { alerts, failsafeRules, drones } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import type { TelemetryFrame } from '../adapters/drone-adapter.interface';
import { TelemetryGateway } from '../telemetry/telemetry.gateway';
import { GeofencingService } from '../geofencing/geofencing.service';
import { DroneAdapterRegistry } from '../adapters/drone-adapter.registry';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  /** 防抖：每個告警類型最多每 10 秒觸發一次 */
  private alertCooldowns = new Map<string, number>();
  private readonly COOLDOWN_MS = 10_000;

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private readonly gateway: TelemetryGateway,
    private readonly geofencing: GeofencingService,
    private readonly registry: DroneAdapterRegistry,
  ) {}

  async findByDrone(droneId: number) {
    return this.db.select().from(alerts).where(eq(alerts.droneId, droneId))
      .orderBy(alerts.triggeredAt);
  }

  async findUnresolved(droneId: number) {
    return this.db.select().from(alerts).where(
      and(eq(alerts.droneId, droneId), eq(alerts.isResolved, false)),
    );
  }

  async resolve(alertId: number) {
    const [a] = await this.db.update(alerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(alerts.id, alertId))
      .returning();
    return a;
  }

  async getFailsafeRules(droneId: number) {
    return this.db.select().from(failsafeRules).where(eq(failsafeRules.droneId, droneId));
  }

  async upsertFailsafeRule(droneId: number, data: any) {
    // 先找是否已有相同 triggerType 規則
    const [existing] = await this.db.select().from(failsafeRules)
      .where(and(eq(failsafeRules.droneId, droneId), eq(failsafeRules.triggerType, data.triggerType)))
      .limit(1);

    if (existing) {
      const [updated] = await this.db.update(failsafeRules)
        .set(data).where(eq(failsafeRules.id, existing.id)).returning();
      return updated;
    }

    const [rule] = await this.db.insert(failsafeRules)
      .values({ droneId, ...data }).returning();
    return rule;
  }

  /**
   * 遙測管道呼叫此方法以評估失控保護規則
   * 在 TelemetryService.ingestFrame() 中呼叫
   */
  async evaluateRules(droneId: number, frame: TelemetryFrame, flightLogId?: number): Promise<void> {
    const rules = await this.getFailsafeRules(droneId);

    const checks: Array<{
      type: typeof alerts.$inferSelect['type'];
      condition: boolean;
      severity: typeof alerts.$inferSelect['severity'];
      message: string;
    }> = [
      {
        type: 'low_battery',
        condition: frame.batteryPercent < (
          rules.find(r => r.triggerType === 'low_battery')?.thresholdValue ?? 20
        ),
        severity: frame.batteryPercent < 10 ? 'critical' : 'warning',
        message: `電池電量低：${frame.batteryPercent}%`,
      },
      {
        type: 'gps_anomaly',
        condition: frame.gpsSatellites < 6 || frame.gpsFixType < 3,
        severity: 'warning',
        message: `GPS 訊號異常：${frame.gpsSatellites} 顆衛星，定位類型 ${frame.gpsFixType}`,
      },
      {
        type: 'lost_connection',
        condition: frame.rssi < -90 || frame.linkQuality < 30,
        severity: 'critical',
        message: `訊號強度低：RSSI ${frame.rssi} dBm，連線品質 ${frame.linkQuality}%`,
      },
    ];

    for (const check of checks) {
      if (!check.condition) continue;
      const cooldownKey = `${droneId}:${check.type}`;
      const lastFired = this.alertCooldowns.get(cooldownKey) || 0;
      if (Date.now() - lastFired < this.COOLDOWN_MS) continue;
      this.alertCooldowns.set(cooldownKey, Date.now());

      await this.fireAlert(droneId, check, flightLogId);

      // 若嚴重且有對應失控規則，執行自動保護動作
      if (check.severity === 'critical') {
        const rule = rules.find(r => r.triggerType === check.type && r.isEnabled);
        if (rule) {
          await this.executeSafetyAction(droneId, rule.action);
        }
      }
    }

    // 地理圍欄穿越（每 5 秒最多檢查一次，避免高頻查詢 DB）
    if (Math.floor(Date.now() / 5000) % 1 === 0) {
      const { inside, zones } = await this.geofencing.checkPoint(frame.latitude, frame.longitude);
      if (inside) {
        const cooldownKey = `${droneId}:geofence_breach`;
        if (Date.now() - (this.alertCooldowns.get(cooldownKey) || 0) >= this.COOLDOWN_MS) {
          this.alertCooldowns.set(cooldownKey, Date.now());
          await this.fireAlert(droneId, {
            type: 'geofence_breach',
            severity: 'critical',
            message: `地理圍欄穿越：${zones.map(z => z.name).join('、')}`,
            condition: true,
          }, flightLogId);
        }
      }
    }
  }

  private async fireAlert(
    droneId: number,
    check: { type: any; severity: any; message: string; condition: boolean },
    flightLogId?: number,
  ): Promise<void> {
    this.logger.warn(`告警觸發 droneId=${droneId} type=${check.type}: ${check.message}`);

    const [alert] = await this.db.insert(alerts).values({
      droneId,
      flightLogId: flightLogId || null,
      type: check.type,
      severity: check.severity,
      message: check.message,
    }).returning();

    this.gateway.broadcastAlert(droneId, {
      droneId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      triggeredAt: alert.triggeredAt.toISOString(),
    });
  }

  private async executeSafetyAction(droneId: number, action: string): Promise<void> {
    this.logger.warn(`執行失控保護：droneId=${droneId} action=${action}`);
    try {
      const adapter = this.registry.tryGet(droneId);
      if (!adapter?.isConnected()) return;

      switch (action) {
        case 'return_home': await adapter.sendCommand({ type: 'return_home', payload: {} }); break;
        case 'land':        await adapter.sendCommand({ type: 'land', payload: {} }); break;
        case 'hover':       await adapter.sendCommand({ type: 'hover', payload: {} }); break;
        // 'continue': 不動作
      }
    } catch (err: any) {
      this.logger.error(`失控保護執行失敗：${err.message}`);
    }
  }
}

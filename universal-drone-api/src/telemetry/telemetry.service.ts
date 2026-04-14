import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import { telemetrySnapshots, drones } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import type Redis from 'ioredis';
import type { TelemetryFrame } from '../adapters/drone-adapter.interface';
import { TelemetryGateway } from './telemetry.gateway';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  /** 每機的幀計數器，用於 write-behind 節流 */
  private frameCounters = new Map<number, number>();
  /** 每機上次寫入 DB 的時間 */
  private lastWriteTimes = new Map<number, number>();

  private readonly WRITE_EVERY_N_FRAMES = 10;
  private readonly WRITE_EVERY_MS = 5000;

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS) private redis: Redis,
    private readonly gateway: TelemetryGateway,
  ) {}

  /**
   * 遙測資料管道主入口
   * 1. 寫入 Redis（即時狀態）
   * 2. 廣播 WebSocket
   * 3. Write-behind 到 PostgreSQL（節流）
   */
  async ingestFrame(frame: TelemetryFrame, flightLogId?: number): Promise<void> {
    const { droneId } = frame;

    // ── 1. Redis HSET ────────────────────────────────────────
    await this.redis.hset(`drone:${droneId}:telemetry`, {
      latitude:         frame.latitude,
      longitude:        frame.longitude,
      altitudeMeters:   frame.altitudeMeters,
      gpsFixType:       frame.gpsFixType,
      gpsSatellites:    frame.gpsSatellites,
      roll:             frame.roll,
      pitch:            frame.pitch,
      yaw:              frame.yaw,
      speedMps:         frame.speedMps,
      verticalSpeedMps: frame.verticalSpeedMps,
      batteryPercent:   frame.batteryPercent,
      batteryVoltage:   frame.batteryVoltage,
      batteryCurrentA:  frame.batteryCurrentA,
      rssi:             frame.rssi,
      linkQuality:      frame.linkQuality,
      flightMode:       frame.flightMode,
      isArmed:          String(frame.isArmed),
      timestamp:        frame.timestamp.toISOString(),
    });
    // 60 秒過期（離線後自動清除）
    await this.redis.expire(`drone:${droneId}:telemetry`, 60);

    // ── 2. WebSocket 廣播 ────────────────────────────────────
    this.gateway.broadcastTelemetry(droneId, frame);

    // ── 3. Write-behind（節流） ──────────────────────────────
    const count = (this.frameCounters.get(droneId) || 0) + 1;
    this.frameCounters.set(droneId, count);
    const lastWrite = this.lastWriteTimes.get(droneId) || 0;
    const now = Date.now();

    const shouldWrite =
      count % this.WRITE_EVERY_N_FRAMES === 0 ||
      now - lastWrite >= this.WRITE_EVERY_MS;

    if (shouldWrite) {
      this.lastWriteTimes.set(droneId, now);
      await this.writeSnapshot(frame, flightLogId).catch(err =>
        this.logger.warn(`寫入遙測快照失敗：${err.message}`),
      );
    }
  }

  private async writeSnapshot(frame: TelemetryFrame, flightLogId?: number): Promise<void> {
    await this.db.insert(telemetrySnapshots).values({
      droneId:          frame.droneId,
      flightLogId:      flightLogId || null,
      latitude:         frame.latitude,
      longitude:        frame.longitude,
      altitudeMeters:   frame.altitudeMeters,
      gpsFixType:       frame.gpsFixType,
      gpsSatellites:    frame.gpsSatellites,
      roll:             frame.roll,
      pitch:            frame.pitch,
      yaw:              frame.yaw,
      speedMps:         frame.speedMps,
      verticalSpeedMps: frame.verticalSpeedMps,
      batteryPercent:   frame.batteryPercent,
      batteryVoltage:   frame.batteryVoltage,
      batteryCurrentA:  frame.batteryCurrentA,
      rssi:             frame.rssi,
      linkQuality:      frame.linkQuality,
      flightMode:       frame.flightMode,
      isArmed:          frame.isArmed,
      recordedAt:       frame.timestamp,
    });
  }

  async getLiveState(droneId: number): Promise<Record<string, string> | null> {
    const data = await this.redis.hgetall(`drone:${droneId}:telemetry`);
    return Object.keys(data).length > 0 ? data : null;
  }

  async getRecentSnapshots(droneId: number, limit = 200) {
    return this.db.select().from(telemetrySnapshots)
      .where(eq(telemetrySnapshots.droneId, droneId))
      .limit(limit);
  }
}

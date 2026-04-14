import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { deviceConnections, drones } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import { DroneAdapterRegistry } from '../adapters/drone-adapter.registry';
import { TelemetryService } from '../telemetry/telemetry.service';
import { Px4Adapter } from '../adapters/px4/px4.adapter';
import { ArduPilotAdapter } from '../adapters/ardupilot/ardupilot.adapter';
import { DjiAdapter } from '../adapters/dji/dji.adapter';
import { CustomAdapter } from '../adapters/custom/custom.adapter';
import type { DroneAdapter } from '../adapters/drone-adapter.interface';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private readonly registry: DroneAdapterRegistry,
    private readonly telemetry: TelemetryService,
  ) {}

  async findByDrone(droneId: number) {
    return this.db.select().from(deviceConnections)
      .where(eq(deviceConnections.droneId, droneId));
  }

  async create(droneId: number, data: any) {
    const [conn] = await this.db.insert(deviceConnections).values({
      droneId,
      type: data.type,
      endpoint: data.endpoint,
      connectionMetadata: data.connectionMetadata
        ? JSON.stringify(data.connectionMetadata) : null,
    }).returning();
    return conn;
  }

  async update(id: number, data: any) {
    const [conn] = await this.db.update(deviceConnections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deviceConnections.id, id)).returning();
    return conn;
  }

  async remove(id: number) {
    await this.db.delete(deviceConnections).where(eq(deviceConnections.id, id));
    return { message: '連線設定已刪除' };
  }

  async connect(id: number) {
    const [conn] = await this.db.select().from(deviceConnections)
      .where(eq(deviceConnections.id, id)).limit(1);
    if (!conn) throw new NotFoundException(`找不到連線設定 #${id}`);

    const [drone] = await this.db.select().from(drones)
      .where(eq(drones.id, conn.droneId)).limit(1);
    if (!drone) throw new NotFoundException('找不到對應的無人機');

    // 建立對應品牌的適配器
    const adapter: DroneAdapter = this.createAdapter(drone.brand, drone.id);

    await adapter.connect({
      type: conn.type as any,
      endpoint: conn.endpoint || '',
      options: conn.connectionMetadata
        ? JSON.parse(conn.connectionMetadata) : undefined,
    });

    // 綁定遙測回呼
    adapter.onTelemetry((frame) => {
      this.telemetry.ingestFrame(frame).catch(err =>
        this.logger.warn(`遙測寫入失敗：${err.message}`),
      );
    });

    this.registry.register(drone.id, adapter);

    await this.db.update(deviceConnections).set({
      isConnected: true,
      lastConnectedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(deviceConnections.id, id));

    this.logger.log(`無人機 #${drone.id} (${drone.brand}) 連線成功`);
    return { message: '連線成功', droneId: drone.id };
  }

  async disconnect(id: number) {
    const [conn] = await this.db.select().from(deviceConnections)
      .where(eq(deviceConnections.id, id)).limit(1);
    if (!conn) throw new NotFoundException(`找不到連線設定 #${id}`);

    const adapter = this.registry.tryGet(conn.droneId);
    if (adapter?.isConnected()) {
      await adapter.disconnect();
    }
    this.registry.unregister(conn.droneId);

    await this.db.update(deviceConnections).set({
      isConnected: false,
      lastDisconnectedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(deviceConnections.id, id));

    return { message: '已斷線' };
  }

  private createAdapter(brand: string, droneId: number): DroneAdapter {
    switch (brand) {
      case 'px4':        return new Px4Adapter(droneId);
      case 'ardupilot':  return new ArduPilotAdapter(droneId);
      case 'dji':        return new DjiAdapter(droneId);
      case 'autel':
      case 'custom':
      default:           return new CustomAdapter(droneId);
    }
  }
}

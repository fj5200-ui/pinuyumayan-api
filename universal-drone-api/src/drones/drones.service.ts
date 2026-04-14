import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import { drones } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import type Redis from 'ioredis';
import { CreateDroneDto, UpdateDroneDto } from './drones.dto';

@Injectable()
export class DronesService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS) private redis: Redis,
  ) {}

  async findAll(userId?: number) {
    const list = await this.db.select().from(drones).where(eq(drones.isActive, true));
    // 附加 Redis 即時狀態
    return Promise.all(list.map(d => this.attachLiveStatus(d)));
  }

  async findOne(id: number) {
    const [drone] = await this.db.select().from(drones).where(
      and(eq(drones.id, id), eq(drones.isActive, true))
    ).limit(1);
    if (!drone) throw new NotFoundException(`找不到無人機 #${id}`);
    return this.attachLiveStatus(drone);
  }

  async create(dto: CreateDroneDto, userId: number) {
    const existing = await this.db.select().from(drones)
      .where(eq(drones.serialNumber, dto.serialNumber)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException(`序號 ${dto.serialNumber} 已存在`);
    }

    const [drone] = await this.db.insert(drones).values({
      ...dto,
      brand: dto.brand as any,
      registeredById: userId,
    }).returning();
    return drone;
  }

  async update(id: number, dto: UpdateDroneDto) {
    await this.findOne(id);
    const [updated] = await this.db.update(drones).set({
      ...dto,
      status: dto.status as any,
      updatedAt: new Date(),
    }).where(eq(drones.id, id)).returning();
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.db.update(drones).set({ isActive: false, updatedAt: new Date() })
      .where(eq(drones.id, id));
    return { message: '無人機已停用' };
  }

  /** 從 Redis 取得即時遙測狀態並合併到無人機資料 */
  private async attachLiveStatus(drone: any) {
    try {
      const live = await this.redis.hgetall(`drone:${drone.id}:telemetry`);
      if (live && Object.keys(live).length > 0) {
        return {
          ...drone,
          live: {
            latitude:       parseFloat(live.latitude) || null,
            longitude:      parseFloat(live.longitude) || null,
            altitudeMeters: parseFloat(live.altitudeMeters) || null,
            batteryPercent: parseInt(live.batteryPercent) || null,
            speedMps:       parseFloat(live.speedMps) || null,
            flightMode:     live.flightMode || null,
            isArmed:        live.isArmed === 'true',
            gpsSatellites:  parseInt(live.gpsSatellites) || null,
            rssi:           parseInt(live.rssi) || null,
            updatedAt:      live.timestamp || null,
          },
        };
      }
    } catch {
      // Redis 不可用時靜默失敗
    }
    return { ...drone, live: null };
  }
}

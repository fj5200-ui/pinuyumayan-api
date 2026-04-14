import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { REDIS } from '../redis/redis.module';
import { fleetGroups, fleetGroupMembers } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
import type Redis from 'ioredis';

@Injectable()
export class FleetService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS) private redis: Redis,
  ) {}

  async findAll() {
    return this.db.select().from(fleetGroups);
  }

  async findOne(id: number) {
    const [group] = await this.db.select().from(fleetGroups)
      .where(eq(fleetGroups.id, id)).limit(1);
    if (!group) throw new NotFoundException(`找不到編隊群組 #${id}`);
    const members = await this.db.select().from(fleetGroupMembers)
      .where(eq(fleetGroupMembers.groupId, id));
    return { ...group, members };
  }

  async create(data: any, userId: number) {
    const [group] = await this.db.insert(fleetGroups).values({
      name: data.name,
      description: data.description,
      createdById: userId,
    }).returning();
    return group;
  }

  async update(id: number, data: any) {
    const [group] = await this.db.update(fleetGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(fleetGroups.id, id)).returning();
    return group;
  }

  async remove(id: number) {
    await this.db.delete(fleetGroups).where(eq(fleetGroups.id, id));
    return { message: '編隊群組已刪除' };
  }

  /** 取得編隊所有無人機的即時狀態（並行讀取 Redis） */
  async getFleetStatus(groupId: number) {
    const members = await this.db.select().from(fleetGroupMembers)
      .where(eq(fleetGroupMembers.groupId, groupId));

    const statuses = await Promise.all(
      members.map(async (m) => {
        try {
          const live = await this.redis.hgetall(`drone:${m.droneId}:telemetry`);
          return {
            droneId:  m.droneId,
            role:     m.role,
            online:   Object.keys(live).length > 0,
            live: Object.keys(live).length > 0 ? {
              latitude:       parseFloat(live.latitude) || null,
              longitude:      parseFloat(live.longitude) || null,
              altitudeMeters: parseFloat(live.altitudeMeters) || null,
              batteryPercent: parseInt(live.batteryPercent) || null,
              speedMps:       parseFloat(live.speedMps) || null,
              flightMode:     live.flightMode || null,
              isArmed:        live.isArmed === 'true',
              timestamp:      live.timestamp || null,
            } : null,
          };
        } catch {
          return { droneId: m.droneId, role: m.role, online: false, live: null };
        }
      }),
    );

    return statuses;
  }

  async addMember(groupId: number, droneId: number, role = 'follower') {
    const [m] = await this.db.insert(fleetGroupMembers).values({
      groupId, droneId, role,
    }).returning();
    return m;
  }

  async removeMember(groupId: number, droneId: number) {
    await this.db.delete(fleetGroupMembers).where(
      eq(fleetGroupMembers.groupId, groupId),
    );
    return { message: '成員已移除' };
  }

  async setMasterDrone(groupId: number, droneId: number) {
    const [group] = await this.db.update(fleetGroups)
      .set({ masterDroneId: droneId, updatedAt: new Date() })
      .where(eq(fleetGroups.id, groupId)).returning();
    return group;
  }
}

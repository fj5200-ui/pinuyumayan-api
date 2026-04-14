import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { maintenanceRecords, batteries } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class MaintenanceService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
  ) {}

  async getRecordsByDrone(droneId: number) {
    return this.db.select().from(maintenanceRecords)
      .where(eq(maintenanceRecords.droneId, droneId))
      .orderBy(maintenanceRecords.performedAt);
  }

  async createRecord(droneId: number, data: any, userId: number) {
    const [r] = await this.db.insert(maintenanceRecords).values({
      droneId,
      performedById: userId,
      type:          data.type,
      description:   data.description,
      partsReplaced: data.partsReplaced,
      nextDueAt:     data.nextDueAt ? new Date(data.nextDueAt) : null,
      performedAt:   data.performedAt ? new Date(data.performedAt) : new Date(),
    }).returning();
    return r;
  }

  async updateRecord(id: number, data: any) {
    const [r] = await this.db.update(maintenanceRecords)
      .set(data).where(eq(maintenanceRecords.id, id)).returning();
    return r;
  }

  async getBatteriesByDrone(droneId: number) {
    return this.db.select().from(batteries)
      .where(eq(batteries.droneId, droneId));
  }

  async createBattery(data: any) {
    const [b] = await this.db.insert(batteries).values({
      droneId:      data.droneId || null,
      serialNumber: data.serialNumber,
      brand:        data.brand,
      capacityMah:  data.capacityMah,
      cycleCount:   data.cycleCount ?? 0,
      healthPercent: data.healthPercent,
      notes:        data.notes,
    }).returning();
    return b;
  }

  async updateBattery(id: number, data: any) {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.lastChargedAt) {
      updateData.lastChargedAt = new Date(data.lastChargedAt);
      // 每次充電增加循環次數
      const [existing] = await this.db.select().from(batteries)
        .where(eq(batteries.id, id)).limit(1);
      if (existing && !existing.lastChargedAt) {
        updateData.cycleCount = (existing.cycleCount || 0) + 1;
      }
    }
    const [b] = await this.db.update(batteries).set(updateData)
      .where(eq(batteries.id, id)).returning();
    return b;
  }
}

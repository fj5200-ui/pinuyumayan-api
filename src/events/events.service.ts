import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { events, tribes } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class EventsService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll(page = 1, limit = 10, type?: string, upcoming?: boolean) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];
    if (type) conditions.push(eq(events.type, type as any));
    if (upcoming) {
      const today = new Date().toISOString().split('T')[0];
      conditions.push(gte(events.startDate, today));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [countResult] = await this.db.select({ count: sql<number>`count(*)` }).from(events).where(where);
    const rows = await this.db.select({ id: events.id, title: events.title, description: events.description, type: events.type, location: events.location, startDate: events.startDate, endDate: events.endDate, tribeId: events.tribeId, coverImage: events.coverImage, createdAt: events.createdAt, tribeName: tribes.name })
      .from(events).leftJoin(tribes, eq(events.tribeId, tribes.id)).where(where).orderBy(events.startDate).limit(limit).offset(offset);
    return { events: rows, pagination: { page, limit, total: Number(countResult.count), totalPages: Math.ceil(Number(countResult.count) / limit) } };
  }

  async findOne(id: number) {
    const [event] = await this.db.select({ id: events.id, title: events.title, description: events.description, type: events.type, location: events.location, startDate: events.startDate, endDate: events.endDate, tribeId: events.tribeId, coverImage: events.coverImage, createdAt: events.createdAt, createdBy: events.createdBy, tribeName: tribes.name, tribeRegion: tribes.region })
      .from(events).leftJoin(tribes, eq(events.tribeId, tribes.id)).where(eq(events.id, id));
    if (!event) throw new NotFoundException('找不到活動');
    return { event };
  }

  async create(data: any, userId: number) {
    const [event] = await this.db.insert(events).values({ ...data, createdBy: userId }).returning();
    return { event };
  }

  async update(id: number, data: any, userId: number, role: string) {
    const [existing] = await this.db.select().from(events).where(eq(events.id, id));
    if (!existing) throw new NotFoundException('找不到活動');
    if (existing.createdBy !== userId && role !== 'admin') throw new ForbiddenException('無權限');
    const updateData: any = { updatedAt: new Date() };
    for (const key of ['title', 'description', 'type', 'location', 'startDate', 'endDate', 'tribeId', 'coverImage']) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    await this.db.update(events).set(updateData).where(eq(events.id, id));
    return this.findOne(id);
  }

  async remove(id: number, userId: number, role: string) {
    const [existing] = await this.db.select().from(events).where(eq(events.id, id));
    if (!existing) throw new NotFoundException('找不到活動');
    if (existing.createdBy !== userId && role !== 'admin') throw new ForbiddenException('無權限');
    await this.db.delete(events).where(eq(events.id, id));
    return { message: '活動已刪除' };
  }
}

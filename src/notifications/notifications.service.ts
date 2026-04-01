import { Injectable, Inject } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { notifications } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}
  async findAll(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(notifications).where(eq(notifications.userId, userId));
    const [u] = await this.db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    const rows = await this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
    return { notifications: rows, unread: Number(u.count), pagination: { page, limit, total: Number(c.count), totalPages: Math.ceil(Number(c.count) / limit) } };
  }
  async getUnreadCount(userId: number) { const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.read, false))); return { count: Number(c.count) }; }
  async markRead(id: number, userId: number) { await this.db.update(notifications).set({ read: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))); return { success: true }; }
  async markAllRead(userId: number) { await this.db.update(notifications).set({ read: true }).where(and(eq(notifications.userId, userId), eq(notifications.read, false))); return { success: true }; }
  async remove(id: number, userId: number) { await this.db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId))); return { success: true }; }
}

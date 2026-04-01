import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { tribeFollows, tribes } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class FollowsService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}
  async findAll(userId: number) {
    const rows = await this.db.select({ id: tribeFollows.id, followedAt: tribeFollows.createdAt, tribeId: tribes.id, name: tribes.name, traditionalName: tribes.traditionalName, region: tribes.region, population: tribes.population, coverImage: tribes.coverImage })
      .from(tribeFollows).innerJoin(tribes, eq(tribeFollows.tribeId, tribes.id)).where(eq(tribeFollows.userId, userId)).orderBy(desc(tribeFollows.createdAt));
    return { follows: rows, total: rows.length };
  }
  async toggle(userId: number, tribeId: number) {
    const [tribe] = await this.db.select({ id: tribes.id, name: tribes.name }).from(tribes).where(eq(tribes.id, tribeId));
    if (!tribe) throw new NotFoundException('部落不存在');
    const [existing] = await this.db.select().from(tribeFollows).where(and(eq(tribeFollows.userId, userId), eq(tribeFollows.tribeId, tribeId)));
    if (existing) { await this.db.delete(tribeFollows).where(eq(tribeFollows.id, existing.id)); return { following: false, message: `已取消追蹤 ${tribe.name}` }; }
    else { await this.db.insert(tribeFollows).values({ userId, tribeId }); return { following: true, message: `已追蹤 ${tribe.name}` }; }
  }
  async check(userId: number, tribeId: number) { const [e] = await this.db.select().from(tribeFollows).where(and(eq(tribeFollows.userId, userId), eq(tribeFollows.tribeId, tribeId))); return { following: !!e }; }
  async getCount(tribeId: number) { const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(tribeFollows).where(eq(tribeFollows.tribeId, tribeId)); return { count: Number(c.count) }; }
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { media } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class MediaService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}
  async findAll(page = 1, limit = 20, type?: string) {
    const offset = (page - 1) * limit;
    const where = type ? eq(media.type, type as any) : undefined;
    const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(media).where(where);
    const rows = await this.db.select().from(media).where(where).orderBy(media.id).limit(limit).offset(offset);
    return { media: rows, pagination: { page, limit, total: Number(c.count), totalPages: Math.ceil(Number(c.count) / limit) } };
  }
  async findOne(id: number) {
    const [m] = await this.db.select().from(media).where(eq(media.id, id));
    if (!m) throw new NotFoundException('找不到媒體');
    return { media: m };
  }
  async create(data: any, userId: number) { const [m] = await this.db.insert(media).values({ ...data, uploadedBy: userId }).returning(); return { media: m }; }
  async update(id: number, data: any) { await this.db.update(media).set(data).where(eq(media.id, id)); return this.findOne(id); }
  async remove(id: number) { await this.db.delete(media).where(eq(media.id, id)); return { message: '媒體已刪除' }; }
}

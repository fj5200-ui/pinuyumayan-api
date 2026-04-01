import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { vocabulary } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class LanguageService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll(page = 1, limit = 20, category?: string) {
    const offset = (page - 1) * limit;
    const where = category ? eq(vocabulary.category, category as any) : undefined;
    const [countResult] = await this.db.select({ count: sql<number>`count(*)` }).from(vocabulary).where(where);
    const words = await this.db.select().from(vocabulary).where(where).orderBy(vocabulary.category, vocabulary.puyumaWord).limit(limit).offset(offset);
    return { words, pagination: { page, limit, total: Number(countResult.count), totalPages: Math.ceil(Number(countResult.count) / limit) } };
  }

  async findOne(id: number) {
    const [word] = await this.db.select().from(vocabulary).where(eq(vocabulary.id, id));
    if (!word) throw new NotFoundException('找不到詞彙');
    return { word };
  }

  async getDaily() {
    const words = await this.db.select().from(vocabulary);
    if (!words.length) return { word: null };
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return { word: words[dayOfYear % words.length] };
  }

  async create(data: any) {
    const [word] = await this.db.insert(vocabulary).values(data).returning();
    return { word };
  }

  async update(id: number, data: any) {
    const updateData: any = {};
    for (const key of ['puyumaWord', 'chineseMeaning', 'englishMeaning', 'pronunciation', 'exampleSentence', 'exampleChinese', 'category']) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }
    await this.db.update(vocabulary).set(updateData).where(eq(vocabulary.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.db.delete(vocabulary).where(eq(vocabulary.id, id));
    return { message: '詞彙已刪除' };
  }

  async getCategories() {
    const result = await this.db.select({ category: vocabulary.category, count: sql<number>`count(*)` })
      .from(vocabulary).groupBy(vocabulary.category);
    return { categories: result };
  }
}

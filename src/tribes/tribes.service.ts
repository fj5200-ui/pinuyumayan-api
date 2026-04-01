import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { tribes, articles } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class TribesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(tribes).orderBy(tribes.id);
  }

  async findOne(id: number) {
    const [tribe] = await this.db.select().from(tribes).where(eq(tribes.id, id)).limit(1);
    if (!tribe) throw new NotFoundException('找不到部落');

    const relatedArticles = await this.db.select({
      id: articles.id, title: articles.title, slug: articles.slug,
      excerpt: articles.excerpt, createdAt: articles.createdAt,
    }).from(articles).where(eq(articles.published, true)).limit(4);

    return { tribe, articles: relatedArticles };
  }
}

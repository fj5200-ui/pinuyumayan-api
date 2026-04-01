import { Injectable, Inject } from '@nestjs/common';
import { ilike, eq, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { articles, vocabulary, tribes, events } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class SearchService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}
  async search(q: string) {
    if (!q || q.length < 2) return { articles: [], vocabulary: [], tribes: [], events: [] };
    const pattern = `%${q}%`;
    const arts = await this.db.select({ id: articles.id, title: articles.title, slug: articles.slug, excerpt: articles.excerpt, category: articles.category }).from(articles).where(or(ilike(articles.title, pattern), ilike(articles.content, pattern))).limit(10);
    const vocabs = await this.db.select().from(vocabulary).where(or(ilike(vocabulary.puyumaWord, pattern), ilike(vocabulary.chineseMeaning, pattern), ilike(vocabulary.englishMeaning, pattern))).limit(10);
    const tribesResult = await this.db.select().from(tribes).where(or(ilike(tribes.name, pattern), ilike(tribes.description, pattern))).limit(10);
    const evts = await this.db.select({ id: events.id, title: events.title, type: events.type, startDate: events.startDate }).from(events).where(or(ilike(events.title, pattern), ilike(events.description, pattern))).limit(10);
    return { articles: arts, vocabulary: vocabs, tribes: tribesResult, events: evts };
  }
}

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { bookmarks, articles } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class BookmarksService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}
  async findAll(userId: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(bookmarks).where(eq(bookmarks.userId, userId));
    const rows = await this.db.select({ id: bookmarks.id, bookmarkedAt: bookmarks.createdAt, articleId: articles.id, title: articles.title, slug: articles.slug, excerpt: articles.excerpt, coverImage: articles.coverImage, category: articles.category, views: articles.views, articleDate: articles.createdAt })
      .from(bookmarks).innerJoin(articles, eq(bookmarks.articleId, articles.id)).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt)).limit(limit).offset(offset);
    return { bookmarks: rows, pagination: { page, limit, total: Number(c.count), totalPages: Math.ceil(Number(c.count) / limit) } };
  }
  async toggle(userId: number, articleId: number) {
    const [art] = await this.db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId));
    if (!art) throw new NotFoundException('文章不存在');
    const [existing] = await this.db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
    if (existing) { await this.db.delete(bookmarks).where(eq(bookmarks.id, existing.id)); return { bookmarked: false, message: '已取消收藏' }; }
    else { await this.db.insert(bookmarks).values({ userId, articleId }); return { bookmarked: true, message: '已收藏' }; }
  }
  async check(userId: number, articleId: number) {
    const [existing] = await this.db.select().from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)));
    return { bookmarked: !!existing };
  }
}

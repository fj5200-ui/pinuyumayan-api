import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, desc, sql, and, like, ne, ilike } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { articles, users } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class ArticlesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll(page = 1, limit = 12, category?: string, search?: string) {
    const offset = (page - 1) * limit;
    const conditions: any[] = [eq(articles.published, true)];

    if (category) conditions.push(eq(articles.category, category as any));
    if (search) conditions.push(ilike(articles.title, `%${search}%`));

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [countResult] = await this.db.select({ count: sql<number>`count(*)` }).from(articles).where(where);
    const total = Number(countResult.count);

    const rows = await this.db
      .select({
        id: articles.id, title: articles.title, slug: articles.slug,
        excerpt: articles.excerpt, coverImage: articles.coverImage,
        category: articles.category, tags: articles.tags, views: articles.views,
        createdAt: articles.createdAt, updatedAt: articles.updatedAt,
        authorName: users.name, authorAvatar: users.avatarUrl,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(where)
      .orderBy(desc(articles.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      articles: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string) {
    const [article] = await this.db
      .select({
        id: articles.id, title: articles.title, slug: articles.slug,
        content: articles.content, excerpt: articles.excerpt,
        coverImage: articles.coverImage, category: articles.category,
        tags: articles.tags, published: articles.published, views: articles.views,
        authorId: articles.authorId, createdAt: articles.createdAt, updatedAt: articles.updatedAt,
        authorName: users.name, authorAvatar: users.avatarUrl,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(and(eq(articles.slug, slug), eq(articles.published, true)))
      .limit(1);

    if (!article) throw new NotFoundException('找不到文章');

    // Increment views
    await this.db.update(articles).set({ views: sql`${articles.views} + 1` }).where(eq(articles.id, article.id));

    return { article };
  }

  async create(data: any, authorId: number) {
    const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/(^-|-$)/g, '');
    const [article] = await this.db.insert(articles).values({
      title: data.title, slug, content: data.content,
      excerpt: data.excerpt || '', coverImage: data.coverImage || '',
      category: data.category || '文化', tags: data.tags || '',
      published: data.published ?? false, authorId,
    }).returning();
    return { article };
  }

  async update(id: number, data: any, userId: number, role: string) {
    const [existing] = await this.db.select().from(articles).where(eq(articles.id, id));
    if (!existing) throw new NotFoundException('找不到文章');
    if (existing.authorId !== userId && role !== 'admin') throw new ForbiddenException('無權限');

    const updateData: any = { updatedAt: new Date() };
    for (const key of ['title', 'content', 'excerpt', 'coverImage', 'category', 'tags', 'published']) {
      if (data[key] !== undefined) updateData[key] = data[key];
    }

    await this.db.update(articles).set(updateData).where(eq(articles.id, id));
    const [updated] = await this.db.select().from(articles).where(eq(articles.id, id));
    return { article: updated };
  }

  async remove(id: number, userId: number, role: string) {
    const [existing] = await this.db.select().from(articles).where(eq(articles.id, id));
    if (!existing) throw new NotFoundException('找不到文章');
    if (existing.authorId !== userId && role !== 'admin') throw new ForbiddenException('無權限');

    await this.db.delete(articles).where(eq(articles.id, id));
    return { message: '文章已刪除' };
  }

  async getCategories() {
    const result = await this.db
      .select({ category: articles.category, count: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.published, true))
      .groupBy(articles.category)
      .orderBy(desc(sql`count(*)`));
    return { categories: result };
  }

  async getRelated(id: number, limit = 3) {
    const [article] = await this.db.select({ category: articles.category }).from(articles).where(eq(articles.id, id));
    if (!article) return { related: [] };

    const related = await this.db
      .select({
        id: articles.id, title: articles.title, slug: articles.slug,
        excerpt: articles.excerpt, coverImage: articles.coverImage,
        category: articles.category, views: articles.views, createdAt: articles.createdAt,
      })
      .from(articles)
      .where(and(eq(articles.published, true), ne(articles.id, id), eq(articles.category, article.category)))
      .orderBy(desc(articles.views))
      .limit(limit);

    return { related };
  }

  async getSitemapData() {
    const articlesList = await this.db.select({ slug: articles.slug, updatedAt: articles.updatedAt }).from(articles).where(eq(articles.published, true));
    return { articles: articlesList };
  }
}

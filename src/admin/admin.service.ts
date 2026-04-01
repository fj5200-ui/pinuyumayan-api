import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { users, comments, articles } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}
  async getUsers(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(users);
    const rows = await this.db.select({ id: users.id, email: users.email, name: users.name, role: users.role, tribeId: users.tribeId, avatarUrl: users.avatarUrl, bio: users.bio, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
    return { users: rows, pagination: { page, limit, total: Number(c.count), totalPages: Math.ceil(Number(c.count) / limit) } };
  }
  async updateRole(id: number, role: string) {
    await this.db.update(users).set({ role: role as any, updatedAt: new Date() }).where(eq(users.id, id));
    const [user] = await this.db.select({ id: users.id, email: users.email, name: users.name, role: users.role }).from(users).where(eq(users.id, id));
    return { user };
  }
  async getComments(page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [c] = await this.db.select({ count: sql<number>`count(*)` }).from(comments);
    const rows = await this.db.select({ id: comments.id, content: comments.content, createdAt: comments.createdAt, authorName: users.name, authorRole: users.role, articleTitle: articles.title, articleSlug: articles.slug })
      .from(comments).leftJoin(users, eq(comments.userId, users.id)).leftJoin(articles, eq(comments.articleId, articles.id)).orderBy(desc(comments.createdAt)).limit(limit).offset(offset);
    return { comments: rows, pagination: { page, limit, total: Number(c.count), totalPages: Math.ceil(Number(c.count) / limit) } };
  }
  async deleteComment(id: number) { await this.db.delete(comments).where(eq(comments.id, id)); return { success: true }; }
}

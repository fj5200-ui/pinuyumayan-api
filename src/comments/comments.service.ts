import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, sql, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { comments, likes, users, articles, notifications } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';
@Injectable()
export class CommentsService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async getForArticle(articleId: number, userId?: number) {
    const rows = await this.db.select({ id: comments.id, content: comments.content, createdAt: comments.createdAt, userId: comments.userId, authorName: users.name, authorAvatar: users.avatarUrl, authorRole: users.role })
      .from(comments).leftJoin(users, eq(comments.userId, users.id)).where(eq(comments.articleId, articleId)).orderBy(desc(comments.createdAt));
    const [likeCount] = await this.db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.articleId, articleId));
    let userLiked = false;
    if (userId) { const [like] = await this.db.select().from(likes).where(and(eq(likes.articleId, articleId), eq(likes.userId, userId))); userLiked = !!like; }
    return { comments: rows, likeCount: Number(likeCount.count), userLiked };
  }

  async addComment(articleId: number, userId: number, content: string) {
    const [art] = await this.db.select({ id: articles.id, authorId: articles.authorId, title: articles.title, slug: articles.slug }).from(articles).where(eq(articles.id, articleId));
    if (!art) throw new NotFoundException('找不到文章');
    const [comment] = await this.db.insert(comments).values({ articleId, userId, content }).returning();
    // Notify article author
    if (art.authorId && art.authorId !== userId) {
      const [commenter] = await this.db.select({ name: users.name }).from(users).where(eq(users.id, userId));
      await this.db.insert(notifications).values({ userId: art.authorId, type: 'comment', title: '新留言通知', message: `${commenter?.name || '某人'} 在你的文章「${art.title}」留言了`, link: `/articles/${art.slug}` });
    }
    return { comment };
  }

  async deleteComment(id: number, userId: number, role: string) {
    const [c] = await this.db.select().from(comments).where(eq(comments.id, id));
    if (!c) throw new NotFoundException('找不到留言');
    if (c.userId !== userId && role !== 'admin') throw new ForbiddenException('無權限');
    await this.db.delete(comments).where(eq(comments.id, id));
    return { message: '留言已刪除' };
  }

  async toggleLike(articleId: number, userId: number) {
    const [existing] = await this.db.select().from(likes).where(and(eq(likes.articleId, articleId), eq(likes.userId, userId)));
    if (existing) {
      await this.db.delete(likes).where(eq(likes.id, existing.id));
    } else {
      await this.db.insert(likes).values({ articleId, userId });
    }
    const [count] = await this.db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.articleId, articleId));
    return { liked: !existing, likeCount: Number(count.count) };
  }
}

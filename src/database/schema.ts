import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ═══════════════════════════════════════════
//  Enums
// ═══════════════════════════════════════════
export const userRoleEnum = pgEnum('user_role', ['admin', 'editor', 'user']);
export const eventTypeEnum = pgEnum('event_type', ['祭典', '活動', '工作坊', '展覽', '其他']);
export const mediaTypeEnum = pgEnum('media_type', ['photo', 'video', 'audio']);
export const articleCategoryEnum = pgEnum('article_category', [
  '文化', '部落', '歷史', '音樂', '工藝', '信仰', '語言', '教育',
]);
export const vocabCategoryEnum = pgEnum('vocab_category', [
  '問候', '親屬', '自然', '數字', '食物', '動物', '文化', '日常', '身體',
]);
export const notifTypeEnum = pgEnum('notif_type', ['comment', 'like', 'follow', 'article', 'system']);

// ═══════════════════════════════════════════
//  Users
// ═══════════════════════════════════════════
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  tribeId: integer('tribe_id').references(() => tribes.id, { onDelete: 'set null' }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_users_email').on(table.email),
]);

// ═══════════════════════════════════════════
//  Tribes (卑南八社)
// ═══════════════════════════════════════════
export const tribes = pgTable('tribes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  traditionalName: varchar('traditional_name', { length: 100 }),
  region: varchar('region', { length: 200 }),
  description: text('description'),
  history: text('history'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  coverImage: text('cover_image'),
  population: integer('population'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════
//  Articles (文化誌)
// ═══════════════════════════════════════════
export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  coverImage: text('cover_image'),
  category: articleCategoryEnum('category').default('文化').notNull(),
  tags: text('tags'), // JSON string array
  published: boolean('published').default(false).notNull(),
  views: integer('views').default(0).notNull(),
  authorId: integer('author_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_articles_slug').on(table.slug),
  index('idx_articles_category').on(table.category),
  index('idx_articles_author').on(table.authorId),
]);

// ═══════════════════════════════════════════
//  Vocabulary (族語詞彙)
// ═══════════════════════════════════════════
export const vocabulary = pgTable('vocabulary', {
  id: serial('id').primaryKey(),
  puyumaWord: varchar('puyuma_word', { length: 200 }).notNull(),
  chineseMeaning: varchar('chinese_meaning', { length: 200 }).notNull(),
  englishMeaning: varchar('english_meaning', { length: 200 }),
  pronunciation: varchar('pronunciation', { length: 200 }),
  exampleSentence: text('example_sentence'),
  exampleChinese: text('example_chinese'),
  category: vocabCategoryEnum('category').default('日常').notNull(),
  audioUrl: text('audio_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_vocab_category').on(table.category),
]);

// ═══════════════════════════════════════════
//  Events (活動祭典)
// ═══════════════════════════════════════════
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: eventTypeEnum('type').default('活動').notNull(),
  location: varchar('location', { length: 255 }),
  startDate: varchar('start_date', { length: 20 }).notNull(),
  endDate: varchar('end_date', { length: 20 }),
  tribeId: integer('tribe_id').references(() => tribes.id, { onDelete: 'set null' }),
  coverImage: text('cover_image'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════
//  Media (媒體庫)
// ═══════════════════════════════════════════
export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: mediaTypeEnum('type').default('photo').notNull(),
  url: text('url'),
  thumbnailUrl: text('thumbnail_url'),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ═══════════════════════════════════════════
//  Comments
// ═══════════════════════════════════════════
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_comments_article').on(table.articleId),
]);

// ═══════════════════════════════════════════
//  Likes
// ═══════════════════════════════════════════
export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_likes_unique').on(table.articleId, table.userId),
]);

// ═══════════════════════════════════════════
//  Bookmarks
// ═══════════════════════════════════════════
export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_bookmarks_unique').on(table.userId, table.articleId),
]);

// ═══════════════════════════════════════════
//  Tribe Follows
// ═══════════════════════════════════════════
export const tribeFollows = pgTable('tribe_follows', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tribeId: integer('tribe_id').references(() => tribes.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_follows_unique').on(table.userId, table.tribeId),
]);

// ═══════════════════════════════════════════
//  Notifications
// ═══════════════════════════════════════════
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notifTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_notif_user').on(table.userId),
  index('idx_notif_unread').on(table.userId, table.read),
]);

// ═══════════════════════════════════════════
//  Relations
// ═══════════════════════════════════════════
export const usersRelations = relations(users, ({ one, many }) => ({
  tribe: one(tribes, { fields: [users.tribeId], references: [tribes.id] }),
  articles: many(articles),
  comments: many(comments),
  bookmarks: many(bookmarks),
  tribeFollows: many(tribeFollows),
  notifications: many(notifications),
}));

export const tribesRelations = relations(tribes, ({ many }) => ({
  users: many(users),
  events: many(events),
  followers: many(tribeFollows),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(users, { fields: [articles.authorId], references: [users.id] }),
  comments: many(comments),
  likes: many(likes),
  bookmarks: many(bookmarks),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  article: one(articles, { fields: [comments.articleId], references: [articles.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  article: one(articles, { fields: [likes.articleId], references: [articles.id] }),
  user: one(users, { fields: [likes.userId], references: [users.id] }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  article: one(articles, { fields: [bookmarks.articleId], references: [articles.id] }),
}));

export const tribeFollowsRelations = relations(tribeFollows, ({ one }) => ({
  user: one(users, { fields: [tribeFollows.userId], references: [users.id] }),
  tribe: one(tribes, { fields: [tribeFollows.tribeId], references: [tribes.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  tribe: one(tribes, { fields: [events.tribeId], references: [tribes.id] }),
  creator: one(users, { fields: [events.createdBy], references: [users.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(users, { fields: [media.uploadedBy], references: [users.id] }),
}));

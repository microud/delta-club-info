import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Platform enum with 5 values
export const contentPlatformEnum = pgEnum('content_platform', [
  'BILIBILI',
  'DOUYIN',
  'XIAOHONGSHU',
  'WECHAT_CHANNELS',
  'WECHAT_MP',
]);

export const crawlCategoryEnum = pgEnum('crawl_category', [
  'REVIEW',
  'SENTIMENT',
]);

// NEW bloggers table (migration will alter existing table)
export const bloggers = pgTable('bloggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  avatar: varchar('avatar', { length: 1000 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bloggerAccounts = pgTable(
  'blogger_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bloggerId: uuid('blogger_id')
      .notNull()
      .references(() => bloggers.id, { onDelete: 'cascade' }),
    platform: contentPlatformEnum('platform').notNull(),
    platformUserId: varchar('platform_user_id', { length: 200 }).notNull(),
    platformUsername: varchar('platform_username', { length: 200 }),
    crawlCategories: crawlCategoryEnum('crawl_categories')
      .array()
      .notNull()
      .default([]),
    lastCrawledAt: timestamp('last_crawled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('blogger_accounts_platform_user_id_idx').on(
      table.platform,
      table.platformUserId,
    ),
  ],
);

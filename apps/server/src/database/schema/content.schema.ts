import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';
import { bloggers, contentPlatformEnum } from './blogger.schema';

export const aiSentimentEnum = pgEnum('ai_sentiment', [
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'VIDEO',
  'NOTE',
  'ARTICLE',
]);

export const contentCategoryEnum = pgEnum('content_category', [
  'REVIEW',
  'SENTIMENT',
  'ANNOUNCEMENT',
]);

export const contents = pgTable(
  'contents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: contentPlatformEnum('platform').notNull(),
    contentType: contentTypeEnum('content_type').notNull(),
    category: contentCategoryEnum('category').notNull(),
    externalId: varchar('external_id', { length: 500 }).notNull(),
    externalUrl: varchar('external_url', { length: 1000 }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    coverUrl: varchar('cover_url', { length: 1000 }),
    authorName: varchar('author_name', { length: 200 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    bloggerId: uuid('blogger_id').references(() => bloggers.id, {
      onDelete: 'set null',
    }),
    clubId: uuid('club_id').references(() => clubs.id, {
      onDelete: 'set null',
    }),
    groupId: uuid('group_id'),
    isPrimary: boolean('is_primary').notNull().default(true),
    groupPlatforms: contentPlatformEnum('group_platforms').array(),
    aiParsed: boolean('ai_parsed').notNull().default(false),
    aiClubMatch: varchar('ai_club_match', { length: 200 }),
    aiSummary: text('ai_summary'),
    aiSentiment: aiSentimentEnum('ai_sentiment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('contents_platform_external_id_idx').on(
      table.platform,
      table.externalId,
    ),
    index('contents_is_primary_idx').on(table.isPrimary),
    index('contents_group_id_idx').on(table.groupId),
    index('contents_category_idx').on(table.category),
    index('contents_published_at_idx').on(table.publishedAt),
  ],
);

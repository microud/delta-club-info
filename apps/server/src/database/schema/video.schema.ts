import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';
import { videoPlatformEnum } from './blogger.schema';

export const videoCategoryEnum = pgEnum('video_category', [
  'REVIEW',
  'SENTIMENT',
]);

export const aiSentimentEnum = pgEnum('ai_sentiment', [
  'POSITIVE',
  'NEGATIVE',
  'NEUTRAL',
]);

export const videos = pgTable(
  'videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id').references(() => clubs.id, {
      onDelete: 'set null',
    }),
    platform: videoPlatformEnum('platform').notNull(),
    externalId: varchar('external_id', { length: 200 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    coverUrl: varchar('cover_url', { length: 1000 }).notNull(),
    videoUrl: varchar('video_url', { length: 1000 }).notNull(),
    description: text('description'),
    authorName: varchar('author_name', { length: 200 }).notNull(),
    authorId: varchar('author_id', { length: 200 }).notNull(),
    category: videoCategoryEnum('category').notNull(),
    subtitleText: text('subtitle_text'),
    aiParsed: boolean('ai_parsed').notNull().default(false),
    aiClubMatch: varchar('ai_club_match', { length: 200 }),
    aiSummary: text('ai_summary'),
    aiSentiment: aiSentimentEnum('ai_sentiment'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('videos_platform_external_id_idx').on(
      table.platform,
      table.externalId,
    ),
  ],
);

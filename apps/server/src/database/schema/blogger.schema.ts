import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const videoPlatformEnum = pgEnum('video_platform', [
  'BILIBILI',
  'DOUYIN',
]);

export const bloggers = pgTable('bloggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  platform: videoPlatformEnum('platform').notNull(),
  externalId: varchar('external_id', { length: 200 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

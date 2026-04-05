import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const crawlTaskTypeEnum = pgEnum('crawl_task_type', [
  'BLOGGER',
  'KEYWORD',
]);

export const crawlTaskStatusEnum = pgEnum('crawl_task_status', [
  'RUNNING',
  'SUCCESS',
  'FAILED',
]);

export const crawlTasks = pgTable('crawl_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: crawlTaskTypeEnum('type').notNull(),
  targetId: varchar('target_id', { length: 500 }).notNull(),
  status: crawlTaskStatusEnum('status').notNull().default('RUNNING'),
  startedAt: timestamp('started_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  videoCount: integer('video_count').notNull().default(0),
  errorMessage: text('error_message'),
});

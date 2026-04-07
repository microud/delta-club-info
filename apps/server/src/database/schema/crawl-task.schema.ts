import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { contentPlatformEnum } from './blogger.schema';

export const crawlTaskTypeEnum = pgEnum('crawl_task_type', [
  'BLOGGER_POSTS',
  'KEYWORD_SEARCH',
  'MP_ARTICLES',
]);

export const crawlTaskRunStatusEnum = pgEnum('crawl_task_run_status', [
  'RUNNING',
  'SUCCESS',
  'FAILED',
]);

export const crawlTasks = pgTable('crawl_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskType: crawlTaskTypeEnum('task_type').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  platform: contentPlatformEnum('platform').notNull(),
  targetId: varchar('target_id', { length: 500 }).notNull(),
  cronExpression: varchar('cron_expression', { length: 100 })
    .notNull()
    .default('0 */1 * * *'),
  isActive: boolean('is_active').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const crawlTaskRuns = pgTable('crawl_task_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  crawlTaskId: uuid('crawl_task_id')
    .notNull()
    .references(() => crawlTasks.id, { onDelete: 'cascade' }),
  status: crawlTaskRunStatusEnum('status').notNull().default('RUNNING'),
  startedAt: timestamp('started_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  itemsFetched: integer('items_fetched').notNull().default(0),
  itemsCreated: integer('items_created').notNull().default(0),
  errorMessage: text('error_message'),
});

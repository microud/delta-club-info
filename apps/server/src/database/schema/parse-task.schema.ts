import {
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';
import { wechatMessages } from './wechat-message.schema';

export const parseTaskStatusEnum = pgEnum('parse_task_status', [
  'pending',
  'parsing',
  'completed',
  'failed',
]);

export const parseTasks = pgTable('parse_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: parseTaskStatusEnum('status').notNull().default('pending'),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'set null' }),
  parsedResult: jsonb('parsed_result'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const parseTaskMessages = pgTable(
  'parse_task_messages',
  {
    parseTaskId: uuid('parse_task_id')
      .notNull()
      .references(() => parseTasks.id, { onDelete: 'cascade' }),
    wechatMessageId: uuid('wechat_message_id')
      .notNull()
      .references(() => wechatMessages.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.parseTaskId, table.wechatMessageId] })],
);

import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const wechatMessages = pgTable('wechat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  msgId: varchar('msg_id', { length: 64 }).notNull(),
  msgType: varchar('msg_type', { length: 20 }).notNull(),
  content: text('content'),
  mediaUrl: varchar('media_url', { length: 500 }),
  fromUser: varchar('from_user', { length: 100 }).notNull(),
  rawPayload: jsonb('raw_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

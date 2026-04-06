import {
  pgTable,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  openId: varchar('open_id', { length: 200 }).notNull().unique(),
  unionId: varchar('union_id', { length: 200 }),
  nickname: varchar('nickname', { length: 200 }),
  avatar: varchar('avatar', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

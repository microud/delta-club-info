import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const clubStatusEnum = pgEnum('club_status', [
  'draft',
  'published',
  'closed',
  'archived',
]);

export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  logo: varchar('logo', { length: 500 }),
  description: text('description'),
  wechatOfficialAccount: varchar('wechat_official_account', { length: 200 }),
  wechatMiniProgram: varchar('wechat_mini_program', { length: 200 }),
  contactInfo: varchar('contact_info', { length: 500 }),
  status: clubStatusEnum('status').notNull().default('draft'),
  establishedAt: date('established_at'),
  closedAt: date('closed_at'),
  predecessorId: uuid('predecessor_id'),
  closureNote: text('closure_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

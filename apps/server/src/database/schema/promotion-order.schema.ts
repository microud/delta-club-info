import {
  pgTable,
  uuid,
  decimal,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';

export const promotionOrders = pgTable('promotion_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  startAt: date('start_at').notNull(),
  endAt: date('end_at').notNull(),
  dailyRate: decimal('daily_rate', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

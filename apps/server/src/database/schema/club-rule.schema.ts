import {
  pgTable,
  uuid,
  text,
  json,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';

export const ruleSentimentEnum = pgEnum('rule_sentiment', [
  'FAVORABLE',
  'UNFAVORABLE',
  'NEUTRAL',
]);

export const clubRules = pgTable('club_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  aiAnalysis: json('ai_analysis'),
  sentiment: ruleSentimentEnum('sentiment').notNull().default('NEUTRAL'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

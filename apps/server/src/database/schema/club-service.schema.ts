import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { clubs } from './club.schema';

export const clubServiceTypeEnum = pgEnum('club_service_type', [
  'KNIFE_RUN',
  'ACCOMPANY',
  'ESCORT_TRIAL',
  'ESCORT_STANDARD',
  'ESCORT_FUN',
]);

export const clubServices = pgTable('club_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').notNull().references(() => clubs.id, { onDelete: 'cascade' }),
  type: clubServiceTypeEnum('type').notNull(),
  priceYuan: decimal('price_yuan', { precision: 10, scale: 2 }),
  priceHafuCoin: decimal('price_hafu_coin', { precision: 10, scale: 2 }),
  tier: varchar('tier', { length: 100 }),
  pricePerHour: decimal('price_per_hour', { precision: 10, scale: 2 }),
  gameName: varchar('game_name', { length: 200 }),
  hasGuarantee: boolean('has_guarantee'),
  guaranteeHafuCoin: decimal('guarantee_hafu_coin', { precision: 10, scale: 2 }),
  rules: text('rules'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, eq, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class OverviewService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getSummary() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const [
      [{ value: clubTotal }],
      [{ value: clubPublished }],
      [{ value: clubClosed }],
      [{ value: contentTotal }],
      [{ value: contentLast7d }],
      [{ value: bloggerTotal }],
      [{ value: bloggerAccountTotal }],
      [{ value: activePromotionCount }],
      [{ value: activePromotionDailyRateSum }],
    ] = await Promise.all([
      this.db.select({ value: count() }).from(schema.clubs),
      this.db
        .select({ value: count() })
        .from(schema.clubs)
        .where(eq(schema.clubs.status, 'published')),
      this.db
        .select({ value: count() })
        .from(schema.clubs)
        .where(eq(schema.clubs.status, 'closed')),
      this.db.select({ value: count() }).from(schema.contents),
      this.db
        .select({ value: count() })
        .from(schema.contents)
        .where(gte(schema.contents.createdAt, sevenDaysAgo)),
      this.db.select({ value: count() }).from(schema.bloggers),
      this.db.select({ value: count() }).from(schema.bloggerAccounts),
      this.db
        .select({ value: count() })
        .from(schema.promotionOrders)
        .where(
          and(
            lte(schema.promotionOrders.startAt, today),
            gte(schema.promotionOrders.endAt, today),
          ),
        ),
      this.db
        .select({
          value: sql<string>`COALESCE(SUM(${schema.promotionOrders.dailyRate}), 0)`,
        })
        .from(schema.promotionOrders)
        .where(
          and(
            lte(schema.promotionOrders.startAt, today),
            gte(schema.promotionOrders.endAt, today),
          ),
        ),
    ]);

    return {
      clubs: {
        total: Number(clubTotal),
        published: Number(clubPublished),
        closed: Number(clubClosed),
      },
      contents: {
        total: Number(contentTotal),
        last7dNew: Number(contentLast7d),
      },
      bloggers: {
        total: Number(bloggerTotal),
        accountTotal: Number(bloggerAccountTotal),
      },
      promotions: {
        activeCount: Number(activePromotionCount),
        activeDailyRateSum: Number(activePromotionDailyRateSum),
      },
    };
  }

  async ping() {
    return { ok: true };
  }
}

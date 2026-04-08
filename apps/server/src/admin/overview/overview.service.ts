import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
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

  async getTodos() {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      [{ value: failedCrawlLast24h }],
      [{ value: aiParseFailedContents }],
    ] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(schema.crawlTaskRuns)
        .where(
          and(
            eq(schema.crawlTaskRuns.status, 'FAILED'),
            gte(schema.crawlTaskRuns.startedAt, dayAgo),
          ),
        ),
      // Note: content schema currently has no dedicated AI parse failure status,
      // so this returns the count of unparsed contents (`aiParsed = false`).
      // Frontend labels this as "待/失败 AI 解析内容".
      this.db
        .select({ value: count() })
        .from(schema.contents)
        .where(eq(schema.contents.aiParsed, false)),
    ]);

    return {
      pendingReviewComments: 0, // Stage 6 placeholder
      failedCrawlLast24h: Number(failedCrawlLast24h),
      aiParseFailedContents: Number(aiParseFailedContents),
    };
  }

  async getRecentContents(limit = 10) {
    return this.db
      .select({
        id: schema.contents.id,
        title: schema.contents.title,
        platform: schema.contents.platform,
        category: schema.contents.category,
        authorName: schema.contents.authorName,
        coverUrl: schema.contents.coverUrl,
        createdAt: schema.contents.createdAt,
        clubId: schema.contents.clubId,
        clubName: schema.clubs.name,
      })
      .from(schema.contents)
      .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
      .orderBy(desc(schema.contents.createdAt))
      .limit(limit);
  }

  async getBusiness() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // 本月推广收入：对每个与本月有交集的订单，覆盖天数 * dailyRate
    const monthRevenueRow = await this.db.execute<{ revenue: string }>(sql`
      SELECT COALESCE(SUM(
        (LEAST(end_at, ${monthEnd}::date) - GREATEST(start_at, ${monthStart}::date) + 1)
        * daily_rate
      ), 0)::text AS revenue
      FROM promotion_orders
      WHERE start_at <= ${monthEnd}::date
        AND end_at >= ${monthStart}::date
    `);
    const monthRevenue = Number(monthRevenueRow.rows[0]?.revenue ?? 0);

    // 累计推广收入 = SUM(fee)
    const [{ value: totalRevenue }] = await this.db
      .select({
        value: sql<string>`COALESCE(SUM(${schema.promotionOrders.fee}), 0)`,
      })
      .from(schema.promotionOrders);

    // 当前生效订单列表
    const activeOrders = await this.db
      .select({
        id: schema.promotionOrders.id,
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        fee: schema.promotionOrders.fee,
        dailyRate: schema.promotionOrders.dailyRate,
        startAt: schema.promotionOrders.startAt,
        endAt: schema.promotionOrders.endAt,
      })
      .from(schema.promotionOrders)
      .leftJoin(
        schema.clubs,
        eq(schema.promotionOrders.clubId, schema.clubs.id),
      )
      .where(
        and(
          lte(schema.promotionOrders.startAt, today),
          gte(schema.promotionOrders.endAt, today),
        ),
      )
      .orderBy(schema.promotionOrders.endAt);

    // 即将到期订单（未来 7 天内到期）
    const expiringSoon = await this.db
      .select({
        id: schema.promotionOrders.id,
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        endAt: schema.promotionOrders.endAt,
        dailyRate: schema.promotionOrders.dailyRate,
      })
      .from(schema.promotionOrders)
      .leftJoin(
        schema.clubs,
        eq(schema.promotionOrders.clubId, schema.clubs.id),
      )
      .where(
        and(
          gte(schema.promotionOrders.endAt, today),
          lte(schema.promotionOrders.endAt, sevenDaysLater),
        ),
      )
      .orderBy(schema.promotionOrders.endAt);

    return {
      monthRevenue,
      totalRevenue: Number(totalRevenue),
      activeOrders: activeOrders.map((o) => ({
        ...o,
        fee: Number(o.fee),
        dailyRate: Number(o.dailyRate),
      })),
      expiringSoon: expiringSoon.map((o) => ({
        ...o,
        dailyRate: Number(o.dailyRate),
      })),
    };
  }

  async ping() {
    return { ok: true };
  }
}

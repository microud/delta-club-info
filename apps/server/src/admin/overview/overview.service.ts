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

  async ping() {
    return { ok: true };
  }
}

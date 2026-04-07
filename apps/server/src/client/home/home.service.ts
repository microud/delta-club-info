import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, lte, gte, desc, count, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class HomeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getBanners() {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const rows = await this.db
      .select({
        clubId: schema.clubs.id,
        clubName: schema.clubs.name,
        orderPosters: schema.clubs.orderPosters,
      })
      .from(schema.promotionOrders)
      .innerJoin(
        schema.clubs,
        and(
          eq(schema.promotionOrders.clubId, schema.clubs.id),
          eq(schema.clubs.status, 'published'),
        ),
      )
      .where(
        and(
          lte(schema.promotionOrders.startAt, today),
          gte(schema.promotionOrders.endAt, today),
        ),
      );

    // Flatten each poster image into a banner item
    const banners: { clubId: string; clubName: string; imageUrl: string }[] = [];
    for (const row of rows) {
      const posters = row.orderPosters ?? [];
      for (const imageUrl of posters) {
        if (imageUrl) {
          banners.push({ clubId: row.clubId, clubName: row.clubName, imageUrl });
        }
      }
    }

    // Shuffle randomly
    for (let i = banners.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [banners[i], banners[j]] = [banners[j], banners[i]];
    }

    return banners;
  }

  async getFeed(page = 1, pageSize = 20, category?: string) {
    const offset = (page - 1) * pageSize;

    type FeedItem = {
      id: string;
      type: 'content' | 'announcement';
      title: string;
      coverUrl?: string | null;
      authorName?: string | null;
      platform?: string | null;
      contentType?: string | null;
      category?: string | null;
      clubId?: string | null;
      clubName?: string | null;
      groupPlatforms?: string[] | null;
      content?: string;
      publishedAt: Date | null;
    };

    // Build content query conditions
    const contentConditions: SQL[] = [eq(schema.contents.isPrimary, true)];
    if (category) {
      contentConditions.push(
        eq(schema.contents.category, category as 'REVIEW' | 'SENTIMENT' | 'ANNOUNCEMENT'),
      );
    }

    // Fetch contents
    const contentRows = await this.db
      .select({
        id: schema.contents.id,
        title: schema.contents.title,
        coverUrl: schema.contents.coverUrl,
        authorName: schema.contents.authorName,
        platform: schema.contents.platform,
        contentType: schema.contents.contentType,
        category: schema.contents.category,
        clubId: schema.contents.clubId,
        clubName: schema.clubs.name,
        groupPlatforms: schema.contents.groupPlatforms,
        publishedAt: schema.contents.publishedAt,
      })
      .from(schema.contents)
      .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
      .where(and(...contentConditions));

    const contentItems: FeedItem[] = contentRows.map((c) => ({
      id: c.id,
      type: 'content' as const,
      title: c.title,
      coverUrl: c.coverUrl,
      authorName: c.authorName,
      platform: c.platform,
      contentType: c.contentType,
      category: c.category,
      clubId: c.clubId,
      clubName: c.clubName,
      groupPlatforms: c.groupPlatforms,
      publishedAt: c.publishedAt,
    }));

    // Include system announcements for 'all' (no category) and 'ANNOUNCEMENT' tab
    let announcementItems: FeedItem[] = [];
    if (!category || category === 'ANNOUNCEMENT') {
      const announcementRows = await this.db
        .select({
          id: schema.announcements.id,
          title: schema.announcements.title,
          content: schema.announcements.content,
          publishedAt: schema.announcements.publishedAt,
        })
        .from(schema.announcements)
        .where(eq(schema.announcements.status, 'published'));

      announcementItems = announcementRows.map((a) => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        content: a.content ? a.content.slice(0, 100) : '',
        publishedAt: a.publishedAt,
      }));
    }

    const merged = [...contentItems, ...announcementItems];

    // Sort by publishedAt desc (nulls last)
    merged.sort((a, b) => {
      const aTime = a.publishedAt ? a.publishedAt.getTime() : 0;
      const bTime = b.publishedAt ? b.publishedAt.getTime() : 0;
      return bTime - aTime;
    });

    const total = merged.length;
    const data = merged.slice(offset, offset + pageSize);

    return { data, total, page, pageSize };
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, lte, gte, desc, count, sql } from 'drizzle-orm';
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

  async getFeed(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    // Fetch videos with club name
    const videoRows = await this.db
      .select({
        id: schema.videos.id,
        title: schema.videos.title,
        coverUrl: schema.videos.coverUrl,
        authorName: schema.videos.authorName,
        platform: schema.videos.platform,
        category: schema.videos.category,
        clubId: schema.videos.clubId,
        clubName: schema.clubs.name,
        publishedAt: schema.videos.publishedAt,
      })
      .from(schema.videos)
      .leftJoin(schema.clubs, eq(schema.videos.clubId, schema.clubs.id));

    // Fetch published announcements
    const announcementRows = await this.db
      .select({
        id: schema.announcements.id,
        title: schema.announcements.title,
        content: schema.announcements.content,
        publishedAt: schema.announcements.publishedAt,
      })
      .from(schema.announcements)
      .where(eq(schema.announcements.status, 'published'));

    // Build unified feed items
    type FeedItem = {
      id: string;
      type: 'video' | 'announcement';
      title: string;
      coverUrl?: string;
      authorName?: string;
      platform?: string;
      category?: string;
      clubId?: string | null;
      clubName?: string | null;
      content?: string;
      publishedAt: Date | null;
    };

    const videoItems: FeedItem[] = videoRows.map((v) => ({
      id: v.id,
      type: 'video' as const,
      title: v.title,
      coverUrl: v.coverUrl,
      authorName: v.authorName,
      platform: v.platform,
      category: v.category,
      clubId: v.clubId,
      clubName: v.clubName,
      publishedAt: v.publishedAt,
    }));

    const announcementItems: FeedItem[] = announcementRows.map((a) => ({
      id: a.id,
      type: 'announcement' as const,
      title: a.title,
      content: a.content ? a.content.slice(0, 100) : '',
      publishedAt: a.publishedAt,
    }));

    const merged = [...videoItems, ...announcementItems];

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

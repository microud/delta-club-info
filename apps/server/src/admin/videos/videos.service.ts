import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminVideosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(filters?: { platform?: string; category?: string }) {
    let query = this.db
      .select({
        id: schema.videos.id,
        clubId: schema.videos.clubId,
        clubName: schema.clubs.name,
        platform: schema.videos.platform,
        externalId: schema.videos.externalId,
        title: schema.videos.title,
        coverUrl: schema.videos.coverUrl,
        videoUrl: schema.videos.videoUrl,
        authorName: schema.videos.authorName,
        category: schema.videos.category,
        aiParsed: schema.videos.aiParsed,
        aiSentiment: schema.videos.aiSentiment,
        publishedAt: schema.videos.publishedAt,
        createdAt: schema.videos.createdAt,
      })
      .from(schema.videos)
      .leftJoin(schema.clubs, eq(schema.videos.clubId, schema.clubs.id))
      .orderBy(desc(schema.videos.createdAt))
      .limit(200)
      .$dynamic();

    if (filters?.platform) {
      query = query.where(eq(schema.videos.platform, filters.platform as 'BILIBILI' | 'DOUYIN'));
    }

    return query;
  }
}

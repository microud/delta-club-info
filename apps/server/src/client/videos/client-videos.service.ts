import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientVideosService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        id: schema.videos.id,
        title: schema.videos.title,
        description: schema.videos.description,
        coverUrl: schema.videos.coverUrl,
        videoUrl: schema.videos.videoUrl,
        platform: schema.videos.platform,
        category: schema.videos.category,
        authorName: schema.videos.authorName,
        aiSummary: schema.videos.aiSummary,
        aiSentiment: schema.videos.aiSentiment,
        clubId: schema.videos.clubId,
        clubName: schema.clubs.name,
        publishedAt: schema.videos.publishedAt,
      })
      .from(schema.videos)
      .leftJoin(schema.clubs, eq(schema.videos.clubId, schema.clubs.id))
      .where(eq(schema.videos.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Video not found');
    return row;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientContentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findOne(id: string) {
    const [row] = await this.db
      .select({
        id: schema.contents.id,
        title: schema.contents.title,
        description: schema.contents.description,
        coverUrl: schema.contents.coverUrl,
        externalUrl: schema.contents.externalUrl,
        platform: schema.contents.platform,
        contentType: schema.contents.contentType,
        category: schema.contents.category,
        authorName: schema.contents.authorName,
        aiSummary: schema.contents.aiSummary,
        aiSentiment: schema.contents.aiSentiment,
        clubId: schema.contents.clubId,
        clubName: schema.clubs.name,
        groupId: schema.contents.groupId,
        groupPlatforms: schema.contents.groupPlatforms,
        publishedAt: schema.contents.publishedAt,
      })
      .from(schema.contents)
      .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
      .where(eq(schema.contents.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Content not found');
    return row;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, isNull, isNotNull, SQL } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminContentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(filters: {
    platform?: string;
    contentType?: string;
    category?: string;
    aiParsed?: string;
    hasClub?: string;
  }) {
    const conditions: SQL[] = [];

    if (filters.platform) {
      conditions.push(
        eq(
          schema.contents.platform,
          filters.platform as typeof schema.contents.$inferSelect.platform,
        ),
      );
    }
    if (filters.contentType) {
      conditions.push(
        eq(
          schema.contents.contentType,
          filters.contentType as typeof schema.contents.$inferSelect.contentType,
        ),
      );
    }
    if (filters.category) {
      conditions.push(
        eq(
          schema.contents.category,
          filters.category as typeof schema.contents.$inferSelect.category,
        ),
      );
    }
    if (filters.aiParsed === 'true') {
      conditions.push(eq(schema.contents.aiParsed, true));
    } else if (filters.aiParsed === 'false') {
      conditions.push(eq(schema.contents.aiParsed, false));
    }
    if (filters.hasClub === 'true') {
      conditions.push(isNotNull(schema.contents.clubId));
    } else if (filters.hasClub === 'false') {
      conditions.push(isNull(schema.contents.clubId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select({
        content: schema.contents,
        clubName: schema.clubs.name,
      })
      .from(schema.contents)
      .leftJoin(schema.clubs, eq(schema.contents.clubId, schema.clubs.id))
      .where(where)
      .orderBy(desc(schema.contents.createdAt))
      .limit(200);

    return items.map((item) => ({
      ...item.content,
      clubName: item.clubName,
    }));
  }

  async linkClub(contentId: string, clubId: string) {
    const [content] = await this.db
      .update(schema.contents)
      .set({ clubId, updatedAt: new Date() })
      .where(eq(schema.contents.id, contentId))
      .returning();

    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async mergeGroup(contentIds: string[], primaryId: string) {
    const groupId = randomUUID();

    // Get all contents to determine platforms
    const allContents = await this.db
      .select()
      .from(schema.contents)
      .where(
        and(
          ...contentIds.map((id) => eq(schema.contents.id, id)),
        ),
      );

    // Actually we need an IN clause. Let's use a different approach.
    const contentsToMerge = [];
    for (const id of contentIds) {
      const [c] = await this.db
        .select()
        .from(schema.contents)
        .where(eq(schema.contents.id, id));
      if (c) contentsToMerge.push(c);
    }

    const allPlatforms = [
      ...new Set(contentsToMerge.map((c) => c.platform)),
    ] as typeof schema.contents.$inferInsert.platform[];

    // Set all to the group
    for (const id of contentIds) {
      const isPrimary = id === primaryId;
      await this.db
        .update(schema.contents)
        .set({
          groupId,
          isPrimary,
          groupPlatforms: isPrimary ? allPlatforms : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.contents.id, id));
    }

    return { groupId, contentIds, primaryId };
  }

  async splitFromGroup(contentId: string) {
    const [content] = await this.db
      .select()
      .from(schema.contents)
      .where(eq(schema.contents.id, contentId));

    if (!content) throw new NotFoundException('Content not found');
    if (!content.groupId) return content;

    const groupId = content.groupId;

    // Remove this content from the group
    await this.db
      .update(schema.contents)
      .set({
        groupId: null,
        isPrimary: true,
        groupPlatforms: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.contents.id, contentId));

    // Get remaining members of the group
    const remaining = await this.db
      .select()
      .from(schema.contents)
      .where(eq(schema.contents.groupId, groupId));

    if (remaining.length === 0) {
      // No remaining members, nothing to do
    } else if (remaining.length === 1) {
      // Only 1 left, dissolve the group
      await this.db
        .update(schema.contents)
        .set({
          groupId: null,
          isPrimary: true,
          groupPlatforms: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.contents.id, remaining[0].id));
    } else {
      // Update the primary record's groupPlatforms
      const primary = remaining.find((r) => r.isPrimary);
      if (primary) {
        const platforms = [
          ...new Set(remaining.map((r) => r.platform)),
        ] as typeof schema.contents.$inferInsert.platform[];
        await this.db
          .update(schema.contents)
          .set({ groupPlatforms: platforms, updatedAt: new Date() })
          .where(eq(schema.contents.id, primary.id));
      }
    }

    return { contentId, removedFromGroup: groupId };
  }
}

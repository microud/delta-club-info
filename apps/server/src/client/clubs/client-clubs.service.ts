import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, count, desc, and, inArray, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page = 1, pageSize = 20, keyword?: string, serviceTypes?: string) {
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.clubs.status, 'published') as any,
    ];

    if (keyword) {
      conditions.push(ilike(schema.clubs.name, `%${keyword}%`) as any);
    }

    // Filter by serviceTypes if provided
    let clubIdsForServiceFilter: string[] | null = null;
    if (serviceTypes) {
      const types = serviceTypes.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        const serviceRows = await this.db
          .selectDistinct({ clubId: schema.clubServices.clubId })
          .from(schema.clubServices)
          .where(inArray(schema.clubServices.type, types as any[]));
        clubIdsForServiceFilter = serviceRows.map((r) => r.clubId);
        if (clubIdsForServiceFilter.length === 0) {
          return { data: [], total: 0, page, pageSize };
        }
        conditions.push(inArray(schema.clubs.id, clubIdsForServiceFilter) as any);
      }
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);

    const [clubs, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: schema.clubs.id,
          name: schema.clubs.name,
          logo: schema.clubs.logo,
          description: schema.clubs.description,
          establishedAt: schema.clubs.establishedAt,
          createdAt: schema.clubs.createdAt,
        })
        .from(schema.clubs)
        .where(where)
        .orderBy(desc(schema.clubs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.clubs).where(where),
    ]);

    // Fetch service types for each club
    const clubIds = clubs.map((c) => c.id);
    let serviceTypeMap: Map<string, string[]> = new Map();
    if (clubIds.length > 0) {
      const serviceRows = await this.db
        .selectDistinct({ clubId: schema.clubServices.clubId, type: schema.clubServices.type })
        .from(schema.clubServices)
        .where(inArray(schema.clubServices.clubId, clubIds));

      for (const row of serviceRows) {
        if (!serviceTypeMap.has(row.clubId)) {
          serviceTypeMap.set(row.clubId, []);
        }
        serviceTypeMap.get(row.clubId)!.push(row.type);
      }
    }

    const data = clubs.map((c) => ({
      ...c,
      serviceTypes: serviceTypeMap.get(c.id) ?? [],
    }));

    return { data, total, page, pageSize };
  }

  async findOne(id: string) {
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(and(eq(schema.clubs.id, id), eq(schema.clubs.status, 'published')))
      .limit(1);

    if (!club) throw new NotFoundException('Club not found');

    let predecessor: { id: string; name: string } | null = null;
    if (club.predecessorId) {
      const [pred] = await this.db
        .select({ id: schema.clubs.id, name: schema.clubs.name })
        .from(schema.clubs)
        .where(eq(schema.clubs.id, club.predecessorId))
        .limit(1);
      if (pred) predecessor = pred;
    }

    return { ...club, predecessor };
  }

  async findServices(clubId: string) {
    return this.db
      .select()
      .from(schema.clubServices)
      .where(eq(schema.clubServices.clubId, clubId))
      .orderBy(schema.clubServices.sortOrder);
  }

  async findRules(clubId: string) {
    return this.db
      .select()
      .from(schema.clubRules)
      .where(eq(schema.clubRules.clubId, clubId));
  }

  async findContents(clubId: string, type?: string) {
    const conditions: SQL[] = [
      eq(schema.contents.clubId, clubId),
      eq(schema.contents.isPrimary, true),
    ];
    if (type) {
      conditions.push(
        eq(schema.contents.category, type as 'REVIEW' | 'SENTIMENT' | 'ANNOUNCEMENT'),
      );
    }

    return this.db
      .select({
        id: schema.contents.id,
        title: schema.contents.title,
        coverUrl: schema.contents.coverUrl,
        authorName: schema.contents.authorName,
        platform: schema.contents.platform,
        contentType: schema.contents.contentType,
        category: schema.contents.category,
        groupPlatforms: schema.contents.groupPlatforms,
        publishedAt: schema.contents.publishedAt,
      })
      .from(schema.contents)
      .where(and(...conditions))
      .orderBy(desc(schema.contents.publishedAt));
  }
}

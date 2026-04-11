import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, count, desc, and, asc, arrayOverlaps, isNotNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

interface FindAllFilters {
  sortBy?: 'createdAt' | 'operatingDays';
  minOperatingDays?: number;
  hasCompanyInfo?: boolean;
}

@Injectable()
export class ClientClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(
    page = 1,
    pageSize = 20,
    keyword?: string,
    serviceTypes?: string,
    filters?: FindAllFilters,
  ) {
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [
      eq(schema.clubs.status, 'published' as typeof schema.clubs.$inferSelect.status),
    ];

    if (keyword) {
      conditions.push(ilike(schema.clubs.name, `%${keyword}%`));
    }

    if (serviceTypes) {
      const types = serviceTypes.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        conditions.push(arrayOverlaps(schema.clubs.serviceTypes, types));
      }
    }

    if (filters?.minOperatingDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.minOperatingDays);
      conditions.push(
        sql`${schema.clubs.establishedAt} IS NOT NULL AND ${schema.clubs.establishedAt} <= ${cutoffDate.toISOString().split('T')[0]}`,
      );
    }

    if (filters?.hasCompanyInfo) {
      conditions.push(isNotNull(schema.clubs.companyName));
    }

    const where = and(...conditions);

    let orderBy;
    if (filters?.sortBy === 'operatingDays') {
      orderBy = asc(schema.clubs.establishedAt);
    } else {
      orderBy = desc(schema.clubs.createdAt);
    }

    const [clubs, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: schema.clubs.id,
          name: schema.clubs.name,
          logo: schema.clubs.logo,
          description: schema.clubs.description,
          establishedAt: schema.clubs.establishedAt,
          serviceTypes: schema.clubs.serviceTypes,
          createdAt: schema.clubs.createdAt,
        })
        .from(schema.clubs)
        .where(where)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.clubs).where(where),
    ]);

    return { data: clubs, total, page, pageSize };
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

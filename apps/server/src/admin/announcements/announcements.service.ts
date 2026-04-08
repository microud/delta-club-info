import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { type CreateAnnouncementDto } from './dto/create-announcement.dto';
import { type UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.announcements)
        .orderBy(desc(schema.announcements.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.announcements),
    ]);

    return { data: items, total, page, pageSize };
  }

  async findOne(id: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .limit(1);

    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async create(dto: CreateAnnouncementDto) {
    const publishedAt =
      dto.status === 'published' ? new Date() : undefined;

    const [announcement] = await this.db
      .insert(schema.announcements)
      .values({
        title: dto.title,
        content: dto.content,
        status: (dto.status as 'draft' | 'published') ?? 'draft',
        publishedAt,
      })
      .returning();

    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const existing = await this.findOne(id);

    const publishedAt =
      dto.status === 'published' && existing.publishedAt === null
        ? new Date()
        : existing.publishedAt;

    const [announcement] = await this.db
      .update(schema.announcements)
      .set({
        ...dto,
        status: dto.status as 'draft' | 'published' | undefined,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.announcements.id, id))
      .returning();

    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }

  async remove(id: string) {
    const [announcement] = await this.db
      .delete(schema.announcements)
      .where(eq(schema.announcements.id, id))
      .returning();

    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }
}

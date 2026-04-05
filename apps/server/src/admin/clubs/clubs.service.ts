import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';

@Injectable()
export class ClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(page = 1, pageSize = 20, search?: string) {
    const offset = (page - 1) * pageSize;
    const where = search
      ? ilike(schema.clubs.name, `%${search}%`)
      : undefined;

    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.clubs)
        .where(where)
        .orderBy(desc(schema.clubs.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(schema.clubs).where(where),
    ]);

    return { data: items, total, page, pageSize };
  }

  async findOne(id: string) {
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, id))
      .limit(1);

    if (!club) throw new NotFoundException('Club not found');
    return club;
  }

  async create(dto: CreateClubDto) {
    const [club] = await this.db
      .insert(schema.clubs)
      .values(dto)
      .returning();
    return club;
  }

  async update(id: string, dto: UpdateClubDto) {
    const [club] = await this.db
      .update(schema.clubs)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.clubs.id, id))
      .returning();

    if (!club) throw new NotFoundException('Club not found');
    return club;
  }

  async remove(id: string) {
    const [club] = await this.db
      .delete(schema.clubs)
      .where(eq(schema.clubs.id, id))
      .returning();

    if (!club) throw new NotFoundException('Club not found');
    return club;
  }
}

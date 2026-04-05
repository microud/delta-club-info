import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';

type VideoPlatform = 'BILIBILI' | 'DOUYIN';

@Injectable()
export class BloggersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db
      .select()
      .from(schema.bloggers)
      .orderBy(desc(schema.bloggers.createdAt));
  }

  async create(dto: CreateBloggerDto) {
    const [blogger] = await this.db
      .insert(schema.bloggers)
      .values({
        platform: dto.platform as VideoPlatform,
        externalId: dto.externalId,
        name: dto.name,
      })
      .returning();
    return blogger;
  }

  async update(id: string, dto: UpdateBloggerDto) {
    const values: Record<string, unknown> = {};
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.isActive !== undefined) values.isActive = dto.isActive;

    const [blogger] = await this.db
      .update(schema.bloggers)
      .set(values)
      .where(eq(schema.bloggers.id, id))
      .returning();

    if (!blogger) throw new NotFoundException('Blogger not found');
    return blogger;
  }

  async remove(id: string) {
    const [blogger] = await this.db
      .delete(schema.bloggers)
      .where(eq(schema.bloggers.id, id))
      .returning();

    if (!blogger) throw new NotFoundException('Blogger not found');
    return blogger;
  }
}

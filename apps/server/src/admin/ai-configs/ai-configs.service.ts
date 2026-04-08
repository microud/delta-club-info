import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { type CreateAiConfigDto } from './dto/create-ai-config.dto';
import { type UpdateAiConfigDto } from './dto/update-ai-config.dto';

@Injectable()
export class AiConfigsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.select().from(schema.aiConfigs).orderBy(schema.aiConfigs.createdAt);
  }

  async findById(id: string) {
    const [config] = await this.db
      .select()
      .from(schema.aiConfigs)
      .where(eq(schema.aiConfigs.id, id));
    if (!config) throw new NotFoundException('AI 配置不存在');
    return config;
  }

  async create(dto: CreateAiConfigDto) {
    const [created] = await this.db
      .insert(schema.aiConfigs)
      .values({
        name: dto.name,
        provider: dto.provider,
        apiKey: dto.apiKey,
        baseUrl: dto.baseUrl || null,
        model: dto.model,
      })
      .returning();
    return created;
  }

  async update(id: string, dto: UpdateAiConfigDto) {
    await this.findById(id);
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.provider !== undefined) values.provider = dto.provider;
    if (dto.apiKey !== undefined) values.apiKey = dto.apiKey;
    if (dto.baseUrl !== undefined) values.baseUrl = dto.baseUrl || null;
    if (dto.model !== undefined) values.model = dto.model;

    const [updated] = await this.db
      .update(schema.aiConfigs)
      .set(values)
      .where(eq(schema.aiConfigs.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.db.delete(schema.aiConfigs).where(eq(schema.aiConfigs.id, id));
  }
}

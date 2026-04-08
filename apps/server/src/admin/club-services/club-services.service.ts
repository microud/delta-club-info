import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, asc, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { type AiParseService } from '../../ai-parse/ai-parse.service';
import { type CreateClubServiceDto } from './dto/create-club-service.dto';
import { type UpdateClubServiceDto } from './dto/update-club-service.dto';

@Injectable()
export class ClubServicesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly aiParseService: AiParseService,
  ) {}

  async findByClub(clubId: string) {
    return this.db
      .select()
      .from(schema.clubServices)
      .where(eq(schema.clubServices.clubId, clubId))
      .orderBy(asc(schema.clubServices.sortOrder));
  }

  async create(clubId: string, dto: CreateClubServiceDto) {
    const [service] = await this.db
      .insert(schema.clubServices)
      .values({
        clubId,
        type: dto.type,
        priceYuan: dto.priceYuan?.toString(),
        priceHafuCoin: dto.priceHafuCoin?.toString(),
        tier: dto.tier,
        pricePerHour: dto.pricePerHour?.toString(),
        gameName: dto.gameName,
        hasGuarantee: dto.hasGuarantee,
        guaranteeHafuCoin: dto.guaranteeHafuCoin?.toString(),
        rules: dto.rules,
        images: dto.images ?? [],
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();
    return service;
  }

  async update(clubId: string, id: string, dto: UpdateClubServiceDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.priceYuan !== undefined) values.priceYuan = dto.priceYuan?.toString();
    if (dto.priceHafuCoin !== undefined) values.priceHafuCoin = dto.priceHafuCoin?.toString();
    if (dto.tier !== undefined) values.tier = dto.tier;
    if (dto.pricePerHour !== undefined) values.pricePerHour = dto.pricePerHour?.toString();
    if (dto.gameName !== undefined) values.gameName = dto.gameName;
    if (dto.hasGuarantee !== undefined) values.hasGuarantee = dto.hasGuarantee;
    if (dto.guaranteeHafuCoin !== undefined) values.guaranteeHafuCoin = dto.guaranteeHafuCoin?.toString();
    if (dto.rules !== undefined) values.rules = dto.rules;
    if (dto.sortOrder !== undefined) values.sortOrder = dto.sortOrder;
    if (dto.images !== undefined) values.images = dto.images;

    const [service] = await this.db
      .update(schema.clubServices)
      .set(values)
      .where(
        and(
          eq(schema.clubServices.id, id),
          eq(schema.clubServices.clubId, clubId),
        ),
      )
      .returning();

    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async remove(clubId: string, id: string) {
    const [service] = await this.db
      .delete(schema.clubServices)
      .where(
        and(
          eq(schema.clubServices.id, id),
          eq(schema.clubServices.clubId, clubId),
        ),
      )
      .returning();

    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async aiImport(files: Express.Multer.File[], textContent?: string) {
    const buffers = files.map((f) => f.buffer);
    const textContents = textContent ? [textContent] : [];
    return this.aiParseService.parseFromBuffers(buffers, textContents);
  }

  async batchCreate(clubId: string, dtos: CreateClubServiceDto[]) {
    const results = [];
    for (const dto of dtos) {
      const service = await this.create(clubId, dto);
      results.push(service);
    }
    return results;
  }
}

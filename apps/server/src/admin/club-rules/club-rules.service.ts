import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateClubRuleDto } from './dto/create-club-rule.dto';
import { UpdateClubRuleDto } from './dto/update-club-rule.dto';

@Injectable()
export class ClubRulesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByClub(clubId: string) {
    return this.db
      .select()
      .from(schema.clubRules)
      .where(eq(schema.clubRules.clubId, clubId));
  }

  async create(clubId: string, dto: CreateClubRuleDto) {
    const [rule] = await this.db
      .insert(schema.clubRules)
      .values({
        clubId,
        content: dto.content,
        sentiment: dto.sentiment ?? 'NEUTRAL',
      })
      .returning();
    return rule;
  }

  async update(clubId: string, id: string, dto: UpdateClubRuleDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.content !== undefined) values.content = dto.content;
    if (dto.sentiment !== undefined) values.sentiment = dto.sentiment;

    const [rule] = await this.db
      .update(schema.clubRules)
      .set(values)
      .where(
        and(
          eq(schema.clubRules.id, id),
          eq(schema.clubRules.clubId, clubId),
        ),
      )
      .returning();

    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }

  async remove(clubId: string, id: string) {
    const [rule] = await this.db
      .delete(schema.clubRules)
      .where(
        and(
          eq(schema.clubRules.id, id),
          eq(schema.clubRules.clubId, clubId),
        ),
      )
      .returning();

    if (!rule) throw new NotFoundException('Rule not found');
    return rule;
  }
}

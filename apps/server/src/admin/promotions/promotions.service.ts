import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, sql, and, lte, gte } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    const orders = await this.db
      .select({
        id: schema.promotionOrders.id,
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        fee: schema.promotionOrders.fee,
        startAt: schema.promotionOrders.startAt,
        endAt: schema.promotionOrders.endAt,
        dailyRate: schema.promotionOrders.dailyRate,
        createdAt: schema.promotionOrders.createdAt,
      })
      .from(schema.promotionOrders)
      .leftJoin(schema.clubs, eq(schema.promotionOrders.clubId, schema.clubs.id))
      .orderBy(desc(schema.promotionOrders.createdAt));

    const today = new Date().toISOString().split('T')[0];
    return orders.map((o) => ({
      ...o,
      isActive: o.startAt <= today && o.endAt >= today,
    }));
  }

  async create(dto: CreatePromotionDto) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const dailyRate = (dto.fee / days).toFixed(4);

    const [order] = await this.db
      .insert(schema.promotionOrders)
      .values({
        clubId: dto.clubId,
        fee: dto.fee.toString(),
        startAt: dto.startAt,
        endAt: dto.endAt,
        dailyRate,
      })
      .returning();

    return order;
  }

  async remove(id: string) {
    const [order] = await this.db
      .delete(schema.promotionOrders)
      .where(eq(schema.promotionOrders.id, id))
      .returning();

    if (!order) throw new NotFoundException('Promotion order not found');
    return order;
  }

  async getRanking() {
    const today = sql`CURRENT_DATE`;

    const ranking = await this.db
      .select({
        clubId: schema.promotionOrders.clubId,
        clubName: schema.clubs.name,
        totalDailyRate: sql<string>`SUM(${schema.promotionOrders.dailyRate}::numeric)`.as('total_daily_rate'),
      })
      .from(schema.promotionOrders)
      .leftJoin(schema.clubs, eq(schema.promotionOrders.clubId, schema.clubs.id))
      .where(
        and(
          lte(schema.promotionOrders.startAt, sql`${today}::text`),
          gte(schema.promotionOrders.endAt, sql`${today}::text`),
        ),
      )
      .groupBy(schema.promotionOrders.clubId, schema.clubs.name)
      .orderBy(sql`total_daily_rate DESC`);

    return ranking;
  }
}

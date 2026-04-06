import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class UserService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getProfile(userId: string) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        nickname: schema.users.nickname,
        avatar: schema.users.avatar,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);

    return user;
  }

  async getFavorites(userId: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const where = eq(schema.userFavorites.userId, userId);

    const [items, [{ value: total }]] = await Promise.all([
      this.db
        .select({
          id: schema.clubs.id,
          name: schema.clubs.name,
          logo: schema.clubs.logo,
          description: schema.clubs.description,
          establishedAt: schema.clubs.establishedAt,
          favoritedAt: schema.userFavorites.createdAt,
        })
        .from(schema.userFavorites)
        .innerJoin(schema.clubs, eq(schema.userFavorites.clubId, schema.clubs.id))
        .where(where)
        .orderBy(desc(schema.userFavorites.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(schema.userFavorites)
        .where(where),
    ]);

    return { data: items, total, page, pageSize };
  }

  async addFavorite(userId: string, clubId: string) {
    try {
      await this.db
        .insert(schema.userFavorites)
        .values({ userId, clubId });
      return { success: true };
    } catch (err: any) {
      // PostgreSQL unique constraint violation
      if (err?.code === '23505') {
        throw new ConflictException('Already favorited');
      }
      throw err;
    }
  }

  async removeFavorite(userId: string, clubId: string) {
    await this.db
      .delete(schema.userFavorites)
      .where(
        and(
          eq(schema.userFavorites.userId, userId),
          eq(schema.userFavorites.clubId, clubId),
        ),
      );
    return { success: true };
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';
import { CreateBloggerAccountDto } from './dto/create-blogger-account.dto';
import { UpdateBloggerAccountDto } from './dto/update-blogger-account.dto';

@Injectable()
export class BloggersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    const bloggers = await this.db
      .select()
      .from(schema.bloggers)
      .orderBy(desc(schema.bloggers.createdAt));

    const accounts = await this.db
      .select()
      .from(schema.bloggerAccounts)
      .orderBy(desc(schema.bloggerAccounts.createdAt));

    const accountsByBloggerId = new Map<string, (typeof accounts)[number][]>();
    for (const account of accounts) {
      const list = accountsByBloggerId.get(account.bloggerId) ?? [];
      list.push(account);
      accountsByBloggerId.set(account.bloggerId, list);
    }

    return bloggers.map((blogger) => ({
      ...blogger,
      accounts: accountsByBloggerId.get(blogger.id) ?? [],
    }));
  }

  async create(dto: CreateBloggerDto) {
    const [blogger] = await this.db
      .insert(schema.bloggers)
      .values({
        name: dto.name,
        avatar: dto.avatar,
      })
      .returning();
    return { ...blogger, accounts: [] };
  }

  async update(id: string, dto: UpdateBloggerDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) values.name = dto.name;
    if (dto.avatar !== undefined) values.avatar = dto.avatar;
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

  async addAccount(bloggerId: string, dto: CreateBloggerAccountDto) {
    // Verify blogger exists
    const [blogger] = await this.db
      .select({ id: schema.bloggers.id })
      .from(schema.bloggers)
      .where(eq(schema.bloggers.id, bloggerId));

    if (!blogger) throw new NotFoundException('Blogger not found');

    const [account] = await this.db
      .insert(schema.bloggerAccounts)
      .values({
        bloggerId,
        platform:
          dto.platform as typeof schema.bloggerAccounts.$inferInsert.platform,
        platformUserId: dto.platformUserId,
        platformUsername: dto.platformUsername,
        crawlCategories:
          dto.crawlCategories as typeof schema.bloggerAccounts.$inferInsert.crawlCategories,
      })
      .returning();
    return account;
  }

  async updateAccount(accountId: string, dto: UpdateBloggerAccountDto) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.platformUsername !== undefined)
      values.platformUsername = dto.platformUsername;
    if (dto.crawlCategories !== undefined)
      values.crawlCategories = dto.crawlCategories;

    const [account] = await this.db
      .update(schema.bloggerAccounts)
      .set(values)
      .where(eq(schema.bloggerAccounts.id, accountId))
      .returning();

    if (!account) throw new NotFoundException('Blogger account not found');
    return account;
  }

  async removeAccount(accountId: string) {
    const [account] = await this.db
      .delete(schema.bloggerAccounts)
      .where(eq(schema.bloggerAccounts.id, accountId))
      .returning();

    if (!account) throw new NotFoundException('Blogger account not found');
    return account;
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, ilike, count, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { StorageService } from '../../storage/storage.service';
import axios from 'axios';

@Injectable()
export class ClubsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly storageService: StorageService,
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

  async fetchWechatAvatar(wechatOfficialAccount: string): Promise<string> {
    // 通过搜狗微信搜索获取公众号头像
    const searchUrl = `https://weixin.sogou.com/weixin?type=1&query=${encodeURIComponent(wechatOfficialAccount)}`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const html = response.data as string;
    const avatarMatch = html.match(/img[^>]+src="(https?:\/\/[^"]+)"/);
    if (!avatarMatch) {
      throw new Error('无法获取公众号头像');
    }

    const avatarUrl = avatarMatch[1];
    const imgResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imgResponse.data);
    const key = `club-logos/${wechatOfficialAccount}-${Date.now()}.jpg`;
    await this.storageService.upload(key, buffer, 'image/jpeg', 'public');

    return this.storageService.getPublicUrl(key);
  }
}

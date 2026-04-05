import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import axios, { type AxiosInstance } from 'axios';
import { CrawlerAdapter, RawVideo } from './crawler-adapter.interface';

// Wbi 签名混淆表
const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map((n) => orig[n]).join('').slice(0, 32);
}

function encodeWbiParams(params: Record<string, string | number>, mixinKey: string): string {
  const wts = Math.round(Date.now() / 1000);
  const entries = { ...params, wts };

  const query = Object.keys(entries)
    .sort()
    .map((key) => {
      const val = String(entries[key as keyof typeof entries]).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
    })
    .join('&');

  const wRid = createHash('md5').update(query + mixinKey).digest('hex');
  return `${query}&w_rid=${wRid}`;
}

@Injectable()
export class BilibiliAdapter implements CrawlerAdapter {
  platform = 'BILIBILI' as const;
  private readonly logger = new Logger(BilibiliAdapter.name);

  private readonly http: AxiosInstance;
  private mixinKey: string | null = null;
  private mixinKeyTs = 0;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.bilibili.com',
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://www.bilibili.com',
      },
    });
  }

  private async getMixinKey(): Promise<string> {
    // Cache for 1 hour
    if (this.mixinKey && Date.now() - this.mixinKeyTs < 3600_000) {
      return this.mixinKey;
    }

    const res = await this.http.get('/x/web-interface/nav');
    const wbiImg = res.data?.data?.wbi_img;
    if (!wbiImg?.img_url || !wbiImg?.sub_url) {
      throw new Error('Failed to get Wbi keys from nav API');
    }

    const imgKey = (wbiImg.img_url as string).split('/').pop()!.split('.')[0];
    const subKey = (wbiImg.sub_url as string).split('/').pop()!.split('.')[0];
    this.mixinKey = getMixinKey(imgKey + subKey);
    this.mixinKeyTs = Date.now();
    return this.mixinKey;
  }

  private async wbiGet(path: string, params: Record<string, string | number>) {
    const mixinKey = await this.getMixinKey();
    const query = encodeWbiParams(params, mixinKey);
    return this.http.get(`${path}?${query}`);
  }

  async fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]> {
    try {
      const res = await this.wbiGet('/x/space/wbi/arc/search', {
        mid: bloggerId,
        ps: 30,
        pn: 1,
        order: 'pubdate',
      });

      const list = res.data?.data?.list?.vlist;
      if (!Array.isArray(list)) {
        this.logger.warn(`No videos found for blogger ${bloggerId}, code: ${res.data?.code}`);
        return [];
      }

      return list.map((item: Record<string, unknown>) => ({
        externalId: String(item.bvid),
        title: String(item.title ?? ''),
        coverUrl: String(item.pic ?? '').replace(/^\/\//, 'https://'),
        videoUrl: `https://www.bilibili.com/video/${item.bvid}`,
        description: item.description ? String(item.description) : undefined,
        authorName: String(item.author ?? ''),
        authorId: String(bloggerId),
        publishedAt: new Date((item.created as number) * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch videos for blogger ${bloggerId}`, error);
      return [];
    }
  }

  async searchVideos(keyword: string): Promise<RawVideo[]> {
    try {
      const res = await this.wbiGet('/x/web-interface/wbi/search/type', {
        search_type: 'video',
        keyword,
        order: 'pubdate',
        page: 1,
        pagesize: 30,
      });

      const list = res.data?.data?.result;
      if (!Array.isArray(list)) {
        this.logger.warn(`No search results for keyword "${keyword}", code: ${res.data?.code}`);
        return [];
      }

      return list.map((item: Record<string, unknown>) => ({
        externalId: String(item.bvid),
        title: String(item.title ?? '').replace(/<[^>]+>/g, ''),
        coverUrl: String(item.pic ?? '').replace(/^\/\//, 'https://'),
        videoUrl: `https://www.bilibili.com/video/${item.bvid}`,
        description: item.description ? String(item.description) : undefined,
        authorName: String(item.author ?? ''),
        authorId: String(item.mid ?? ''),
        publishedAt: new Date((item.pubdate as number) * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to search videos for "${keyword}"`, error);
      return [];
    }
  }
}

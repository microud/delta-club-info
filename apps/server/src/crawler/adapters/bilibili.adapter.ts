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

function generateBuvid3(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${result}infoc`;
}

@Injectable()
export class BilibiliAdapter implements CrawlerAdapter {
  platform = 'BILIBILI' as const;
  private readonly logger = new Logger(BilibiliAdapter.name);

  private readonly http: AxiosInstance;
  private mixinKey: string | null = null;
  private mixinKeyTs = 0;
  private cookies: string = '';
  private cookieTs = 0;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.bilibili.com',
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Referer: 'https://www.bilibili.com',
        Origin: 'https://www.bilibili.com',
      },
    });
  }

  /**
   * 初始化 Cookie：访问 B站主站获取 buvid3 等基础 Cookie，
   * 如果获取失败则生成一个假的 buvid3。缓存 2 小时。
   */
  private async ensureCookies(): Promise<void> {
    if (this.cookies && Date.now() - this.cookieTs < 7200_000) {
      return;
    }

    try {
      // 访问 B站首页获取 set-cookie
      const res = await axios.get('https://www.bilibili.com', {
        timeout: 10000,
        headers: {
          'User-Agent': this.http.defaults.headers['User-Agent'] as string,
        },
        maxRedirects: 3,
      });

      const setCookies = res.headers['set-cookie'];
      if (setCookies && Array.isArray(setCookies)) {
        this.cookies = setCookies
          .map((c: string) => c.split(';')[0])
          .join('; ');
        this.logger.log(`Got cookies from bilibili.com: ${this.cookies.substring(0, 80)}...`);
      }
    } catch {
      this.logger.warn('Failed to fetch cookies from bilibili.com, generating fallback');
    }

    // 确保至少有 buvid3
    if (!this.cookies.includes('buvid3')) {
      const buvid3 = generateBuvid3();
      const bNut = String(Math.floor(Date.now() / 1000));
      this.cookies = this.cookies
        ? `${this.cookies}; buvid3=${buvid3}; b_nut=${bNut}`
        : `buvid3=${buvid3}; b_nut=${bNut}`;
    }

    this.cookieTs = Date.now();
  }

  private async getMixinKey(): Promise<string> {
    if (this.mixinKey && Date.now() - this.mixinKeyTs < 3600_000) {
      return this.mixinKey;
    }

    await this.ensureCookies();

    const res = await this.http.get('/x/web-interface/nav', {
      headers: { Cookie: this.cookies },
    });
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
    await this.ensureCookies();
    const mixinKey = await this.getMixinKey();
    const query = encodeWbiParams(params, mixinKey);
    return this.http.get(`${path}?${query}`, {
      headers: { Cookie: this.cookies },
    });
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

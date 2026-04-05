import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CrawlerAdapter, RawVideo } from './crawler-adapter.interface';

@Injectable()
export class BilibiliAdapter implements CrawlerAdapter {
  platform = 'BILIBILI' as const;
  private readonly logger = new Logger(BilibiliAdapter.name);

  private readonly http = axios.create({
    baseURL: 'https://api.bilibili.com',
    timeout: 10000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  async fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]> {
    try {
      const res = await this.http.get('/x/space/wbi/arc/search', {
        params: {
          mid: bloggerId,
          ps: 30,
          pn: 1,
          order: 'pubdate',
        },
      });

      const list = res.data?.data?.list?.vlist;
      if (!Array.isArray(list)) {
        this.logger.warn(`No videos found for blogger ${bloggerId}`);
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
      const res = await this.http.get('/x/web-interface/search/type', {
        params: {
          search_type: 'video',
          keyword,
          order: 'pubdate',
          page: 1,
          pagesize: 30,
        },
      });

      const list = res.data?.data?.result;
      if (!Array.isArray(list)) {
        this.logger.warn(`No search results for keyword "${keyword}"`);
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

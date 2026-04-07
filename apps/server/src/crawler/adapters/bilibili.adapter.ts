import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class BilibiliAdapter implements PlatformAdapter {
  platform = 'BILIBILI';

  normalizeUserPosts(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    // TikHub returns data.list.vlist or data.list directly
    const listObj = data.list as Record<string, unknown> | undefined;
    const vlist = (listObj?.vlist ?? listObj) as Record<string, unknown>[] | undefined;
    if (!Array.isArray(vlist)) return [];

    return vlist.map((item) => ({
      platform: this.platform,
      externalId: String(item.bvid ?? item.aid ?? ''),
      externalUrl: item.bvid
        ? `https://www.bilibili.com/video/${item.bvid}`
        : null,
      contentType: 'VIDEO' as const,
      title: String(item.title ?? ''),
      description: item.description ? String(item.description) : null,
      coverUrl: item.pic
        ? String(item.pic).replace(/^\/\//, 'https://')
        : null,
      authorName: item.author ? String(item.author) : null,
      authorPlatformId: item.mid ? String(item.mid) : null,
      publishedAt: item.created
        ? new Date((item.created as number) * 1000)
        : null,
    }));
  }

  normalizeSearchResults(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    const result = data.result as Record<string, unknown>[] | undefined;
    if (!Array.isArray(result)) return [];

    // Filter by type=video when present
    const videos = result.filter(
      (item) => !item.type || item.type === 'video',
    );

    return videos.map((item) => ({
      platform: this.platform,
      externalId: String(item.bvid ?? item.aid ?? ''),
      externalUrl: item.bvid
        ? `https://www.bilibili.com/video/${item.bvid}`
        : null,
      contentType: 'VIDEO' as const,
      title: String(item.title ?? '').replace(/<[^>]+>/g, ''),
      description: item.description ? String(item.description) : null,
      coverUrl: item.pic
        ? String(item.pic).replace(/^\/\//, 'https://')
        : null,
      authorName: item.author ? String(item.author) : null,
      authorPlatformId: item.mid ? String(item.mid) : null,
      publishedAt: item.pubdate
        ? new Date((item.pubdate as number) * 1000)
        : null,
    }));
  }
}

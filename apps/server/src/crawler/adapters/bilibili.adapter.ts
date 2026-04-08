import { Injectable } from '@nestjs/common';
import { type PlatformAdapter, type RawContent } from './platform-adapter.interface';

@Injectable()
export class BilibiliAdapter implements PlatformAdapter {
  platform = 'BILIBILI';

  normalizeUserPosts(raw: unknown): RawContent[] {
    const outerData = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!outerData) return [];

    // App API: data.data.item[]
    const innerData = outerData.data as Record<string, unknown> | undefined;
    const items = innerData?.item as Record<string, unknown>[] | undefined;
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      platform: this.platform,
      externalId: String(item.bvid ?? item.param ?? ''),
      externalUrl: item.bvid
        ? `https://www.bilibili.com/video/${item.bvid}`
        : null,
      contentType: 'VIDEO' as const,
      title: String(item.title ?? ''),
      description: item.subtitle ? String(item.subtitle) : null,
      coverUrl: item.cover
        ? String(item.cover).replace(/^\/\//, 'https://')
        : null,
      authorName: item.author ? String(item.author) : null,
      authorPlatformId: null,
      publishedAt: item.ctime
        ? new Date((item.ctime as number) * 1000)
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

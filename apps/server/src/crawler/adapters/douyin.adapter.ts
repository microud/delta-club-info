import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class DouyinAdapter implements PlatformAdapter {
  platform = 'DOUYIN';

  normalizeUserPosts(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    const awemeList = data.aweme_list as Record<string, unknown>[] | undefined;
    if (!Array.isArray(awemeList)) return [];

    return awemeList.map((item) => this.mapAweme(item));
  }

  normalizeSearchResults(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    // Search results may be in data.data or data.aweme_list
    let items = data.data as Record<string, unknown>[] | undefined;
    if (!Array.isArray(items)) {
      items = data.aweme_list as Record<string, unknown>[] | undefined;
    }
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      // Search results may wrap the aweme in aweme_info
      const aweme = (item.aweme_info as Record<string, unknown>) ?? item;
      return this.mapAweme(aweme);
    });
  }

  private mapAweme(item: Record<string, unknown>): RawContent {
    const video = item.video as Record<string, unknown> | undefined;
    const cover = video?.cover as Record<string, unknown> | undefined;
    const coverUrl = cover?.url_list
      ? String((cover.url_list as string[])[0] ?? '')
      : null;

    const author = item.author as Record<string, unknown> | undefined;

    return {
      platform: this.platform,
      externalId: String(item.aweme_id ?? ''),
      externalUrl: item.aweme_id
        ? `https://www.douyin.com/video/${item.aweme_id}`
        : null,
      contentType: 'VIDEO',
      title: String(item.desc ?? ''),
      description: item.desc ? String(item.desc) : null,
      coverUrl,
      authorName: author?.nickname ? String(author.nickname) : null,
      authorPlatformId: author?.sec_uid
        ? String(author.sec_uid)
        : author?.uid
          ? String(author.uid)
          : null,
      publishedAt: item.create_time
        ? new Date((item.create_time as number) * 1000)
        : null,
    };
  }
}

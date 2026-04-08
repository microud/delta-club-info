import { Injectable } from '@nestjs/common';
import { PlatformAdapter,  RawContent } from './platform-adapter.interface';

@Injectable()
export class WechatChannelsAdapter implements PlatformAdapter {
  platform = 'WECHAT_CHANNELS';

  normalizeUserPosts(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    const objectList = data.object_list as Record<string, unknown>[] | undefined;
    if (!Array.isArray(objectList)) return [];

    return objectList.map((item) => this.mapObject(item));
  }

  normalizeSearchResults(raw: unknown): RawContent[] {
    // Search results share the same structure as user posts
    return this.normalizeUserPosts(raw);
  }

  private mapObject(item: Record<string, unknown>): RawContent {
    const objectInfo = (item.object_info ?? item) as Record<string, unknown>;
    const id = String(objectInfo.id ?? objectInfo.object_id ?? item.id ?? '');

    const media = objectInfo.media as Record<string, unknown> | undefined;
    const coverUrl = media?.cover_url
      ? String(media.cover_url)
      : objectInfo.head_url
        ? String(objectInfo.head_url)
        : null;

    const nickname = objectInfo.nickname ?? objectInfo.username ?? null;
    const username = objectInfo.username ?? null;

    return {
      platform: this.platform,
      externalId: id,
      externalUrl: null, // Wechat Channels doesn't have stable public URLs
      contentType: 'VIDEO',
      title: String(objectInfo.description ?? objectInfo.title ?? ''),
      description: objectInfo.description
        ? String(objectInfo.description)
        : null,
      coverUrl,
      authorName: nickname ? String(nickname) : null,
      authorPlatformId: username ? String(username) : null,
      publishedAt: objectInfo.create_time
        ? new Date((objectInfo.create_time as number) * 1000)
        : null,
    };
  }
}

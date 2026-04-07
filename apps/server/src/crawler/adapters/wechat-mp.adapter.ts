import { Injectable } from '@nestjs/common';
import { PlatformAdapter, RawContent } from './platform-adapter.interface';

@Injectable()
export class WechatMpAdapter implements PlatformAdapter {
  platform = 'WECHAT_MP';

  normalizeUserPosts(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    // TikHub returns data.general_msg_list or data.app_msg_list
    let items: Record<string, unknown>[] | undefined;

    const generalMsgList = data.general_msg_list;
    if (typeof generalMsgList === 'string') {
      // Sometimes returned as a JSON string
      try {
        const parsed = JSON.parse(generalMsgList) as Record<string, unknown>;
        items = parsed.list as Record<string, unknown>[] | undefined;
      } catch {
        items = undefined;
      }
    } else if (Array.isArray(generalMsgList)) {
      items = generalMsgList as Record<string, unknown>[];
    }

    if (!Array.isArray(items)) {
      items = data.app_msg_list as Record<string, unknown>[] | undefined;
    }
    if (!Array.isArray(items)) return [];

    return items.map((item) => this.mapArticle(item));
  }

  normalizeSearchResults(_raw: unknown): RawContent[] {
    // 公众号不支持搜索
    return [];
  }

  private mapArticle(item: Record<string, unknown>): RawContent {
    // app_msg_list items have direct fields; general_msg_list wraps in app_msg_ext_info
    const appMsgExtInfo = item.app_msg_ext_info as Record<string, unknown> | undefined;
    const article = appMsgExtInfo ?? item;

    const aid = String(article.aid ?? article.fileid ?? item.aid ?? '');
    const link = article.content_url ?? article.link ?? null;

    return {
      platform: this.platform,
      externalId: aid,
      externalUrl: link ? String(link) : null,
      contentType: 'ARTICLE',
      title: String(article.title ?? ''),
      description: article.digest ? String(article.digest) : null,
      coverUrl: article.cover ? String(article.cover) : null,
      authorName: article.author ? String(article.author) : null,
      authorPlatformId: null, // MP articles don't expose author platform IDs
      publishedAt: article.update_time
        ? new Date((article.update_time as number) * 1000)
        : item.comm_msg_info
          ? new Date(
              ((item.comm_msg_info as Record<string, unknown>).datetime as number) * 1000,
            )
          : null,
    };
  }
}

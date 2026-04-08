import { Injectable } from '@nestjs/common';
import { PlatformAdapter,  RawContent } from './platform-adapter.interface';

@Injectable()
export class XiaohongshuAdapter implements PlatformAdapter {
  platform = 'XIAOHONGSHU';

  normalizeUserPosts(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    // TikHub returns data.notes or data.items
    let items = data.notes as Record<string, unknown>[] | undefined;
    if (!Array.isArray(items)) {
      items = data.items as Record<string, unknown>[] | undefined;
    }
    if (!Array.isArray(items)) return [];

    return items.map((item) => this.mapNote(item));
  }

  normalizeSearchResults(raw: unknown): RawContent[] {
    const data = (raw as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    if (!data) return [];

    const items = data.items as Record<string, unknown>[] | undefined;
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      // Search results may wrap in note_card
      const note = (item.note_card as Record<string, unknown>) ?? item;
      // Preserve the note id from the outer item if present
      if (!note.note_id && item.id) {
        note.note_id = item.id;
      }
      return this.mapNote(note);
    });
  }

  private mapNote(item: Record<string, unknown>): RawContent {
    const noteId = String(item.note_id ?? item.id ?? '');

    // Determine content type from type or note_type field
    const noteType = String(item.type ?? item.note_type ?? '').toLowerCase();
    const contentType: RawContent['contentType'] =
      noteType === 'video' ? 'VIDEO' : 'NOTE';

    const cover = item.cover as Record<string, unknown> | undefined;
    const coverUrl = cover?.url
      ? String(cover.url)
      : cover?.url_default
        ? String(cover.url_default)
        : item.cover_url
          ? String(item.cover_url)
          : null;

    const user = item.user as Record<string, unknown> | undefined;

    return {
      platform: this.platform,
      externalId: noteId,
      externalUrl: noteId
        ? `https://www.xiaohongshu.com/explore/${noteId}`
        : null,
      contentType,
      title: String(item.title ?? item.display_title ?? ''),
      description: item.desc ? String(item.desc) : null,
      coverUrl,
      authorName: user?.nickname
        ? String(user.nickname)
        : user?.nick_name
          ? String(user.nick_name)
          : null,
      authorPlatformId: user?.user_id
        ? String(user.user_id)
        : user?.userid
          ? String(user.userid)
          : null,
      publishedAt: item.time
        ? new Date((item.time as number) * 1000)
        : item.last_update_time
          ? new Date((item.last_update_time as number) * 1000)
          : null,
    };
  }
}

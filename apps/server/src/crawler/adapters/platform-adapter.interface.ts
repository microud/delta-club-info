export interface RawContent {
  platform: string;
  externalId: string;
  externalUrl: string | null;
  contentType: 'VIDEO' | 'NOTE' | 'ARTICLE';
  title: string;
  description: string | null;
  coverUrl: string | null;
  authorName: string | null;
  authorPlatformId: string | null;
  publishedAt: Date | null;
}

export interface PlatformAdapter {
  platform: string;
  normalizeUserPosts(raw: unknown): RawContent[];
  normalizeSearchResults(raw: unknown): RawContent[];
}

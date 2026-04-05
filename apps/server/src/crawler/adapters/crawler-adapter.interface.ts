export interface RawVideo {
  externalId: string;
  title: string;
  coverUrl: string;
  videoUrl: string;
  description?: string;
  authorName: string;
  authorId: string;
  publishedAt: Date;
}

export interface CrawlerAdapter {
  platform: 'BILIBILI' | 'DOUYIN';
  fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]>;
  searchVideos(keyword: string): Promise<RawVideo[]>;
}

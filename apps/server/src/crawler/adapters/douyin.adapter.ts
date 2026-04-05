import { Injectable, Logger } from '@nestjs/common';
import { CrawlerAdapter, RawVideo } from './crawler-adapter.interface';

@Injectable()
export class DouyinAdapter implements CrawlerAdapter {
  platform = 'DOUYIN' as const;
  private readonly logger = new Logger(DouyinAdapter.name);

  async fetchBloggerVideos(bloggerId: string): Promise<RawVideo[]> {
    this.logger.warn(`Douyin adapter not implemented, skipping blogger ${bloggerId}`);
    return [];
  }

  async searchVideos(keyword: string): Promise<RawVideo[]> {
    this.logger.warn(`Douyin adapter not implemented, skipping keyword "${keyword}"`);
    return [];
  }
}

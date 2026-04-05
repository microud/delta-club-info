import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';
import { CrawlTaskService } from './crawl-task.service';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    CrawlerService,
    CrawlTaskService,
    BilibiliAdapter,
    DouyinAdapter,
    SystemConfigsService,
  ],
  exports: [CrawlerService, CrawlTaskService],
})
export class CrawlerModule {}

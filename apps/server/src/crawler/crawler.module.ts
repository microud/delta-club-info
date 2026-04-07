import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CrawlerService } from './crawler.service';
import { CrawlerSchedulerService } from './crawler-scheduler.service';
import { CrawlTaskService } from './crawl-task.service';
import { TikHubClient } from './tikhub.client';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { XiaohongshuAdapter } from './adapters/xiaohongshu.adapter';
import { WechatChannelsAdapter } from './adapters/wechat-channels.adapter';
import { WechatMpAdapter } from './adapters/wechat-mp.adapter';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    CrawlerService,
    CrawlerSchedulerService,
    CrawlTaskService,
    TikHubClient,
    BilibiliAdapter,
    DouyinAdapter,
    XiaohongshuAdapter,
    WechatChannelsAdapter,
    WechatMpAdapter,
  ],
  exports: [CrawlerService, CrawlTaskService, CrawlerSchedulerService],
})
export class CrawlerModule {}

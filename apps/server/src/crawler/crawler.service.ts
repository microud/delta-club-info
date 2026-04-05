import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { CrawlerAdapter, RawVideo } from './adapters/crawler-adapter.interface';
import { CrawlTaskService } from './crawl-task.service';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

const INTERVAL_NAME = 'crawler-interval';
const DEFAULT_FREQUENCY_MINUTES = 60;

@Injectable()
export class CrawlerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly adapters: Map<string, CrawlerAdapter>;
  private isRunning = false;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly crawlTaskService: CrawlTaskService,
    private readonly systemConfigsService: SystemConfigsService,
    bilibiliAdapter: BilibiliAdapter,
    douyinAdapter: DouyinAdapter,
  ) {
    this.adapters = new Map<string, CrawlerAdapter>([
      ['BILIBILI', bilibiliAdapter],
      ['DOUYIN', douyinAdapter],
    ]);
  }

  async onModuleInit() {
    await this.registerInterval();
  }

  async getFrequency(): Promise<number> {
    const raw = await this.systemConfigsService.getValue('crawler.frequency');
    return raw ? parseInt(raw, 10) || DEFAULT_FREQUENCY_MINUTES : DEFAULT_FREQUENCY_MINUTES;
  }

  async registerInterval() {
    try {
      this.schedulerRegistry.deleteInterval(INTERVAL_NAME);
    } catch {
      // No existing interval
    }

    const raw = await this.systemConfigsService.getValue('crawler.frequency');
    const minutes = raw ? parseInt(raw, 10) : DEFAULT_FREQUENCY_MINUTES;
    const ms = (isNaN(minutes) || minutes < 1 ? DEFAULT_FREQUENCY_MINUTES : minutes) * 60 * 1000;

    const interval = setInterval(() => this.runAll(), ms);
    this.schedulerRegistry.addInterval(INTERVAL_NAME, interval);
    this.logger.log(`Crawler scheduled every ${ms / 60000} minutes`);
  }

  async updateFrequency(minutes: number) {
    await this.systemConfigsService.upsert(
      'crawler.frequency',
      String(minutes),
      '爬虫抓取频率（分钟）',
    );
    await this.registerInterval();
  }

  async runAll() {
    if (this.isRunning) {
      this.logger.warn('Crawler already running, skipping');
      return;
    }
    this.isRunning = true;
    try {
      await this.runBloggerCrawl();
      await this.runKeywordCrawl();
    } finally {
      this.isRunning = false;
    }
  }

  private async runBloggerCrawl() {
    const activeBloggers = await this.db
      .select()
      .from(schema.bloggers)
      .where(eq(schema.bloggers.isActive, true));

    for (const blogger of activeBloggers) {
      const task = await this.crawlTaskService.createTask('BLOGGER', blogger.externalId);
      try {
        const adapter = this.adapters.get(blogger.platform);
        if (!adapter) {
          await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, `No adapter for ${blogger.platform}`);
          continue;
        }

        const rawVideos = await adapter.fetchBloggerVideos(blogger.externalId);
        const count = await this.saveVideos(rawVideos, blogger.platform as 'BILIBILI' | 'DOUYIN', 'REVIEW');
        await this.crawlTaskService.finishTask(task.id, 'SUCCESS', count);
        this.logger.log(`BloggerCrawl: ${blogger.name} → ${count} new videos`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, msg);
        this.logger.error(`BloggerCrawl failed for ${blogger.name}`, error);
      }
    }
  }

  private async runKeywordCrawl() {
    const publishedClubs = await this.db
      .select({ id: schema.clubs.id, name: schema.clubs.name })
      .from(schema.clubs)
      .where(eq(schema.clubs.status, 'published'));

    for (const club of publishedClubs) {
      const task = await this.crawlTaskService.createTask('KEYWORD', club.name);
      try {
        const adapter = this.adapters.get('BILIBILI');
        if (!adapter) {
          await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, 'No BILIBILI adapter');
          continue;
        }

        const rawVideos = await adapter.searchVideos(club.name);
        const count = await this.saveVideos(rawVideos, 'BILIBILI', 'SENTIMENT');
        await this.crawlTaskService.finishTask(task.id, 'SUCCESS', count);
        this.logger.log(`KeywordCrawl: "${club.name}" → ${count} new videos`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await this.crawlTaskService.finishTask(task.id, 'FAILED', 0, msg);
        this.logger.error(`KeywordCrawl failed for "${club.name}"`, error);
      }
    }
  }

  private async saveVideos(
    rawVideos: RawVideo[],
    platform: 'BILIBILI' | 'DOUYIN',
    category: 'REVIEW' | 'SENTIMENT',
  ): Promise<number> {
    let count = 0;
    for (const raw of rawVideos) {
      try {
        await this.db
          .insert(schema.videos)
          .values({
            platform,
            externalId: raw.externalId,
            title: raw.title,
            coverUrl: raw.coverUrl,
            videoUrl: raw.videoUrl,
            description: raw.description ?? null,
            authorName: raw.authorName,
            authorId: raw.authorId,
            category,
            publishedAt: raw.publishedAt,
          })
          .onConflictDoNothing({
            target: [schema.videos.platform, schema.videos.externalId],
          });
        count++;
      } catch (error) {
        this.logger.debug(`Video ${raw.externalId} already exists, skipping`);
      }
    }
    return count;
  }
}

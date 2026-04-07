import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { TikHubClient } from './tikhub.client';
import { CrawlTaskService } from './crawl-task.service';
import { PlatformAdapter, RawContent } from './adapters/platform-adapter.interface';
import { BilibiliAdapter } from './adapters/bilibili.adapter';
import { DouyinAdapter } from './adapters/douyin.adapter';
import { XiaohongshuAdapter } from './adapters/xiaohongshu.adapter';
import { WechatChannelsAdapter } from './adapters/wechat-channels.adapter';
import { WechatMpAdapter } from './adapters/wechat-mp.adapter';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly adapters: Map<string, PlatformAdapter>;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly tikHub: TikHubClient,
    private readonly crawlTaskService: CrawlTaskService,
    private readonly bilibiliAdapter: BilibiliAdapter,
    private readonly douyinAdapter: DouyinAdapter,
    private readonly xiaohongshuAdapter: XiaohongshuAdapter,
    private readonly wechatChannelsAdapter: WechatChannelsAdapter,
    private readonly wechatMpAdapter: WechatMpAdapter,
  ) {
    this.adapters = new Map<string, PlatformAdapter>([
      ['BILIBILI', bilibiliAdapter],
      ['DOUYIN', douyinAdapter],
      ['XIAOHONGSHU', xiaohongshuAdapter],
      ['WECHAT_CHANNELS', wechatChannelsAdapter],
      ['WECHAT_MP', wechatMpAdapter],
    ]);
  }

  async executeTask(taskId: string) {
    const task = await this.crawlTaskService.getTask(taskId);
    if (!task) {
      this.logger.error(`Task ${taskId} not found`);
      return;
    }

    const run = await this.crawlTaskService.createRun(task.id);

    try {
      let rawContents: RawContent[];

      switch (task.taskType) {
        case 'BLOGGER_POSTS':
          rawContents = await this.fetchBloggerPosts(task);
          break;
        case 'KEYWORD_SEARCH':
          rawContents = await this.searchByKeyword(task);
          break;
        case 'MP_ARTICLES':
          rawContents = await this.fetchMpArticles(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      const itemsCreated = await this.saveContents(rawContents, task.category);

      await this.crawlTaskService.finishRun(run.id, {
        status: 'SUCCESS',
        itemsFetched: rawContents.length,
        itemsCreated,
      });
      await this.crawlTaskService.updateTaskLastRun(task.id);

      this.logger.log(
        `Task ${task.id} (${task.taskType}): fetched=${rawContents.length}, created=${itemsCreated}`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.crawlTaskService.finishRun(run.id, {
        status: 'FAILED',
        itemsFetched: 0,
        itemsCreated: 0,
        errorMessage: msg,
      });
      await this.crawlTaskService.updateTaskLastRun(task.id);
      this.logger.error(`Task ${task.id} failed: ${msg}`, error);
    }
  }

  private async fetchBloggerPosts(
    task: typeof schema.crawlTasks.$inferSelect,
  ): Promise<RawContent[]> {
    const [account] = await this.db
      .select()
      .from(schema.bloggerAccounts)
      .where(eq(schema.bloggerAccounts.id, task.targetId));

    if (!account) {
      throw new Error(`BloggerAccount not found: ${task.targetId}`);
    }

    const adapter = this.adapters.get(task.platform);
    if (!adapter) {
      throw new Error(`No adapter for platform: ${task.platform}`);
    }

    let rawData: unknown;
    switch (task.platform) {
      case 'BILIBILI':
        rawData = await this.tikHub.fetchBilibiliUserPosts(account.platformUserId);
        break;
      case 'DOUYIN':
        rawData = await this.tikHub.fetchDouyinUserPosts(account.platformUserId);
        break;
      case 'XIAOHONGSHU':
        rawData = await this.tikHub.fetchXiaohongshuUserNotes(account.platformUserId);
        break;
      case 'WECHAT_CHANNELS':
        rawData = await this.tikHub.fetchWechatChannelsUserPosts(account.platformUserId);
        break;
      default:
        throw new Error(`Platform ${task.platform} does not support BLOGGER_POSTS`);
    }

    const contents = adapter.normalizeUserPosts(rawData);

    // Update account lastCrawledAt
    await this.db
      .update(schema.bloggerAccounts)
      .set({ lastCrawledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.bloggerAccounts.id, account.id));

    return contents;
  }

  private async searchByKeyword(
    task: typeof schema.crawlTasks.$inferSelect,
  ): Promise<RawContent[]> {
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, task.targetId));

    if (!club) {
      throw new Error(`Club not found: ${task.targetId}`);
    }

    const adapter = this.adapters.get(task.platform);
    if (!adapter) {
      throw new Error(`No adapter for platform: ${task.platform}`);
    }

    let rawData: unknown;
    switch (task.platform) {
      case 'BILIBILI':
        rawData = await this.tikHub.searchBilibiliVideos(club.name);
        break;
      case 'DOUYIN':
        rawData = await this.tikHub.searchDouyinVideos(club.name);
        break;
      case 'XIAOHONGSHU':
        rawData = await this.tikHub.searchXiaohongshuNotes(club.name);
        break;
      case 'WECHAT_CHANNELS':
        rawData = await this.tikHub.searchWechatChannelsVideos(club.name);
        break;
      default:
        throw new Error(`Platform ${task.platform} does not support KEYWORD_SEARCH`);
    }

    return adapter.normalizeSearchResults(rawData);
  }

  private async fetchMpArticles(
    task: typeof schema.crawlTasks.$inferSelect,
  ): Promise<RawContent[]> {
    const [club] = await this.db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, task.targetId));

    if (!club) {
      throw new Error(`Club not found: ${task.targetId}`);
    }

    if (!club.wechatMpGhid) {
      throw new Error(`Club ${club.name} has no wechatMpGhid configured`);
    }

    const rawData = await this.tikHub.fetchWechatMpArticles(club.wechatMpGhid);
    return this.wechatMpAdapter.normalizeUserPosts(rawData);
  }

  private async saveContents(
    rawContents: RawContent[],
    category: string,
  ): Promise<number> {
    let created = 0;

    for (const raw of rawContents) {
      try {
        const result = await this.db
          .insert(schema.contents)
          .values({
            platform: raw.platform as typeof schema.contents.$inferInsert.platform,
            contentType: raw.contentType,
            category: category as typeof schema.contents.$inferInsert.category,
            externalId: raw.externalId,
            externalUrl: raw.externalUrl,
            title: raw.title,
            description: raw.description,
            coverUrl: raw.coverUrl,
            authorName: raw.authorName,
            publishedAt: raw.publishedAt,
          })
          .onConflictDoNothing({
            target: [schema.contents.platform, schema.contents.externalId],
          })
          .returning({ id: schema.contents.id });

        if (result.length > 0) {
          created++;
        }
      } catch (error) {
        this.logger.debug(
          `Failed to insert content ${raw.externalId}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    return created;
  }
}

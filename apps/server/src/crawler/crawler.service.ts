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

  async executeTask(taskId: string, fullSync = false) {
    const task = await this.crawlTaskService.getTask(taskId);
    if (!task) {
      this.logger.error(`Task ${taskId} not found`);
      return;
    }

    const run = await this.crawlTaskService.createRun(task.id);

    try {
      let result: { rawContents: RawContent[]; itemsCreated: number };

      switch (task.taskType) {
        case 'BLOGGER_POSTS':
          result = await this.fetchBloggerPosts(task, fullSync);
          break;
        case 'KEYWORD_SEARCH': {
          const contents = await this.searchByKeyword(task);
          const created = await this.saveContents(contents, task.category);
          result = { rawContents: contents, itemsCreated: created };
          break;
        }
        case 'MP_ARTICLES': {
          const contents = await this.fetchMpArticles(task);
          const created = await this.saveContents(contents, task.category);
          result = { rawContents: contents, itemsCreated: created };
          break;
        }
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      await this.crawlTaskService.finishRun(run.id, {
        status: 'SUCCESS',
        itemsFetched: result.rawContents.length,
        itemsCreated: result.itemsCreated,
      });
      await this.crawlTaskService.updateTaskLastRun(task.id);

      this.logger.log(
        `Task ${task.id} (${task.taskType}): fetched=${result.rawContents.length}, created=${result.itemsCreated}, mode=${fullSync ? 'full' : 'incremental'}`,
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
    fullSync: boolean,
  ): Promise<{ rawContents: RawContent[]; itemsCreated: number }> {
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

    let result: { rawContents: RawContent[]; itemsCreated: number };

    if (task.platform === 'BILIBILI') {
      result = await this.fetchBilibiliUserPostsPaginated(
        account.platformUserId,
        task.category,
        fullSync,
      );
    } else {
      let rawData: unknown;
      switch (task.platform) {
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
      const created = await this.saveContents(contents, task.category);
      result = { rawContents: contents, itemsCreated: created };
    }

    // Update account lastCrawledAt
    await this.db
      .update(schema.bloggerAccounts)
      .set({ lastCrawledAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.bloggerAccounts.id, account.id));

    return result;
  }

  /**
   * Fetch Bilibili user posts with pagination.
   * - Full sync: traverse all pages
   * - Incremental sync: stop when a page yields no new items (all already exist)
   */
  private async fetchBilibiliUserPostsPaginated(
    uid: string,
    category: string,
    fullSync: boolean,
  ): Promise<{ rawContents: RawContent[]; itemsCreated: number }> {
    const allContents: RawContent[] = [];
    let totalCreated = 0;
    let page = 1;

    while (true) {
      const rawData = await this.tikHub.fetchBilibiliUserPosts(uid, page);
      const contents = this.bilibiliAdapter.normalizeUserPosts(rawData);

      if (contents.length === 0) break;

      allContents.push(...contents);
      const created = await this.saveContents(contents, category);
      totalCreated += created;

      // Incremental: stop when all items on this page already exist
      if (!fullSync && created === 0) {
        this.logger.log(
          `Bilibili incremental sync: page ${page} has no new items, stopping`,
        );
        break;
      }

      page++;
      this.logger.debug(`Bilibili pagination: fetching page ${page}`);
    }

    return { rawContents: allContents, itemsCreated: totalCreated };
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

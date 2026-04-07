import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

interface TikHubConfig {
  apiKey: string;
  baseUrl: string;
  rateLimit: number; // minimum interval between requests in ms
}

@Injectable()
export class TikHubClient {
  private readonly logger = new Logger(TikHubClient.name);
  private client: AxiosInstance | null = null;
  private config: TikHubConfig | null = null;
  private lastRequestTime = 0;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Lazy initialization: read config from system_configs on first use.
   */
  private async ensureClient(): Promise<AxiosInstance> {
    if (this.client && this.config) {
      return this.client;
    }

    const rows = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, 'tikhub.apiKey'));
    const apiKey = rows[0]?.value;
    if (!apiKey) {
      throw new Error('TikHub API key not configured in system_configs (key: tikhub.apiKey)');
    }

    const baseUrlRows = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, 'tikhub.baseUrl'));
    const baseUrl = baseUrlRows[0]?.value || 'https://api.tikhub.io';

    const rateLimitRows = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, 'tikhub.rateLimit'));
    const rateLimit = rateLimitRows[0]?.value
      ? parseInt(rateLimitRows[0].value, 10)
      : 500;

    this.config = { apiKey, baseUrl, rateLimit };
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`TikHub client initialized with baseUrl: ${baseUrl}`);
    return this.client;
  }

  /**
   * Token-bucket style rate limiting: ensure minimum interval between requests.
   */
  private async waitForRateLimit(): Promise<void> {
    if (!this.config) return;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.config.rateLimit) {
      const delay = this.config.rateLimit - elapsed;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Execute a request with rate limiting and retry logic.
   */
  private async request<T = unknown>(
    method: 'GET' | 'POST',
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const client = await this.ensureClient();
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await this.waitForRateLimit();

      try {
        const response =
          method === 'GET'
            ? await client.get<T>(url, config)
            : await client.post<T>(url, config?.data, config);
        return response.data;
      } catch (error: unknown) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const isRetryable = status === 429 || (status !== undefined && status >= 500);

        if (isRetryable && attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          this.logger.warn(
            `TikHub request failed (status=${status}), retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        this.logger.error(`TikHub request failed: ${method} ${url}`, error);
        throw error;
      }
    }

    // Should not reach here, but TypeScript needs it
    throw new Error('Max retries exceeded');
  }

  // ─── 抖音 (Douyin) ──────────────────────────────────────────

  async fetchDouyinUserPosts(
    secUserId: string,
    maxCursor?: number,
    count?: number,
  ): Promise<unknown> {
    return this.request('GET', '/api/v1/douyin/app/v3/fetch_user_post_videos', {
      params: {
        sec_user_id: secUserId,
        ...(maxCursor !== undefined && { max_cursor: maxCursor }),
        ...(count !== undefined && { count }),
      },
    });
  }

  async searchDouyinVideos(
    keyword: string,
    cursor?: number,
    sortType?: string,
  ): Promise<unknown> {
    return this.request('POST', '/api/v1/douyin/search/fetch_video_search_v2', {
      data: {
        keyword,
        ...(cursor !== undefined && { cursor }),
        ...(sortType !== undefined && { sort_type: sortType }),
      },
    });
  }

  // ─── B站 (Bilibili) ──────────────────────────────────────────

  async fetchBilibiliUserPosts(
    uid: string,
    pn?: number,
  ): Promise<unknown> {
    const params = { uid, pn: pn ?? 1 };
    this.logger.log(`fetchBilibiliUserPosts request: ${JSON.stringify(params)}`);
    const data = await this.request('GET', '/api/v1/bilibili/web/fetch_user_post_videos', {
      params,
    });
    this.logger.log(`fetchBilibiliUserPosts response: ${JSON.stringify(data)}`);
    return data;
  }

  async searchBilibiliVideos(
    keyword: string,
    page?: number,
    pageSize?: number,
  ): Promise<unknown> {
    return this.request('GET', '/api/v1/bilibili/web/fetch_general_search', {
      params: {
        keyword,
        order: 'totalrank',
        page: page ?? 1,
        page_size: pageSize ?? 20,
      },
    });
  }

  // ─── 小红书 (Xiaohongshu) ────────────────────────────────────

  async fetchXiaohongshuUserNotes(
    userId: string,
    cursor?: string,
  ): Promise<unknown> {
    return this.request('GET', '/api/v1/xiaohongshu/web_v3/fetch_user_notes', {
      params: {
        user_id: userId,
        ...(cursor !== undefined && { cursor }),
      },
    });
  }

  async searchXiaohongshuNotes(
    keyword: string,
    page?: number,
  ): Promise<unknown> {
    return this.request('GET', '/api/v1/xiaohongshu/web_v3/fetch_search_notes', {
      params: {
        keyword,
        ...(page !== undefined && { page }),
      },
    });
  }

  // ─── 微信视频号 (Wechat Channels) ────────────────────────────

  async fetchWechatChannelsUserPosts(
    username: string,
    lastBuffer?: string,
  ): Promise<unknown> {
    return this.request('POST', '/api/v1/wechat_channels/fetch_home_page', {
      data: {
        username,
        ...(lastBuffer !== undefined && { last_buffer: lastBuffer }),
      },
    });
  }

  async searchWechatChannelsVideos(keywords: string): Promise<unknown> {
    return this.request('GET', '/api/v1/wechat_channels/fetch_search_latest', {
      params: { keywords },
    });
  }

  // ─── 微信公众号 (Wechat MP) ──────────────────────────────────

  async fetchWechatMpArticles(
    ghid: string,
    offset?: number,
  ): Promise<unknown> {
    return this.request('GET', '/api/v1/wechat_mp/web/fetch_mp_article_list', {
      params: {
        ghid,
        ...(offset !== undefined && { offset }),
      },
    });
  }
}

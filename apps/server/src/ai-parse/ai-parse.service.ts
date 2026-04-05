import { Injectable, Logger } from '@nestjs/common';
import { createXai } from '@ai-sdk/xai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { AiConfigsService } from '../admin/ai-configs/ai-configs.service';
import { StorageService } from '../storage/storage.service';

const parsedResultSchema = z.object({
  clubName: z.string().describe('俱乐部名称'),
  services: z.array(
    z.object({
      name: z.string().describe('服务类型名称，如"绝密趣味单"'),
      tiers: z.array(
        z.object({
          price: z.number().describe('价格（元）'),
          guarantee: z.string().describe('保底数值（万哈夫币），只提取数字部分，如788表示788万哈夫币'),
          note: z.string().optional().describe('附加说明，如"仅限一次"'),
        }),
      ),
    }),
  ),
  rules: z.array(
    z.object({
      content: z.string().describe('规则内容'),
      category: z.string().describe('规则分类，如"体验须知"、"炸单标准"'),
    }),
  ),
});

@Injectable()
export class AiParseService {
  private readonly logger = new Logger(AiParseService.name);

  constructor(
    private readonly configService: SystemConfigsService,
    private readonly aiConfigsService: AiConfigsService,
    private readonly storageService: StorageService,
  ) {}

  private createProvider(provider: string, apiKey: string, baseUrl: string | null) {
    switch (provider) {
      case 'xai':
        return createXai({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
      case 'openai':
        return createOpenAI({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
      case 'anthropic':
        return createAnthropic({ apiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
      case 'deepseek':
        return createOpenAI({
          apiKey,
          baseURL: baseUrl || 'https://api.deepseek.com',
        });
      default:
        throw new Error(`不支持的 AI 服务商: ${provider}`);
    }
  }

  async parseImages(imageKeys: string[], textContents: string[]) {
    const buffers: Buffer[] = [];
    for (const key of imageKeys) {
      const url = await this.storageService.getSignedUrl(key);
      const response = await fetch(url);
      buffers.push(Buffer.from(await response.arrayBuffer()));
    }
    return this.parseFromBuffers(buffers, textContents);
  }

  async parseFromBuffers(imageBuffers: Buffer[], textContents: string[]) {
    const aiConfigId = await this.configService.getValue('ai_parse.ai_config_id');
    if (!aiConfigId) throw new Error('未配置 AI 解析使用的 AI 配置，请在系统设置中绑定');

    const aiConfig = await this.aiConfigsService.findById(aiConfigId);
    const provider = this.createProvider(aiConfig.provider, aiConfig.apiKey, aiConfig.baseUrl);

    const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: Buffer }> = [];

    content.push({
      type: 'text',
      text: `你是一个游戏陪玩俱乐部价目表解析助手。请从以下图片和文本中提取俱乐部名称、服务类型及其价格档位、以及规则条款。
所有图片来自同一家俱乐部。请尽可能完整地提取所有信息。

重要提示：哈夫币在游戏中以"万"为单位展示。如果你识别到几十W、几百W、几十万、几百万哈夫币等，都是以万为单位。
请在保底数值中直接提取万为单位的数字，例如"788W"或"788万"应提取为 788，"50万"应提取为 50。`,
    });

    for (const buffer of imageBuffers) {
      content.push({ type: 'image', image: buffer });
    }

    if (textContents.length > 0) {
      content.push({
        type: 'text',
        text: `附带的文本消息：\n${textContents.join('\n---\n')}`,
      });
    }

    const { object } = await generateObject({
      model: provider(aiConfig.model),
      schema: parsedResultSchema,
      messages: [{ role: 'user', content }],
    });

    return object;
  }
}

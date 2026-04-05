import { Injectable, Logger } from '@nestjs/common';
import { createXai } from '@ai-sdk/xai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { StorageService } from '../storage/storage.service';

const parsedResultSchema = z.object({
  clubName: z.string().describe('俱乐部名称'),
  services: z.array(
    z.object({
      name: z.string().describe('服务类型名称，如"绝密趣味单"'),
      tiers: z.array(
        z.object({
          price: z.number().describe('价格（元）'),
          guarantee: z.string().describe('保底数值，如"788W"'),
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
    private readonly storageService: StorageService,
  ) {}

  async parseImages(imageKeys: string[], textContents: string[]) {
    const apiKey = await this.configService.getValue('xai.api_key');
    const model =
      (await this.configService.getValue('xai.model')) || 'grok-4-1-fast-non-reasoning';
    if (!apiKey) throw new Error('xAI API key not configured');

    const provider = createXai({ apiKey });

    const content: Array<{ type: 'text'; text: string } | { type: 'image'; image: Buffer }> = [];

    content.push({
      type: 'text',
      text: `你是一个游戏陪玩俱乐部价目表解析助手。请从以下图片和文本中提取俱乐部名称、服务类型及其价格档位、以及规则条款。
所有图片来自同一家俱乐部。请尽可能完整地提取所有信息。`,
    });

    // 添加图片
    for (const key of imageKeys) {
      const url = await this.storageService.getSignedUrl(key);
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      content.push({ type: 'image', image: buffer });
    }

    // 添加文本内容
    if (textContents.length > 0) {
      content.push({
        type: 'text',
        text: `附带的文本消息：\n${textContents.join('\n---\n')}`,
      });
    }

    const { object } = await generateObject({
      model: provider(model),
      schema: parsedResultSchema,
      messages: [{ role: 'user', content }],
    });

    return object;
  }
}

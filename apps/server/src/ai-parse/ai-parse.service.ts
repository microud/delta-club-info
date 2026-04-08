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
      text: `你是一个三角洲行动游戏陪玩俱乐部价目表解析助手。请从以下图片和文本中提取俱乐部名称、服务类型及其价格档位、以及规则条款。
所有图片来自同一家俱乐部。请仔细逐行解析，完整提取所有信息。

## 解析要求

1. **服务与档位**：一个服务类型（如"绝密趣味单"）通常包含多个价格档位，每个档位对应不同的价格（元）和保底哈夫币数额。请确保提取所有档位，不要合并或遗漏。
2. **哈夫币单位**：哈夫币在游戏中以"万"为单位展示。如果识别到数字后面带有 W、w、万 等后缀，都是万为单位。guarantee 字段只填数字部分，例如"788W"填 "788"，"50万"填 "50"。如果没有保底则填空字符串。
3. **价格（元）**：价格是人民币金额，通常是整数如 128、188、288 等，不要把哈夫币数值混入价格字段。
4. **逐行提取**：价目表通常是表格形式，每一行是一个档位。请逐行提取，不要跳过任何行。
5. **护航趣味单**：护航趣味玩法的服务因玩法多样、规则复杂，尽力解析即可。如果无法确定具体的价格档位或规则，可以将该部分留空或简化处理，不要强行猜测。重点确保跑刀、陪玩、护航体验单、护航标准单这四类服务的解析准确性。

## 输出示例

假设图片中有"绝密趣味单"包含 3 个档位：128元/788W、188元/1088W、288元/1588W，仅限一次，则输出：
- services[0].name = "绝密趣味单"
- services[0].tiers = [
    { price: 128, guarantee: "788", note: "仅限一次" },
    { price: 188, guarantee: "1088", note: "仅限一次" },
    { price: 288, guarantee: "1588", note: "仅限一次" }
  ]`,
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

    this.logger.log('AI parse result: %j', object);

    return object;
  }
}

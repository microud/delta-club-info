import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { AiParseService } from './ai-parse.service';

@Injectable()
export class ParseTaskService {
  private readonly logger = new Logger(ParseTaskService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    private readonly aiParseService: AiParseService,
  ) {}

  async findAll(status?: string) {
    const where = status
      ? eq(schema.parseTasks.status, status as 'pending' | 'parsing' | 'completed' | 'failed')
      : undefined;

    return this.db
      .select()
      .from(schema.parseTasks)
      .where(where)
      .orderBy(desc(schema.parseTasks.createdAt));
  }

  async findOne(id: string) {
    const [task] = await this.db
      .select()
      .from(schema.parseTasks)
      .where(eq(schema.parseTasks.id, id))
      .limit(1);

    if (!task) throw new NotFoundException('Parse task not found');

    // 获取关联消息
    const messageLinks = await this.db
      .select()
      .from(schema.parseTaskMessages)
      .where(eq(schema.parseTaskMessages.parseTaskId, id));

    const messageIds = messageLinks.map((l) => l.wechatMessageId);
    const messages =
      messageIds.length > 0
        ? await this.db
            .select()
            .from(schema.wechatMessages)
            .where(inArray(schema.wechatMessages.id, messageIds))
        : [];

    return { ...task, messages };
  }

  async triggerParse(taskId: string): Promise<void> {
    await this.db
      .update(schema.parseTasks)
      .set({ status: 'parsing', updatedAt: new Date() })
      .where(eq(schema.parseTasks.id, taskId));

    try {
      const { messages } = await this.findOne(taskId);

      const imageKeys = messages
        .filter((m) => m.msgType === 'image' && m.mediaUrl)
        .map((m) => m.mediaUrl!);

      const textContents = messages
        .filter((m) => m.msgType === 'text' && m.content)
        .map((m) => m.content!);

      if (imageKeys.length === 0 && textContents.length === 0) {
        throw new Error('No content to parse');
      }

      const result = await this.aiParseService.parseImages(imageKeys, textContents);

      await this.db
        .update(schema.parseTasks)
        .set({
          status: 'completed',
          parsedResult: result,
          updatedAt: new Date(),
        })
        .where(eq(schema.parseTasks.id, taskId));
    } catch (e) {
      this.logger.error(`Parse failed for task ${taskId}`, e);
      await this.db
        .update(schema.parseTasks)
        .set({
          status: 'failed',
          errorMessage: e instanceof Error ? e.message : String(e),
          updatedAt: new Date(),
        })
        .where(eq(schema.parseTasks.id, taskId));
    }
  }

  async confirmAndImport(taskId: string, clubId: string, editedResult?: Record<string, unknown>) {
    const task = await this.findOne(taskId);

    const result = editedResult || task.parsedResult;
    if (!result) throw new Error('No parsed result to import');

    await this.db
      .update(schema.parseTasks)
      .set({ clubId, updatedAt: new Date() })
      .where(eq(schema.parseTasks.id, taskId));

    return { success: true };
  }

  async retryParse(taskId: string): Promise<void> {
    await this.triggerParse(taskId);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

type CrawlTaskType = 'BLOGGER' | 'KEYWORD';
type CrawlTaskStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

@Injectable()
export class CrawlTaskService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createTask(type: CrawlTaskType, targetId: string) {
    const [task] = await this.db
      .insert(schema.crawlTasks)
      .values({ type, targetId })
      .returning();
    return task;
  }

  async finishTask(id: string, status: CrawlTaskStatus, videoCount: number, errorMessage?: string) {
    const [task] = await this.db
      .update(schema.crawlTasks)
      .set({
        status,
        finishedAt: new Date(),
        videoCount,
        errorMessage: errorMessage ?? null,
      })
      .where(eq(schema.crawlTasks.id, id))
      .returning();
    return task;
  }
}

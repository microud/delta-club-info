import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

@Injectable()
export class CrawlTaskService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async getActiveTasks() {
    return this.db
      .select()
      .from(schema.crawlTasks)
      .where(eq(schema.crawlTasks.isActive, true));
  }

  async getTask(taskId: string) {
    const [task] = await this.db
      .select()
      .from(schema.crawlTasks)
      .where(eq(schema.crawlTasks.id, taskId));
    return task ?? null;
  }

  async createRun(crawlTaskId: string) {
    const [run] = await this.db
      .insert(schema.crawlTaskRuns)
      .values({ crawlTaskId })
      .returning();
    return run;
  }

  async finishRun(
    runId: string,
    result: {
      status: 'SUCCESS' | 'FAILED';
      itemsFetched: number;
      itemsCreated: number;
      errorMessage?: string;
    },
  ) {
    const [run] = await this.db
      .update(schema.crawlTaskRuns)
      .set({
        status: result.status,
        finishedAt: new Date(),
        itemsFetched: result.itemsFetched,
        itemsCreated: result.itemsCreated,
        errorMessage: result.errorMessage ?? null,
      })
      .where(eq(schema.crawlTaskRuns.id, runId))
      .returning();
    return run;
  }

  async updateTaskLastRun(taskId: string) {
    const now = new Date();
    const [task] = await this.db
      .update(schema.crawlTasks)
      .set({ lastRunAt: now, updatedAt: now })
      .where(eq(schema.crawlTasks.id, taskId))
      .returning();
    return task;
  }
}

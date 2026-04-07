import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminCrawlTasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAllTasks() {
    return this.db
      .select()
      .from(schema.crawlTasks)
      .orderBy(desc(schema.crawlTasks.createdAt));
  }

  async findTaskRuns(taskId?: string) {
    const query = this.db
      .select()
      .from(schema.crawlTaskRuns)
      .orderBy(desc(schema.crawlTaskRuns.startedAt))
      .limit(100);

    if (taskId) {
      return query.where(eq(schema.crawlTaskRuns.crawlTaskId, taskId));
    }

    return query;
  }

  async updateTask(
    id: string,
    data: { cronExpression?: string; isActive?: boolean },
  ) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.cronExpression !== undefined)
      values.cronExpression = data.cronExpression;
    if (data.isActive !== undefined) values.isActive = data.isActive;

    const [task] = await this.db
      .update(schema.crawlTasks)
      .set(values)
      .where(eq(schema.crawlTasks.id, id))
      .returning();

    return task;
  }
}

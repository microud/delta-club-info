import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminCrawlTasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAllTasks() {
    const tasks = await this.db
      .select()
      .from(schema.crawlTasks)
      .orderBy(desc(schema.crawlTasks.createdAt));

    // Resolve target names: BLOGGER_POSTS → blogger name, KEYWORD_SEARCH/MP_ARTICLES → club name
    const bloggerAccountIds = tasks
      .filter((t) => t.taskType === 'BLOGGER_POSTS')
      .map((t) => t.targetId);
    const clubIds = tasks
      .filter((t) => t.taskType === 'KEYWORD_SEARCH' || t.taskType === 'MP_ARTICLES')
      .map((t) => t.targetId);

    const nameMap = new Map<string, string>();

    if (bloggerAccountIds.length > 0) {
      const accounts = await this.db
        .select({
          accountId: schema.bloggerAccounts.id,
          bloggerName: schema.bloggers.name,
          platformUsername: schema.bloggerAccounts.platformUsername,
        })
        .from(schema.bloggerAccounts)
        .innerJoin(schema.bloggers, eq(schema.bloggerAccounts.bloggerId, schema.bloggers.id))
        .where(inArray(schema.bloggerAccounts.id, bloggerAccountIds));
      for (const a of accounts) {
        nameMap.set(a.accountId, a.bloggerName + (a.platformUsername ? ` (${a.platformUsername})` : ''));
      }
    }

    if (clubIds.length > 0) {
      const clubRows = await this.db
        .select({ id: schema.clubs.id, name: schema.clubs.name })
        .from(schema.clubs)
        .where(inArray(schema.clubs.id, clubIds));
      for (const c of clubRows) {
        nameMap.set(c.id, c.name);
      }
    }

    return tasks.map((t) => ({
      ...t,
      targetName: nameMap.get(t.targetId) ?? null,
    }));
  }

async createTask(data: {
    taskType: string;
    category: string;
    platform: string;
    targetId: string;
    cronExpression?: string;
  }) {
    const [task] = await this.db
      .insert(schema.crawlTasks)
      .values({
        taskType: data.taskType as typeof schema.crawlTasks.$inferInsert.taskType,
        category: data.category,
        platform: data.platform as typeof schema.crawlTasks.$inferInsert.platform,
        targetId: data.targetId,
        cronExpression: data.cronExpression ?? '0 */1 * * *',
      })
      .returning();
    return task;
  }

  async deleteTask(id: string) {
    const [task] = await this.db
      .delete(schema.crawlTasks)
      .where(eq(schema.crawlTasks.id, id))
      .returning();
    return task;
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
    data: {
      taskType?: string;
      category?: string;
      platform?: string;
      targetId?: string;
      cronExpression?: string;
      isActive?: boolean;
    },
  ) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.taskType !== undefined) values.taskType = data.taskType;
    if (data.category !== undefined) values.category = data.category;
    if (data.platform !== undefined) values.platform = data.platform;
    if (data.targetId !== undefined) values.targetId = data.targetId;
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

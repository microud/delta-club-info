import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, inArray, and } from 'drizzle-orm';
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

  async findTasksByTarget(taskType: string, targetIds: string[]) {
    let resolvedTargetIds = targetIds;

    // For BLOGGER_POSTS, targetIds are blogger IDs — resolve to blogger_account IDs
    if (taskType === 'BLOGGER_POSTS' && targetIds.length > 0) {
      const accounts = await this.db
        .select({ id: schema.bloggerAccounts.id })
        .from(schema.bloggerAccounts)
        .where(inArray(schema.bloggerAccounts.bloggerId, targetIds));
      resolvedTargetIds = accounts.map((a) => a.id);
    }

    if (resolvedTargetIds.length === 0) return [];

    return this.db
      .select()
      .from(schema.crawlTasks)
      .where(
        and(
          eq(schema.crawlTasks.taskType, taskType as any),
          inArray(schema.crawlTasks.targetId, resolvedTargetIds),
        ),
      );
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

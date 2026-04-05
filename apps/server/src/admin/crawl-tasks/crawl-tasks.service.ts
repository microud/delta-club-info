import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class AdminCrawlTasksService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db
      .select()
      .from(schema.crawlTasks)
      .orderBy(desc(schema.crawlTasks.startedAt))
      .limit(100);
  }
}

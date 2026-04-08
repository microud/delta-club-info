import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class SystemConfigsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll() {
    return this.db.select().from(schema.systemConfigs);
  }

  async getValue(key: string): Promise<string | null> {
    const [config] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key));
    return config?.value ?? null;
  }

  async upsert(key: string, value: string, description?: string) {
    const [existing] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.key, key));

    if (existing) {
      const [updated] = await this.db
        .update(schema.systemConfigs)
        .set({ value, updatedAt: new Date() })
        .where(eq(schema.systemConfigs.key, key))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(schema.systemConfigs)
      .values({ key, value, description })
      .returning();
    return created;
  }
}

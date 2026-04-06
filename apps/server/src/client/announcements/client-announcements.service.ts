import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.module';
import * as schema from '../../database/schema';

@Injectable()
export class ClientAnnouncementsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findOne(id: string) {
    const [announcement] = await this.db
      .select()
      .from(schema.announcements)
      .where(
        and(
          eq(schema.announcements.id, id),
          eq(schema.announcements.status, 'published'),
        ),
      )
      .limit(1);

    if (!announcement) throw new NotFoundException('Announcement not found');
    return announcement;
  }
}

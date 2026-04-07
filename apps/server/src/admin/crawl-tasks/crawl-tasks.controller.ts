import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminCrawlTasksService } from './crawl-tasks.service';
import { CrawlerService } from '../../crawler/crawler.service';
import { CrawlerSchedulerService } from '../../crawler/crawler-scheduler.service';

@Controller('admin/crawl-tasks')
@UseGuards(AdminGuard)
export class AdminCrawlTasksController {
  constructor(
    private readonly crawlTasksService: AdminCrawlTasksService,
    private readonly crawlerService: CrawlerService,
    private readonly crawlerSchedulerService: CrawlerSchedulerService,
  ) {}

  @Get()
  findAllTasks() {
    return this.crawlTasksService.findAllTasks();
  }

  @Get('runs')
  findRuns(@Query('taskId') taskId?: string) {
    return this.crawlTasksService.findTaskRuns(taskId);
  }

  @Post('batch-trigger')
  batchTrigger(@Body() body: { taskIds: string[] }) {
    for (const taskId of body.taskIds) {
      this.crawlerService.executeTask(taskId);
    }
    return { message: `${body.taskIds.length} crawl tasks triggered` };
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() body: { cronExpression?: string; isActive?: boolean },
  ) {
    const task = await this.crawlTasksService.updateTask(id, body);

    if (task) {
      if (body.isActive === false) {
        this.crawlerSchedulerService.unregisterTask(id);
      } else if (body.cronExpression || body.isActive === true) {
        this.crawlerSchedulerService.updateTaskSchedule(
          id,
          task.cronExpression,
        );
      }
    }

    return task;
  }

  @Post(':id/trigger')
  trigger(@Param('id') id: string) {
    // Fire-and-forget
    this.crawlerService.executeTask(id);
    return { message: 'Crawl task triggered' };
  }
}

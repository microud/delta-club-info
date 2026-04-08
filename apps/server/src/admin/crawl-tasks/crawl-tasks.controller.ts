import {
  Body,
  Controller,
  Delete,
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

  @Post()
  async createTask(
    @Body()
    body: {
      taskType: string;
      category: string;
      platform: string;
      targetId: string;
      cronExpression?: string;
    },
  ) {
    const task = await this.crawlTasksService.createTask(body);
    // Register cron job for the new task
    this.crawlerSchedulerService.registerTask(task.id, task.cronExpression);
    return task;
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    this.crawlerSchedulerService.unregisterTask(id);
    return this.crawlTasksService.deleteTask(id);
  }

@Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body()
    body: {
      taskType?: string;
      category?: string;
      platform?: string;
      targetId?: string;
      cronExpression?: string;
      isActive?: boolean;
    },
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
  trigger(@Param('id') id: string, @Body() body?: { fullSync?: boolean }) {
    // Fire-and-forget
    this.crawlerService.executeTask(id, body?.fullSync ?? false);
    return { message: 'Crawl task triggered' };
  }
}

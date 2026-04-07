import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CrawlerService } from './crawler.service';
import { CrawlTaskService } from './crawl-task.service';

@Injectable()
export class CrawlerSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(CrawlerSchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly crawlerService: CrawlerService,
    private readonly crawlTaskService: CrawlTaskService,
  ) {}

  async onModuleInit() {
    await this.loadAllTasks();
  }

  async loadAllTasks() {
    const tasks = await this.crawlTaskService.getActiveTasks();
    this.logger.log(`Loading ${tasks.length} active crawl tasks`);

    for (const task of tasks) {
      this.registerTask(task.id, task.cronExpression);
    }
  }

  registerTask(taskId: string, cronExpression: string) {
    const jobName = `crawl-task-${taskId}`;

    // Remove existing job if present
    try {
      this.schedulerRegistry.deleteCronJob(jobName);
    } catch {
      // Job doesn't exist yet, that's fine
    }

    const job = new CronJob(cronExpression, () => {
      this.logger.log(`Cron triggered for task ${taskId}`);
      this.crawlerService.executeTask(taskId).catch((err) => {
        this.logger.error(`Failed to execute task ${taskId}`, err);
      });
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(`Registered cron job for task ${taskId}: ${cronExpression}`);
  }

  unregisterTask(taskId: string) {
    const jobName = `crawl-task-${taskId}`;
    try {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Unregistered cron job for task ${taskId}`);
    } catch {
      this.logger.debug(`No cron job found for task ${taskId}`);
    }
  }

  updateTaskSchedule(taskId: string, cronExpression: string) {
    this.unregisterTask(taskId);
    this.registerTask(taskId, cronExpression);
  }
}

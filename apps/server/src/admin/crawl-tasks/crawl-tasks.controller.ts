import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminCrawlTasksService } from './crawl-tasks.service';
import { CrawlerService } from '../../crawler/crawler.service';

@Controller('admin/crawl-tasks')
@UseGuards(AdminGuard)
export class AdminCrawlTasksController {
  constructor(
    private readonly crawlTasksService: AdminCrawlTasksService,
    private readonly crawlerService: CrawlerService,
  ) {}

  @Get()
  findAll() {
    return this.crawlTasksService.findAll();
  }

  @Post('trigger')
  trigger() {
    this.crawlerService.runAll();
    return { message: 'Crawl triggered' };
  }

  @Get('frequency')
  async getFrequency() {
    return { frequency: await this.crawlerService.getFrequency() };
  }

  @Post('frequency')
  async updateFrequency(@Body() body: { frequency: number }) {
    await this.crawlerService.updateFrequency(body.frequency);
    return { frequency: body.frequency };
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { OverviewService } from './overview.service';

@Controller('admin/overview')
@UseGuards(AdminGuard)
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('ping')
  ping() {
    return this.overviewService.ping();
  }

  @Get('summary')
  getSummary() {
    return this.overviewService.getSummary();
  }

  @Get('todos')
  getTodos() {
    return this.overviewService.getTodos();
  }

  @Get('recent-contents')
  getRecentContents(@Query('limit') limit?: string) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50) : 10;
    return this.overviewService.getRecentContents(n);
  }

  @Get('business')
  getBusiness() {
    return this.overviewService.getBusiness();
  }
}

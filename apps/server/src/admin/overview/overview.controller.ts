import { Controller, Get, UseGuards } from '@nestjs/common';
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
}

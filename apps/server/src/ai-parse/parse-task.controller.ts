import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ParseTaskService } from './parse-task.service';
import { ConfirmParseDto } from './dto/confirm-parse.dto';

@Controller('admin/parse-tasks')
@UseGuards(AdminGuard)
export class ParseTaskController {
  constructor(private readonly parseTaskService: ParseTaskService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.parseTaskService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parseTaskService.findOne(id);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    this.parseTaskService.retryParse(id);
    return { message: 'Parse triggered' };
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmParseDto) {
    return this.parseTaskService.confirmAndImport(id, dto.clubId, dto.parsedResult);
  }
}

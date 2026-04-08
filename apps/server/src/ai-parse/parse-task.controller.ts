import { Controller, Get, Post, Param, Query, Body, UseGuards, Logger } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { type ParseTaskService } from './parse-task.service';
import { type ConfirmParseDto } from './dto/confirm-parse.dto';

@Controller('admin/parse-tasks')
@UseGuards(AdminGuard)
export class ParseTaskController {
  private readonly logger = new Logger(ParseTaskController.name);

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
  async retry(@Param('id') id: string) {
    // 先验证 task 存在
    await this.parseTaskService.findOne(id);
    // 异步触发解析
    this.parseTaskService.retryParse(id).catch((e) => {
      this.logger.error(`Retry parse failed for task ${id}`, e);
    });
    return { message: 'Parse triggered' };
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string, @Body() dto: ConfirmParseDto) {
    return this.parseTaskService.confirmAndImport(id, dto.clubId, dto.parsedResult);
  }
}

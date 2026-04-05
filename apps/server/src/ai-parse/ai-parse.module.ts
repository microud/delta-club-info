import { Module } from '@nestjs/common';
import { AiParseService } from './ai-parse.service';
import { ParseTaskService } from './parse-task.service';
import { ParseTaskController } from './parse-task.controller';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

@Module({
  controllers: [ParseTaskController],
  providers: [AiParseService, ParseTaskService, SystemConfigsService],
  exports: [ParseTaskService],
})
export class AiParseModule {}

import { Module } from '@nestjs/common';
import { AiParseService } from './ai-parse.service';
import { ParseTaskService } from './parse-task.service';
import { ParseTaskController } from './parse-task.controller';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';
import { AiConfigsService } from '../admin/ai-configs/ai-configs.service';

@Module({
  controllers: [ParseTaskController],
  providers: [AiParseService, ParseTaskService, SystemConfigsService, AiConfigsService],
  exports: [ParseTaskService, AiParseService],
})
export class AiParseModule {}

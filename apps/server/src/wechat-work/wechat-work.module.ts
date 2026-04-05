import { Module } from '@nestjs/common';
import { WechatWorkController } from './wechat-work.controller';
import { WechatWorkService } from './wechat-work.service';
import { SystemConfigsService } from '../admin/system-configs/system-configs.service';

@Module({
  controllers: [WechatWorkController],
  providers: [WechatWorkService, SystemConfigsService],
  exports: [WechatWorkService],
})
export class WechatWorkModule {}

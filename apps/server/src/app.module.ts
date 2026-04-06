import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { ClientModule } from './client/client.module';
import { CrawlerModule } from './crawler/crawler.module';
import { WechatWorkModule } from './wechat-work/wechat-work.module';
import { AiParseModule } from './ai-parse/ai-parse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    StorageModule,
    AdminModule,
    ClientModule,
    CrawlerModule,
    WechatWorkModule,
    AiParseModule,
  ],
})
export class AppModule {}

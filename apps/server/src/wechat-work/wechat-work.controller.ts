import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { WechatWorkService } from './wechat-work.service';

@Controller('webhook/wechat-work')
export class WechatWorkController {
  constructor(private readonly wechatWorkService: WechatWorkService) {}

  // WeChat Work URL verification callback
  @Get()
  async verify(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
    @Res() res: Response,
  ) {
    try {
      const plainEchoStr = await this.wechatWorkService.verifyCallback(
        msgSignature,
        timestamp,
        nonce,
        echostr,
      );
      res.send(plainEchoStr);
    } catch (_e) {
      res.status(403).send('Verification failed');
    }
  }

  // Receive message callback
  @Post()
  @HttpCode(200)
  async receiveMessage(
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Body() body: string,
  ) {
    return this.wechatWorkService.handleMessage(
      msgSignature,
      timestamp,
      nonce,
      body,
    );
  }
}

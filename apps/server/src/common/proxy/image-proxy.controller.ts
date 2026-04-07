import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

@Controller('proxy')
export class ImageProxyController {
  @Get('image')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing url parameter');
    }

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          Referer: '',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const contentType =
        response.headers['content-type'] || 'image/jpeg';

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });

      return res.send(Buffer.from(response.data));
    } catch {
      return res.status(HttpStatus.BAD_GATEWAY).send('Failed to fetch image');
    }
  }
}

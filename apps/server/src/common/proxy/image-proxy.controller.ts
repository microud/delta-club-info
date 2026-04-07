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
      // Upgrade HTTP to HTTPS for CDNs that support it
      const fetchUrl = url.replace(/^http:\/\//, 'https://');

      // Derive Referer from the image host to bypass hotlink protection
      const hostname = new URL(fetchUrl).hostname;
      const referer = `https://${hostname}/`;

      const response = await axios.get(fetchUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          Referer: referer,
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

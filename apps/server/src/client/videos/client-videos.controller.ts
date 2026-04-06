import { Controller, Get, Param } from '@nestjs/common';
import { ClientVideosService } from './client-videos.service';

@Controller('api/client/videos')
export class ClientVideosController {
  constructor(private readonly clientVideosService: ClientVideosService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientVideosService.findOne(id);
  }
}

import { Controller, Get, Param } from '@nestjs/common';
import { ClientContentsService } from './client-contents.service';

@Controller('api/client/contents')
export class ClientContentsController {
  constructor(private readonly clientContentsService: ClientContentsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientContentsService.findOne(id);
  }
}

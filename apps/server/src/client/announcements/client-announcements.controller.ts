import { Controller, Get, Param } from '@nestjs/common';
import { type ClientAnnouncementsService } from './client-announcements.service';

@Controller('api/client/announcements')
export class ClientAnnouncementsController {
  constructor(
    private readonly clientAnnouncementsService: ClientAnnouncementsService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientAnnouncementsService.findOne(id);
  }
}

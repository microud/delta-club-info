import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { type ClientClubsService } from './client-clubs.service';

@Controller('api/client/clubs')
export class ClientClubsController {
  constructor(private readonly clientClubsService: ClientClubsService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('keyword') keyword?: string,
    @Query('serviceTypes') serviceTypes?: string,
  ) {
    return this.clientClubsService.findAll(page, pageSize, keyword, serviceTypes);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientClubsService.findOne(id);
  }

  @Get(':id/services')
  findServices(@Param('id') id: string) {
    return this.clientClubsService.findServices(id);
  }

  @Get(':id/rules')
  findRules(@Param('id') id: string) {
    return this.clientClubsService.findRules(id);
  }

  @Get(':id/contents')
  findContents(
    @Param('id') id: string,
    @Query('type') type?: string,
  ) {
    return this.clientClubsService.findContents(id, type);
  }
}

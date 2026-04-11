import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ClientClubsService } from './client-clubs.service';

@Controller('api/client/clubs')
export class ClientClubsController {
  constructor(private readonly clientClubsService: ClientClubsService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('keyword') keyword?: string,
    @Query('serviceTypes') serviceTypes?: string,
    @Query('sortBy') sortBy?: string,
    @Query('minOperatingDays') minOperatingDays?: string,
    @Query('hasCompanyInfo') hasCompanyInfo?: string,
  ) {
    const validSortBy = sortBy === 'operatingDays' ? 'operatingDays' as const : undefined;
    const parsedDays = minOperatingDays ? parseInt(minOperatingDays, 10) : undefined;

    return this.clientClubsService.findAll(page, pageSize, keyword, serviceTypes, {
      sortBy: validSortBy,
      minOperatingDays: Number.isFinite(parsedDays) ? parsedDays : undefined,
      hasCompanyInfo: hasCompanyInfo === 'true' ? true : undefined,
    });
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

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ClubRulesService } from './club-rules.service';
import { CreateClubRuleDto } from './dto/create-club-rule.dto';
import { UpdateClubRuleDto } from './dto/update-club-rule.dto';

@Controller('admin/clubs/:clubId/rules')
@UseGuards(AdminGuard)
export class ClubRulesController {
  constructor(private readonly clubRulesService: ClubRulesService) {}

  @Get()
  findByClub(@Param('clubId') clubId: string) {
    return this.clubRulesService.findByClub(clubId);
  }

  @Post()
  create(
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubRuleDto,
  ) {
    return this.clubRulesService.create(clubId, dto);
  }

  @Put(':id')
  update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClubRuleDto,
  ) {
    return this.clubRulesService.update(clubId, id, dto);
  }

  @Delete(':id')
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.clubRulesService.remove(clubId, id);
  }
}

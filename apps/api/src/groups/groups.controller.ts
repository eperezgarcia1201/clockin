import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(AuthOrDevGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('officeId') officeId?: string,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return {
      groups: await this.groups.list(req.user, officeId?.trim() || undefined),
    };
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateGroupDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.groups.create(req.user, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    if (!req.user) throw new UnauthorizedException();
    return this.groups.update(req.user, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) throw new UnauthorizedException();
    return this.groups.remove(req.user, id);
  }
}

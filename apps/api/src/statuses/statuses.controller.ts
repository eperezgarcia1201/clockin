import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { CreateStatusDto } from './dto/create-status.dto';
import { StatusesService } from './statuses.service';

@Controller('statuses')
@UseGuards(AuthOrDevGuard)
export class StatusesController {
  constructor(private readonly statuses: StatusesService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    if (!req.user) throw new UnauthorizedException();
    return { statuses: await this.statuses.list(req.user) };
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateStatusDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.statuses.create(req.user, dto);
  }
}

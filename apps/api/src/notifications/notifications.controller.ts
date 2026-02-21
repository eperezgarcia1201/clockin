import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
import { CreateEmployeeMessageDto } from './dto/create-employee-message.dto';

@Controller('notifications')
@UseGuards(AuthOrDevGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
    @Query('unread') unread?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.notifications.list(req.user, {
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unread === '1' || unread === 'true',
    });
  }

  @Patch(':id/read')
  async markRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.notifications.markRead(req.user, id);
  }

  @Post('read-all')
  async markAllRead(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.notifications.markAllRead(req.user);
  }

  @Post('employee-message')
  async createEmployeeMessage(
    @Req() req: RequestWithUser,
    @Body() dto: CreateEmployeeMessageDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.notifications.createEmployeeMessage(req.user, dto);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { RegisterAdminDeviceDto } from './dto/register-admin-device.dto';
import { UpdateAdminDeviceDto } from './dto/update-admin-device.dto';
import { AdminDevicesService } from './admin-devices.service';

@Controller('admin-devices')
@UseGuards(AuthOrDevGuard)
export class AdminDevicesController {
  constructor(private readonly devices: AdminDevicesService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.list(req.user);
  }

  @Post()
  async register(
    @Req() req: RequestWithUser,
    @Body() body: RegisterAdminDeviceDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.register(req.user, body);
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: UpdateAdminDeviceDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.update(req.user, id, body);
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.remove(req.user, id);
  }
}

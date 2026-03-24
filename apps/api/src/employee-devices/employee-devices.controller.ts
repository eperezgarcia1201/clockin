import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { EmployeeDevicesService } from './employee-devices.service';
import { RegisterEmployeeDeviceDto } from './dto/register-employee-device.dto';

@Controller('employee-devices')
@UseGuards(AuthOrDevGuard)
export class EmployeeDevicesController {
  constructor(private readonly devices: EmployeeDevicesService) {}

  @Post()
  async register(
    @Req() req: RequestWithUser,
    @Body() body: RegisterEmployeeDeviceDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.register(req.user, body);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { AdminDevicesService } from "./admin-devices.service";

@Controller("admin-devices")
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
  async register(@Req() req: RequestWithUser, @Body() body: any) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.register(req.user, {
      expoPushToken: body.expoPushToken,
      label: body.label,
      platform: body.platform,
    });
  }

  @Delete(":id")
  async remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.devices.remove(req.user, id);
  }
}

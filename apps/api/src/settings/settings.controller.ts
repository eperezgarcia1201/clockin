import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { SettingsService } from "./settings.service";
import { UpdateSettingsDto } from "./dto/update-settings.dto";

@Controller("settings")
@UseGuards(AuthOrDevGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async get(@Req() req: RequestWithUser) {
    if (!req.user) {
      return {};
    }
    return this.settings.getSettings(req.user);
  }

  @Put()
  async update(@Req() req: RequestWithUser, @Body() dto: UpdateSettingsDto) {
    if (!req.user) {
      return {};
    }
    return this.settings.updateSettings(req.user, dto);
  }
}

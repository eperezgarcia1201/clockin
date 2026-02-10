import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { RequestWithUser } from "../auth/auth.types";
import { AuthOrDevGuard } from "../auth/auth.guard";
import { CreatePunchDto } from "./dto/create-punch.dto";
import { PunchesService } from "./punches.service";

@Controller("punches")
@UseGuards(AuthOrDevGuard)
export class PunchesController {
  constructor(private readonly punches: PunchesService) {}

  @Post()
  async createPunch(@Body() dto: CreatePunchDto, @Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.createPunch(req.user, dto, req.ip);
  }

  @Get("current")
  async getCurrent(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.getCurrentPunch(req.user);
  }
}

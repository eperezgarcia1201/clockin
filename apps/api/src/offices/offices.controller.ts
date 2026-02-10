import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { CreateOfficeDto } from "./dto/create-office.dto";
import { OfficesService } from "./offices.service";

@Controller("offices")
@UseGuards(AuthOrDevGuard)
export class OfficesController {
  constructor(private readonly offices: OfficesService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    if (!req.user) throw new UnauthorizedException();
    return { offices: await this.offices.list(req.user) };
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateOfficeDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.offices.create(req.user, dto);
  }
}

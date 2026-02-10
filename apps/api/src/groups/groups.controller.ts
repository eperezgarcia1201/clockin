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
import { CreateGroupDto } from "./dto/create-group.dto";
import { GroupsService } from "./groups.service";

@Controller("groups")
@UseGuards(AuthOrDevGuard)
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    if (!req.user) throw new UnauthorizedException();
    return { groups: await this.groups.list(req.user) };
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateGroupDto) {
    if (!req.user) throw new UnauthorizedException();
    return this.groups.create(req.user, dto);
  }
}

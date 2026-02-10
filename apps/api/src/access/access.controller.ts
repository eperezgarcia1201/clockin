import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { TenancyService } from "../tenancy/tenancy.service";

@Controller("access")
@UseGuards(AuthOrDevGuard)
export class AccessController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get("me")
  async getAccess(@Req() request: RequestWithUser) {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const { membership } = await this.tenancy.requireTenantAndUser(
      request.user,
    );

    const adminRoles: Role[] = [Role.OWNER, Role.ADMIN];
    const isAdmin = adminRoles.includes(membership.role);

    return {
      role: membership.role,
      status: membership.status,
      isAdmin,
    };
  }
}

import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { managerFeaturesToMap } from '../tenancy/manager-features';

@Controller('access')
@UseGuards(AuthOrDevGuard)
export class AccessController {
  constructor(private readonly tenancy: TenancyService) {}

  @Get('me')
  async getAccess(@Req() request: RequestWithUser) {
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const access = await this.tenancy.resolveAdminAccess(request.user);

    return {
      role: access.membership.role,
      status: access.membership.status,
      isAdmin: access.featurePermissions.length > 0,
      actorType: access.actorType,
      actorName: access.displayName,
      employeeId: access.employeeId,
      ownerClockExempt: access.ownerClockExempt,
      adminUsername: access.settings.adminUsername,
      multiLocationEnabled: access.settings.multiLocationEnabled,
      liquorInventoryEnabled: access.settings.liquorInventoryEnabled,
      premiumFeaturesEnabled: access.settings.premiumFeaturesEnabled,
      permissions: managerFeaturesToMap(access.featurePermissions),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { AuthUser } from '../auth/auth.types';

@Injectable()
export class AdminDevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const devices = await this.prisma.adminDevice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
    });
    return { devices };
  }

  async register(
    authUser: AuthUser,
    payload: { expoPushToken: string; label?: string; platform?: string },
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const device = await this.prisma.adminDevice.upsert({
      where: { expoPushToken: payload.expoPushToken },
      update: {
        tenantId: tenant.id,
        label: payload.label,
        platform: payload.platform,
      },
      create: {
        tenantId: tenant.id,
        expoPushToken: payload.expoPushToken,
        label: payload.label,
        platform: payload.platform,
      },
    });

    return { device };
  }

  async remove(authUser: AuthUser, id: string) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    await this.prisma.adminDevice.deleteMany({
      where: { id, tenantId: tenant.id },
    });
    return { ok: true };
  }
}

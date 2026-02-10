import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreatePunchDto } from "./dto/create-punch.dto";

@Injectable()
export class PunchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async createPunch(authUser: AuthUser, dto: CreatePunchDto, ipAddress?: string) {
    const { tenant, user } = await this.tenancy.requireTenantAndUser(authUser);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    return this.prisma.punch.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        type: dto.type,
        occurredAt,
        notes: dto.notes,
        latitude: dto.latitude,
        longitude: dto.longitude,
        deviceLabel: dto.deviceLabel,
        ipAddress,
      },
    });
  }

  async getCurrentPunch(authUser: AuthUser) {
    const { tenant, user } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.punch.findFirst({
      where: {
        tenantId: tenant.id,
        userId: user.id,
      },
      orderBy: {
        occurredAt: "desc",
      },
    });
  }
}

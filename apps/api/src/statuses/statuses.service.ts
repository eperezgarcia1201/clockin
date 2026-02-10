import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateStatusDto } from "./dto/create-status.dto";

@Injectable()
export class StatusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.punchStatus.findMany({
      where: { tenantId: tenant.id },
      orderBy: { label: "asc" },
    });
  }

  async create(authUser: AuthUser, dto: CreateStatusDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.punchStatus.create({
      data: {
        tenantId: tenant.id,
        label: dto.label,
        color: dto.color || "#2a4d8f",
        isIn: dto.isIn ?? false,
      },
    });
  }
}

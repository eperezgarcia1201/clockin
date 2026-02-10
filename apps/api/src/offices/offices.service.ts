import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateOfficeDto } from "./dto/create-office.dto";

@Injectable()
export class OfficesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.office.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    });
  }

  async create(authUser: AuthUser, dto: CreateOfficeDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.office.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
      },
    });
  }
}

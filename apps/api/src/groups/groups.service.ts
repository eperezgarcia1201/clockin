import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateGroupDto } from "./dto/create-group.dto";

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async list(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.group.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    });
  }

  async create(authUser: AuthUser, dto: CreateGroupDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    return this.prisma.group.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        officeId: dto.officeId || null,
      },
    });
  }
}

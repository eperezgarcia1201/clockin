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

  async list(authUser: AuthUser, officeId?: string) {
    const { tenant } = await this.tenancy.requireFeature(authUser, "groups");
    const scopedOfficeId = officeId?.trim() || undefined;

    return this.prisma.group.findMany({
      where: scopedOfficeId
        ? {
            tenantId: tenant.id,
            OR: [{ officeId: scopedOfficeId }, { officeId: null }],
          }
        : { tenantId: tenant.id },
      orderBy: { name: "asc" },
    });
  }

  async create(authUser: AuthUser, dto: CreateGroupDto) {
    const { tenant } = await this.tenancy.requireFeature(authUser, "groups");

    return this.prisma.group.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
        officeId: dto.officeId || null,
      },
    });
  }
}

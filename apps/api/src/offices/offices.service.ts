import { ForbiddenException, Injectable } from "@nestjs/common";
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
    const { tenant } = await this.tenancy.requireFeature(authUser, "locations");

    return this.prisma.office.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" },
    });
  }

  async create(authUser: AuthUser, dto: CreateOfficeDto) {
    const access = await this.tenancy.requireFeature(authUser, "locations");
    const { tenant } = access;

    if (!access.settings.multiLocationEnabled) {
      const locationCount = await this.prisma.office.count({
        where: { tenantId: tenant.id },
      });
      if (locationCount > 0) {
        throw new ForbiddenException(
          "Multi-location management is disabled for this tenant.",
        );
      }
    }

    return this.prisma.office.create({
      data: {
        tenantId: tenant.id,
        name: dto.name,
      },
    });
  }
}

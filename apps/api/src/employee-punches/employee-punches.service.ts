import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateEmployeePunchDto } from "./dto/create-employee-punch.dto";
import { compare } from "bcryptjs";
import type { ManualEmployeePunchDto } from "./dto/manual-employee-punch.dto";
import type { UpdateEmployeePunchDto } from "./dto/update-employee-punch.dto";

@Injectable()
export class EmployeePunchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async createPunch(
    authUser: AuthUser,
    employeeId: string,
    dto: CreateEmployeePunchDto,
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    const requirePin = settings?.requirePin ?? true;

    if (requirePin && employee.pinHash) {
      if (!dto.pin) {
        throw new UnauthorizedException("PIN required.");
      }
      const valid = await compare(dto.pin, employee.pinHash);
      if (!valid) {
        throw new UnauthorizedException("Invalid PIN.");
      }
    }

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();

    return this.prisma.employeePunch.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        type: dto.type,
        occurredAt,
        notes: dto.notes,
        ipAddress: dto.ipAddress,
      },
    });
  }

  async getRecent(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId: tenant.id,
        disabled: false,
      },
      orderBy: { fullName: "asc" },
      include: {
        office: { select: { name: true } },
        group: { select: { name: true } },
        punches: { orderBy: { occurredAt: "desc" }, take: 1 },
      },
    });

    return {
      rows: employees.map((employee) => {
        const latest = employee.punches[0];
        return {
          id: employee.id,
          name: employee.displayName || employee.fullName,
          status: latest?.type ?? null,
          occurredAt: latest?.occurredAt
            ? latest.occurredAt.toISOString()
            : null,
          office: employee.office?.name ?? null,
          group: employee.group?.name ?? null,
        };
      }),
    };
  }

  async listRecords(
    authUser: AuthUser,
    options: {
      employeeId?: string;
      limit?: number;
      from?: string;
      to?: string;
      tzOffset?: number;
    },
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const limit = options.limit && options.limit > 0 ? options.limit : 50;
    const offsetMs = (options.tzOffset || 0) * 60 * 1000;

    const occurredAt: { gte?: Date; lte?: Date } = {};
    if (options.from) {
      const startUtc =
        new Date(`${options.from}T00:00:00.000Z`).getTime() - offsetMs;
      occurredAt.gte = new Date(startUtc);
    }
    if (options.to) {
      const endUtc =
        new Date(`${options.to}T23:59:59.999Z`).getTime() - offsetMs;
      occurredAt.lte = new Date(endUtc);
    }

    const punches = await this.prisma.employeePunch.findMany({
      where: {
        tenantId: tenant.id,
        employeeId: options.employeeId || undefined,
        occurredAt: Object.keys(occurredAt).length ? occurredAt : undefined,
      },
      orderBy: { occurredAt: "desc" },
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            office: { select: { name: true } },
            group: { select: { name: true } },
          },
        },
      },
    });

    return {
      records: punches.map((punch) => ({
        id: punch.id,
        employeeId: punch.employeeId,
        employeeName:
          punch.employee.displayName || punch.employee.fullName,
        office: punch.employee.office?.name ?? null,
        group: punch.employee.group?.name ?? null,
        type: punch.type,
        occurredAt: punch.occurredAt.toISOString(),
        notes: punch.notes ?? "",
      })),
    };
  }

  async createManual(authUser: AuthUser, dto: ManualEmployeePunchDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException("Manual time edits disabled.");
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: tenant.id },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return this.prisma.employeePunch.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        type: dto.type,
        occurredAt: new Date(dto.occurredAt),
        notes: dto.notes,
      },
    });
  }

  async updateRecord(
    authUser: AuthUser,
    recordId: string,
    dto: UpdateEmployeePunchDto,
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException("Manual time edits disabled.");
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: { id: recordId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException("Record not found");
    }

    return this.prisma.employeePunch.update({
      where: { id: existing.id },
      data: {
        type: dto.type ?? undefined,
        occurredAt: dto.occurredAt
          ? new Date(dto.occurredAt)
          : undefined,
        notes: dto.notes ?? undefined,
      },
    });
  }

  async deleteRecord(authUser: AuthUser, recordId: string) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: tenant.id },
    });
    if (settings && settings.allowManualTimeEdits === false) {
      throw new UnauthorizedException("Manual time edits disabled.");
    }

    const existing = await this.prisma.employeePunch.findFirst({
      where: { id: recordId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException("Record not found");
    }

    await this.prisma.employeePunch.delete({ where: { id: existing.id } });
    return { ok: true };
  }
}

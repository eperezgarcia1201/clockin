import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import type { AuthUser } from "../auth/auth.types";
import type { CreateEmployeeDto } from "./dto/create-employee.dto";
import { hash } from "bcryptjs";
import type { UpdateEmployeeDto } from "./dto/update-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async listEmployees(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId: tenant.id },
      orderBy: { fullName: "asc" },
    });

    return employees.map((employee) => ({
      id: employee.id,
      name: employee.displayName || employee.fullName,
      active: !employee.disabled,
      email: employee.email,
      hourlyRate: employee.hourlyRate,
      officeId: employee.officeId,
      groupId: employee.groupId,
      isAdmin: employee.isAdmin,
      isTimeAdmin: employee.isTimeAdmin,
      isReports: employee.isReports,
    }));
  }

  async createEmployee(authUser: AuthUser, dto: CreateEmployeeDto) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const pinHash = dto.pin ? await hash(dto.pin, 10) : null;

    return this.prisma.employee.create({
      data: {
        tenantId: tenant.id,
        fullName: dto.fullName,
        displayName: dto.displayName,
        email: dto.email,
        pinHash,
        hourlyRate: dto.hourlyRate ?? null,
        officeId: dto.officeId || null,
        groupId: dto.groupId || null,
        isAdmin: dto.isAdmin ?? false,
        isTimeAdmin: dto.isTimeAdmin ?? false,
        isReports: dto.isReports ?? false,
        disabled: dto.disabled ?? false,
      },
    });
  }

  async getEmployee(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return {
      id: employee.id,
      fullName: employee.fullName,
      displayName: employee.displayName,
      email: employee.email,
      hourlyRate: employee.hourlyRate,
      officeId: employee.officeId,
      groupId: employee.groupId,
      isAdmin: employee.isAdmin,
      isTimeAdmin: employee.isTimeAdmin,
      isReports: employee.isReports,
      disabled: employee.disabled,
    };
  }

  async updateEmployee(
    authUser: AuthUser,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const existing = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException("Employee not found");
    }

    const data: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName || null;
    }
    if (dto.email !== undefined) {
      data.email = dto.email || null;
    }
    if (dto.hourlyRate !== undefined) {
      data.hourlyRate = dto.hourlyRate ?? null;
    }
    if (dto.officeId !== undefined) {
      data.officeId = dto.officeId || null;
    }
    if (dto.groupId !== undefined) {
      data.groupId = dto.groupId || null;
    }
    if (dto.isAdmin !== undefined) {
      data.isAdmin = dto.isAdmin;
    }
    if (dto.isTimeAdmin !== undefined) {
      data.isTimeAdmin = dto.isTimeAdmin;
    }
    if (dto.isReports !== undefined) {
      data.isReports = dto.isReports;
    }
    if (dto.disabled !== undefined) {
      data.disabled = dto.disabled;
    }
    if (dto.pin !== undefined) {
      data.pinHash = dto.pin ? await hash(dto.pin, 10) : null;
    }

    return this.prisma.employee.update({
      where: { id: existing.id },
      data,
    });
  }

  async deleteEmployee(authUser: AuthUser, employeeId: string) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const existing = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId: tenant.id },
    });

    if (!existing) {
      throw new NotFoundException("Employee not found");
    }

    return this.prisma.employee.update({
      where: { id: existing.id },
      data: { disabled: true },
    });
  }

  async getSummary(authUser: AuthUser) {
    const { tenant } = await this.tenancy.requireTenantAndUser(authUser);

    const [total, admins, timeAdmins, reports] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId: tenant.id } }),
      this.prisma.employee.count({
        where: { tenantId: tenant.id, isAdmin: true },
      }),
      this.prisma.employee.count({
        where: { tenantId: tenant.id, isTimeAdmin: true },
      }),
      this.prisma.employee.count({
        where: { tenantId: tenant.id, isReports: true },
      }),
    ]);

    return { total, admins, timeAdmins, reports };
  }
}

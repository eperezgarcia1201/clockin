import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { PunchType } from "@prisma/client";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(AuthOrDevGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("hours")
  async hoursReport(@Req() req: RequestWithUser, @Query() query: Record<string, string>) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException("from and to are required (YYYY-MM-DD)");
    }

    const roundMinutes = Number(query.round ?? 0);
    const tzOffset = Number(query.tzOffset ?? 0);
    const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
      ? roundMinutes
      : 0;

    return this.reports.getHoursReport(req.user, {
      from,
      to,
      roundMinutes: round,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      includeDetails: query.details === "1" || query.details === "true",
    });
  }

  @Get("daily")
  async dailyReport(@Req() req: RequestWithUser, @Query() query: Record<string, string>) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException("from and to are required (YYYY-MM-DD)");
    }

    const roundMinutes = Number(query.round ?? 0);
    const tzOffset = Number(query.tzOffset ?? 0);
    const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
      ? roundMinutes
      : 0;

    return this.reports.getDailyReport(req.user, {
      from,
      to,
      roundMinutes: round,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      includeDetails: true,
    });
  }

  @Get("payroll")
  async payrollReport(@Req() req: RequestWithUser, @Query() query: Record<string, string>) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException("from and to are required (YYYY-MM-DD)");
    }

    const roundMinutes = Number(query.round ?? 0);
    const tzOffset = Number(query.tzOffset ?? 0);
    const round = [0, 5, 10, 15, 20, 30].includes(roundMinutes)
      ? roundMinutes
      : 0;
    const weekStartsOn = [0, 1].includes(Number(query.weekStartsOn))
      ? Number(query.weekStartsOn)
      : 1;
    const overtimeThreshold = Number(query.overtimeThreshold ?? 40) || 40;

    return this.reports.getPayrollReport(req.user, {
      from,
      to,
      roundMinutes: round,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      includeDetails: false,
      weekStartsOn,
      overtimeThreshold,
    });
  }

  @Get("audit")
  async auditReport(@Req() req: RequestWithUser, @Query() query: Record<string, string>) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException("from and to are required (YYYY-MM-DD)");
    }

    const tzOffset = Number(query.tzOffset ?? 0);
    const limit = Number(query.limit ?? 200);
    const type = query.type && Object.values(PunchType).includes(query.type as PunchType)
      ? (query.type as PunchType)
      : undefined;

    return this.reports.getAuditReport(req.user, {
      from,
      to,
      tzOffset,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
      type,
      limit,
    });
  }

  @Get("tips")
  async tipsReport(@Req() req: RequestWithUser, @Query() query: Record<string, string>) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const from = query.from;
    const to = query.to;
    if (!from || !to) {
      throw new BadRequestException("from and to are required (YYYY-MM-DD)");
    }

    return this.reports.getTipsReport(req.user, {
      from,
      to,
      employeeId: query.employeeId || undefined,
      officeId: query.officeId || undefined,
      groupId: query.groupId || undefined,
    });
  }
}

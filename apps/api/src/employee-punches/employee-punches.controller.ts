import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  Delete,
  Query,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { EmployeePunchesService } from './employee-punches.service';
import { CreateEmployeePunchDto } from './dto/create-employee-punch.dto';
import { ManualEmployeePunchDto } from './dto/manual-employee-punch.dto';
import { UpdateEmployeePunchDto } from './dto/update-employee-punch.dto';

@Controller('employee-punches')
@UseGuards(AuthOrDevGuard)
export class EmployeePunchesController {
  constructor(private readonly punches: EmployeePunchesService) {}

  @Get('recent')
  async recent(@Req() req: RequestWithUser, @Query('officeId') officeId?: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.getRecent(req.user, {
      officeId: officeId?.trim() || undefined,
    });
  }

  @Get('records')
  async records(
    @Req() req: RequestWithUser,
    @Query('employeeId') employeeId?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tzOffset') tzOffset?: string,
    @Query('officeId') officeId?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.listRecords(req.user, {
      employeeId,
      limit: limit ? Number(limit) : undefined,
      from,
      to,
      tzOffset: tzOffset ? Number(tzOffset) : undefined,
      officeId: officeId?.trim() || undefined,
    });
  }

  @Post('records')
  async createManual(
    @Req() req: RequestWithUser,
    @Body() dto: ManualEmployeePunchDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.createManual(req.user, dto);
  }

  @Patch('schedule-overrides/:id/approve')
  async approveScheduleOverride(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.approveScheduleOverride(req.user, id);
  }

  @Patch('schedule-overrides/:id/reject')
  async rejectScheduleOverride(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.rejectScheduleOverride(req.user, id);
  }

  @Post(':employeeId')
  async create(
    @Req() req: RequestWithUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeePunchDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.createPunch(req.user, employeeId, dto);
  }

  @Patch('records/:id')
  async updateRecord(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeePunchDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.updateRecord(req.user, id, dto);
  }

  @Delete('records/:id')
  async deleteRecord(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.punches.deleteRecord(req.user, id);
  }
}

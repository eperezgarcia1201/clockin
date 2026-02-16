import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthOrDevGuard } from '../auth/auth.guard';
import type { RequestWithUser } from '../auth/auth.types';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(AuthOrDevGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('scope') scope?: string,
    @Query('officeId') officeId?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const employees = await this.employees.listEmployees(req.user, {
      includeDeleted: scope === 'deleted',
      officeId: officeId?.trim() || undefined,
    });
    return { employees };
  }

  @Get('summary')
  async summary(
    @Req() req: RequestWithUser,
    @Query('officeId') officeId?: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.getSummary(req.user, {
      officeId: officeId?.trim() || undefined,
    });
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateEmployeeDto) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.createEmployee(req.user, dto);
  }

  @Get(':id')
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.getEmployee(req.user, id);
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.updateEmployee(req.user, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.softDeleteEmployee(req.user, id);
  }

  @Patch(':id/restore')
  async restore(@Req() req: RequestWithUser, @Param('id') id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.restoreEmployee(req.user, id);
  }

  @Delete(':id/permanent')
  async removePermanently(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.deleteEmployeePermanently(req.user, id);
  }
}

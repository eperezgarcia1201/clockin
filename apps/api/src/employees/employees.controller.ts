import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@Controller("employees")
@UseGuards(AuthOrDevGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  async list(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const employees = await this.employees.listEmployees(req.user);
    return { employees };
  }

  @Get("summary")
  async summary(@Req() req: RequestWithUser) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.getSummary(req.user);
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateEmployeeDto) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.createEmployee(req.user, dto);
  }

  @Get(":id")
  async getOne(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.getEmployee(req.user, id);
  }

  @Patch(":id")
  async update(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.updateEmployee(req.user, id, dto);
  }

  @Delete(":id")
  async remove(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.employees.deleteEmployee(req.user, id);
  }
}

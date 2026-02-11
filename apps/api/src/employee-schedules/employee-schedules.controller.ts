import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthOrDevGuard } from "../auth/auth.guard";
import type { RequestWithUser } from "../auth/auth.types";
import { EmployeeSchedulesService } from "./employee-schedules.service";
import { UpdateEmployeeScheduleDto } from "./dto/update-employee-schedule.dto";

@Controller("employee-schedules")
@UseGuards(AuthOrDevGuard)
export class EmployeeSchedulesController {
  constructor(private readonly schedules: EmployeeSchedulesService) {}

  @Get(":employeeId")
  async getOne(@Req() req: RequestWithUser, @Param("employeeId") employeeId: string) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.schedules.getSchedule(req.user, employeeId);
  }

  @Put(":employeeId")
  async update(
    @Req() req: RequestWithUser,
    @Param("employeeId") employeeId: string,
    @Body() dto: UpdateEmployeeScheduleDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }

    return this.schedules.updateSchedule(req.user, employeeId, dto);
  }
}

import { Module } from "@nestjs/common";
import { EmployeeSchedulesController } from "./employee-schedules.controller";
import { EmployeeSchedulesService } from "./employee-schedules.service";
import { PrismaService } from "../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";

@Module({
  controllers: [EmployeeSchedulesController],
  providers: [EmployeeSchedulesService, PrismaService, TenancyService],
})
export class EmployeeSchedulesModule {}

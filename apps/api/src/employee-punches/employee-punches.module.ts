import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EmployeePunchesController } from "./employee-punches.controller";
import { EmployeePunchesService } from "./employee-punches.service";

@Module({
  imports: [PrismaModule, TenancyModule, NotificationsModule],
  controllers: [EmployeePunchesController],
  providers: [EmployeePunchesService],
})
export class EmployeePunchesModule {}

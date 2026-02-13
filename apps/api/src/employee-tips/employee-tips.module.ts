import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { EmployeeTipsController } from "./employee-tips.controller";
import { EmployeeTipsService } from "./employee-tips.service";

@Module({
  imports: [PrismaModule, TenancyModule, NotificationsModule],
  controllers: [EmployeeTipsController],
  providers: [EmployeeTipsService],
})
export class EmployeeTipsModule {}

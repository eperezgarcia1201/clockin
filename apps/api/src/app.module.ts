import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccessModule } from './access/access.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { EmployeePunchesModule } from './employee-punches/employee-punches.module';
import { GroupsModule } from './groups/groups.module';
import { OfficesModule } from './offices/offices.module';
import { PrismaModule } from './prisma/prisma.module';
import { PunchesModule } from './punches/punches.module';
import { ReportsModule } from './reports/reports.module';
import { StatusesModule } from './statuses/statuses.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminDevicesModule } from './admin-devices/admin-devices.module';
import { EmployeeSchedulesModule } from './employee-schedules/employee-schedules.module';
import { TenantAccountsModule } from './tenant-accounts/tenant-accounts.module';
import { TenantDirectoryModule } from './tenant-directory/tenant-directory.module';
import { EmployeeTipsModule } from './employee-tips/employee-tips.module';
import { CompanyOrdersModule } from './company-orders/company-orders.module';
import { LiquorInventoryModule } from './liquor-inventory/liquor-inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AccessModule,
    AuthModule,
    TenancyModule,
    PunchesModule,
    EmployeesModule,
    EmployeePunchesModule,
    OfficesModule,
    GroupsModule,
    StatusesModule,
    ReportsModule,
    SettingsModule,
    NotificationsModule,
    AdminDevicesModule,
    EmployeeSchedulesModule,
    TenantAccountsModule,
    TenantDirectoryModule,
    EmployeeTipsModule,
    CompanyOrdersModule,
    LiquorInventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

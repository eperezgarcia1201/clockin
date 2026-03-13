import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsModule } from '../reports/reports.module';
import { EmployeeSchedulesModule } from '../employee-schedules/employee-schedules.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { RestaurantPosIntegrationController } from './restaurant-pos-integration.controller';
import { RestaurantPosIntegrationService } from './restaurant-pos-integration.service';

@Module({
  imports: [
    PrismaModule,
    TenancyModule,
    ReportsModule,
    EmployeeSchedulesModule,
  ],
  controllers: [RestaurantPosIntegrationController],
  providers: [RestaurantPosIntegrationService],
})
export class RestaurantPosIntegrationModule {}

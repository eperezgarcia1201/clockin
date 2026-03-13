import { Module } from '@nestjs/common';
import { EmployeeSchedulesController } from './employee-schedules.controller';
import { EmployeeSchedulesService } from './employee-schedules.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [EmployeeSchedulesController],
  providers: [EmployeeSchedulesService],
  exports: [EmployeeSchedulesService],
})
export class EmployeeSchedulesModule {}

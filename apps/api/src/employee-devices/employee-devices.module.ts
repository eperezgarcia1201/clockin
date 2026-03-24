import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { EmployeeDevicesController } from './employee-devices.controller';
import { EmployeeDevicesService } from './employee-devices.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [EmployeeDevicesController],
  providers: [EmployeeDevicesService],
  exports: [EmployeeDevicesService],
})
export class EmployeeDevicesModule {}

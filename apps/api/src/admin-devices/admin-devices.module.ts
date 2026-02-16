import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AdminDevicesController } from './admin-devices.controller';
import { AdminDevicesService } from './admin-devices.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [AdminDevicesController],
  providers: [AdminDevicesService],
  exports: [AdminDevicesService],
})
export class AdminDevicesModule {}

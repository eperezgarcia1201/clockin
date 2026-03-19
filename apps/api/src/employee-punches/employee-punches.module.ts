import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmployeePunchesController } from './employee-punches.controller';
import { EmployeePunchesService } from './employee-punches.service';
import { PunchPhotoRetentionService } from './punch-photo-retention.service';

@Module({
  imports: [PrismaModule, TenancyModule, NotificationsModule],
  controllers: [EmployeePunchesController],
  providers: [EmployeePunchesService, PunchPhotoRetentionService],
})
export class EmployeePunchesModule {}

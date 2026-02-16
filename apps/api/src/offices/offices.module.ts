import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [OfficesController],
  providers: [OfficesService],
})
export class OfficesModule {}

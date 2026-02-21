import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { PunchesController } from './punches.controller';
import { PunchesService } from './punches.service';

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [PunchesController],
  providers: [PunchesService],
})
export class PunchesModule {}

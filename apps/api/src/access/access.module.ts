import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { AccessController } from './access.controller';

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [AccessController],
})
export class AccessModule {}

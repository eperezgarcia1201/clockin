import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CompanyOrdersController } from './company-orders.controller';
import { CompanyOrdersService } from './company-orders.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [CompanyOrdersController],
  providers: [CompanyOrdersService],
})
export class CompanyOrdersModule {}

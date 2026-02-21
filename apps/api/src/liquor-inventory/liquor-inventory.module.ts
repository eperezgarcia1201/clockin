import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { LiquorInventoryController } from './liquor-inventory.controller';
import { LiquorInventoryService } from './liquor-inventory.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [LiquorInventoryController],
  providers: [LiquorInventoryService],
})
export class LiquorInventoryModule {}

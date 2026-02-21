import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantDirectoryController } from './tenant-directory.controller';
import { TenantDirectoryService } from './tenant-directory.service';

@Module({
  imports: [PrismaModule],
  controllers: [TenantDirectoryController],
  providers: [TenantDirectoryService],
})
export class TenantDirectoryModule {}

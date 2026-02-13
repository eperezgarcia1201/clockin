import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { TenantAccountsController } from "./tenant-accounts.controller";
import { TenantAccountsService } from "./tenant-accounts.service";

@Module({
  imports: [AuthModule, PrismaModule, TenancyModule],
  controllers: [TenantAccountsController],
  providers: [TenantAccountsService],
})
export class TenantAccountsModule {}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { StatusesController } from "./statuses.controller";
import { StatusesService } from "./statuses.service";

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [StatusesController],
  providers: [StatusesService],
})
export class StatusesModule {}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

@Module({
  imports: [AuthModule, TenancyModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}

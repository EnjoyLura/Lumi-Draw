import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConfigCenterModule } from "../config-center/config-center.module";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";

@Module({
  imports: [AuthModule, ConfigCenterModule],
  controllers: [MembershipController],
  providers: [MembershipService]
})
export class MembershipModule {}

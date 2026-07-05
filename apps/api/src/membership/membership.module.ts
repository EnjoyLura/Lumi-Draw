import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";

@Module({
  imports: [AuthModule],
  controllers: [MembershipController],
  providers: [MembershipService]
})
export class MembershipModule {}

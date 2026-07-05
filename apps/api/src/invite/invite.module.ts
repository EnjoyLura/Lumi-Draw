import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { InviteController } from "./invite.controller";
import { InviteService } from "./invite.service";

@Module({
  imports: [AuthModule, CreditsModule],
  controllers: [InviteController],
  providers: [InviteService]
})
export class InviteModule {}

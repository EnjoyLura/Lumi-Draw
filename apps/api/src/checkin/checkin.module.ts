import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CheckinController } from "./checkin.controller";
import { CheckinService } from "./checkin.service";
import { WechatWalletModule } from "../payments/wechat-wallet.module";

@Module({
  imports: [AuthModule, CreditsModule, WechatWalletModule],
  controllers: [CheckinController],
  providers: [CheckinService]
})
export class CheckinModule {}

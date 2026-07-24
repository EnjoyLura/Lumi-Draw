import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsController } from "./credits.controller";
import { CreditsService } from "./credits.service";
import { PublishRewardsService } from "./publish-rewards.service";
import { WechatWalletModule } from "../payments/wechat-wallet.module";

@Module({
  imports: [AuthModule, WechatWalletModule],
  controllers: [CreditsController],
  providers: [CreditsService, PublishRewardsService],
  exports: [CreditsService, PublishRewardsService]
})
export class CreditsModule {}

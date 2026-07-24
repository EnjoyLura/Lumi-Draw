import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { WechatWalletModule } from "./wechat-wallet.module";

@Module({
  imports: [PrismaModule, CreditsModule, WechatWalletModule],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}

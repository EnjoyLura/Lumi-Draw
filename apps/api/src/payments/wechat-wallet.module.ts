import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { WechatWalletService } from "./wechat-wallet.service";

@Module({
  imports: [PrismaModule],
  providers: [WechatWalletService],
  exports: [WechatWalletService]
})
export class WechatWalletModule {}

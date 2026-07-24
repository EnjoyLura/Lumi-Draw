import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadsModule } from "../uploads/uploads.module";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { KieClient } from "./kie.client";
import { Change2ProClient } from "./change2pro.client";
import { AinbClient } from "./ainb.client";
import { ImageTransferClient } from "./image-transfer.client";
import { WechatWalletModule } from "../payments/wechat-wallet.module";

@Module({
  imports: [AuthModule, CreditsModule, PrismaModule, UploadsModule, WechatWalletModule],
  controllers: [GenerateController],
  providers: [GenerateService, KieClient, Change2ProClient, AinbClient, ImageTransferClient]
})
export class GenerateModule {}

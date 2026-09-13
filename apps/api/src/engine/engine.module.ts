import { Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module";
import { ContentSafetyModule } from "../content-safety/content-safety.module";
import { ImageTransferClient } from "../generate/image-transfer.client";
import { WechatWalletModule } from "../payments/wechat-wallet.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadsModule } from "../uploads/uploads.module";
import { EngineCatalogService } from "./engine-catalog.service";
import { EngineController } from "./engine.controller";
import { EngineBillingService } from "./engine-billing.service";
import { EngineService } from "./engine.service";
import { EngineStorageService } from "./engine-storage.service";
import { EngineWatchdogService } from "./engine-watchdog.service";

// ImageTransferClient 只依赖 ConfigService，这里直接实例化，
// 避免 engine 模块依赖旧 generate 模块（P4 清理时会整体下线）。
@Module({
  imports: [PrismaModule, CreditsModule, WechatWalletModule, UploadsModule, ContentSafetyModule],
  controllers: [EngineController],
  providers: [EngineService, EngineBillingService, EngineStorageService, EngineWatchdogService, EngineCatalogService, ImageTransferClient],
  exports: [EngineService]
})
export class EngineModule {}

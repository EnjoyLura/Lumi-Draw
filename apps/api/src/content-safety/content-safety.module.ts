import { Global, Module } from "@nestjs/common";
import { CreditsModule } from "../credits/credits.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ContentSafetyController } from "./content-safety.controller";
import { WechatContentSafetyService } from "./wechat-content-safety.service";

@Global()
@Module({
  imports: [CreditsModule, NotificationsModule],
  controllers: [ContentSafetyController],
  providers: [WechatContentSafetyService],
  exports: [WechatContentSafetyService]
})
export class ContentSafetyModule {}

import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { UploadsModule } from "../uploads/uploads.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";

@Module({
  imports: [PrismaModule, NotificationsModule, UploadsModule],
  controllers: [SocialController],
  providers: [SocialService]
})
export class SocialModule {}

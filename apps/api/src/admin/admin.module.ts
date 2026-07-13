import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UploadsModule } from "../uploads/uploads.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminConfigController } from "./admin-config.controller";
import { AdminConfigService } from "./admin-config.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminWorksController } from "./admin-works.controller";
import { AdminService } from "./admin.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [AuthModule, CreditsModule, NotificationsModule, UploadsModule],
  controllers: [
    AdminAuthController,
    DashboardController,
    AdminUsersController,
    AdminWorksController,
    AdminConfigController,
    ModerationController
  ],
  providers: [AdminService, AdminAuthService, DashboardService, AdminConfigService, ModerationService]
})
export class AdminModule {}

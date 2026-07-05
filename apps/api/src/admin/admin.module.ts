import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminConfigController } from "./admin-config.controller";
import { AdminConfigService } from "./admin-config.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminWorksController } from "./admin-works.controller";
import { AdminService } from "./admin.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AuthModule],
  controllers: [
    AdminAuthController,
    DashboardController,
    AdminUsersController,
    AdminWorksController,
    AdminConfigController
  ],
  providers: [AdminService, AdminAuthService, DashboardService, AdminConfigService]
})
export class AdminModule {}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminWorksController } from "./admin-works.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController, AdminUsersController, AdminWorksController],
  providers: [AdminService, AdminAuthService]
})
export class AdminModule {}

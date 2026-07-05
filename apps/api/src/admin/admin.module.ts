import { Module } from "@nestjs/common";
import { AdminUsersController } from "./admin-users.controller";
import { AdminWorksController } from "./admin-works.controller";
import { AdminService } from "./admin.service";

@Module({
  controllers: [AdminUsersController, AdminWorksController],
  providers: [AdminService]
})
export class AdminModule {}

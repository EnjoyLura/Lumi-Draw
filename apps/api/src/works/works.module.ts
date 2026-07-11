import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UploadsModule } from "../uploads/uploads.module";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";

@Module({
  imports: [AuthModule, UploadsModule],
  controllers: [WorksController],
  providers: [WorksService]
})
export class WorksModule {}

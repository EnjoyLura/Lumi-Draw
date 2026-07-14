import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { UploadsModule } from "../uploads/uploads.module";
import { WorksController } from "./works.controller";
import { WorksService } from "./works.service";

@Module({
  imports: [AuthModule, UploadsModule, CreditsModule],
  controllers: [WorksController],
  providers: [WorksService]
})
export class WorksModule {}

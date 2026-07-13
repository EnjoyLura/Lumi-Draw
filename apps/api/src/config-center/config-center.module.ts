import { Module } from "@nestjs/common";
import { AppBootstrapController } from "./app.controller";
import { ConfigController } from "./config.controller";
import { ConfigService } from "./config.service";
import { UploadsModule } from "../uploads/uploads.module";

@Module({
  imports: [UploadsModule],
  controllers: [AppBootstrapController, ConfigController],
  providers: [ConfigService]
})
export class ConfigCenterModule {}

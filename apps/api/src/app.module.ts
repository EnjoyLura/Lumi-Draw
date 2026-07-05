import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./config/app.config";
import { validateEnvironment } from "./config/env.validation";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "apps/api/.env"],
      load: [appConfig],
      validate: validateEnvironment
    }),
    HealthModule
  ]
})
export class AppModule {}

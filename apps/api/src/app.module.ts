import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./config/app.config";
import { validateEnvironment } from "./config/env.validation";
import { ConfigCenterModule } from "./config-center/config-center.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "apps/api/.env"],
      load: [appConfig],
      validate: validateEnvironment
    }),
    PrismaModule,
    HealthModule,
    ConfigCenterModule
  ]
})
export class AppModule {}

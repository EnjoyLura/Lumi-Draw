import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./config/app.config";
import { validateEnvironment } from "./config/env.validation";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigCenterModule } from "./config-center/config-center.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { WorksModule } from "./works/works.module";

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
    ConfigCenterModule,
    AuthModule,
    UsersModule,
    WorksModule,
    AdminModule
  ]
})
export class AppModule {}

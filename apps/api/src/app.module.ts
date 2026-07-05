import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "./config/app.config";
import { validateEnvironment } from "./config/env.validation";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CheckinModule } from "./checkin/checkin.module";
import { ConfigCenterModule } from "./config-center/config-center.module";
import { CreditsModule } from "./credits/credits.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { HealthModule } from "./health/health.module";
import { InviteModule } from "./invite/invite.module";
import { MembershipModule } from "./membership/membership.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SocialModule } from "./social/social.module";
import { UploadsModule } from "./uploads/uploads.module";
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
    UploadsModule,
    CreditsModule,
    CheckinModule,
    InviteModule,
    MembershipModule,
    FeedbackModule,
    NotificationsModule,
    SocialModule,
    WorksModule,
    AdminModule
  ]
})
export class AppModule {}

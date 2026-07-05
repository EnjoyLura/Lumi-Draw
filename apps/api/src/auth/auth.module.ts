import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminJwtGuard } from "./guards/admin-jwt.guard";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminJwtGuard],
  exports: [AuthService, JwtAuthGuard, AdminJwtGuard]
})
export class AuthModule {}

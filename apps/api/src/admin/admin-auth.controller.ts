import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminLoginDto } from "../auth/auth.dto";
import { CurrentAdmin } from "../auth/decorators/current-user.decorator";
import { AdminJwtGuard } from "../auth/guards/admin-jwt.guard";
import { AdminAuthService } from "./admin-auth.service";

@ApiTags("admin-auth")
@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post("login")
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto.username, dto.password);
  }

  @ApiBearerAuth()
  @UseGuards(AdminJwtGuard)
  @Get("me")
  me(@CurrentAdmin() admin: { id: number }) {
    return this.adminAuth.me(admin.id);
  }
}

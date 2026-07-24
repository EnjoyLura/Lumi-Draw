import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RefreshDto, WechatLoginDto } from "./auth.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("wechat/login")
  @Throttle({ default: { ttl: 60_000, limit: 8 } })
  wechatLogin(@Body() dto: WechatLoginDto, @Req() req: Request) {
    const forwarded = req.headers["x-forwarded-for"];
    const rawIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || req.ip || req.socket.remoteAddress || "";
    const userIp = rawIp.trim().replace(/^::ffff:/, "").slice(0, 64);
    return this.auth.wechatLogin(dto.code, userIp);
  }

  @Post("refresh")
  @Throttle({ default: { ttl: 60_000, limit: 12 } })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: { id: number }) {
    return this.auth.me(user.id);
  }
}

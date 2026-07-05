import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { extractBearer } from "./jwt-auth.guard";

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { admin?: { id: number; role: string } }>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException("未登录");
    try {
      const payload = this.jwt.verify<{ sub: number; type: string; role: string }>(token, {
        secret: this.config.getOrThrow<string>("app.adminJwtSecret")
      });
      if (payload.type !== "admin") throw new Error("wrong token type");
      req.admin = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException("登录已失效");
    }
  }
}

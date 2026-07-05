import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { extractBearer } from "./jwt-auth.guard";

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: number } }>();
    const token = extractBearer(req);
    if (!token) return true;

    try {
      const payload = this.jwt.verify<{ sub: number; type: string }>(token, {
        secret: this.config.getOrThrow<string>("app.jwtSecret")
      });
      if (payload.type !== "user") throw new Error("wrong token type");
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException("登录已失效");
    }
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

export function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: number } }>();
    const token = extractBearer(req);
    if (!token) throw new UnauthorizedException("未登录");
    try {
      const payload = this.jwt.verify<{ sub: number; type: string; accountStatus?: string }>(token, {
        secret: this.config.getOrThrow<string>("app.jwtSecret")
      });
      if (payload.type !== "user" || payload.accountStatus !== "normal") throw new Error("invalid account");
      req.user = { id: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException("登录已失效");
    }
  }
}

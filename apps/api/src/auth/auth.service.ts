import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import { generateOpaqueToken, sha256Hex } from "../common/crypto/password";
import { PrismaService } from "../prisma/prisma.service";

const AVATAR_COLORS = ["#5B9FE8", "#6FD4B0", "#FFB59A", "#B8A5E3", "#FFE08A", "#FFA8B8"];

function publicUser(user: User) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarText: user.avatarText,
    avatarColor: user.avatarColor,
    avatarUrl: user.avatarUrl ?? undefined,
    bio: user.bio,
    gender: user.gender,
    phone: user.phone,
    credits: user.credits,
    memberPlan: user.memberPlan,
    status: user.status
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  private get accessTtl() {
    return this.config.getOrThrow<number>("app.auth.accessTtl");
  }

  private async issueTokens(user: User) {
    const accessToken = this.jwt.sign(
      { sub: user.id, type: "user" },
      { secret: this.config.getOrThrow<string>("app.jwtSecret"), expiresIn: this.accessTtl }
    );
    const refreshToken = generateOpaqueToken();
    const refreshTtlDays = this.config.getOrThrow<number>("app.auth.refreshTtlDays");
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 3600 * 1000)
      }
    });
    return { accessToken, refreshToken, expiresIn: this.accessTtl, user: publicUser(user) };
  }

  private async resolveOpenId(code: string): Promise<string> {
    const allowMock = this.config.getOrThrow<boolean>("app.auth.allowMockLogin");
    if (allowMock && code.startsWith("mock")) {
      return `mock_${code}`;
    }
    const appId = this.config.get<string>("app.wx.appId");
    const secret = this.config.get<string>("app.wx.appSecret");
    if (!appId || !secret) {
      throw new UnauthorizedException("微信登录未配置");
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    try {
      const res = await fetch(url);
      const data = (await res.json()) as { openid?: string; errcode?: number; errmsg?: string };
      if (!data.openid) {
        this.logger.warn(`jscode2session failed: ${data.errcode} ${data.errmsg}`);
        throw new UnauthorizedException("微信登录失败");
      }
      return data.openid;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("微信登录请求异常");
    }
  }

  async wechatLogin(code: string) {
    const openId = await this.resolveOpenId(code);
    let user = await this.prisma.user.findUnique({ where: { openId } });
    if (!user) {
      const seq = await this.prisma.user.count();
      user = await this.prisma.user.create({
        data: {
          openId,
          nickname: `体验用户${seq + 1}`,
          avatarText: "米",
          avatarColor: AVATAR_COLORS[seq % AVATAR_COLORS.length],
          credits: 1280
        }
      });
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256Hex(refreshToken) } });
    if (!row || row.revoked || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("刷新令牌无效");
    }
    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!user) throw new UnauthorizedException("用户不存在");
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revoked: true } });
    return this.issueTokens(user);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256Hex(refreshToken) },
      data: { revoked: true }
    });
    return { ok: true };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("用户不存在");
    return publicUser(user);
  }
}

import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import { generateOpaqueToken, sha256Hex } from "../common/crypto/password";
import { readCreditsConfig } from "../credits/reward-policy";
import { PrismaService } from "../prisma/prisma.service";
import { encryptWechatSessionKey } from "./session-secret";
import { WechatWalletService } from "../payments/wechat-wallet.service";

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
    status: user.status,
    worksCount: user.worksCount,
    likesCount: user.likesCount,
    followers: user.followers,
    following: user.following
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wallet: WechatWalletService
  ) {}

  private get accessTtl() {
    return this.config.getOrThrow<number>("app.auth.accessTtl");
  }

  private async issueTokens(user: User) {
    const accessToken = this.jwt.sign(
      { sub: user.id, type: "user", accountStatus: user.status },
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

  private async resolveWechatSession(code: string): Promise<{ openId: string; sessionKey: string }> {
    const allowMock = this.config.getOrThrow<boolean>("app.auth.allowMockLogin");
    if (allowMock && code.startsWith("mock")) {
      return { openId: `mock_${code}`, sessionKey: `mock-session-${code}` };
    }
    const appId = this.config.get<string>("app.wx.appId");
    const secret = this.config.get<string>("app.wx.appSecret");
    if (!appId || !secret) {
      throw new UnauthorizedException("微信登录未配置");
    }
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;
    try {
      const res = await fetch(url);
      const data = (await res.json()) as { openid?: string; session_key?: string; errcode?: number; errmsg?: string };
      if (!data.openid) {
        this.logger.warn(`jscode2session failed: ${data.errcode} ${data.errmsg}`);
        throw new UnauthorizedException("微信登录失败");
      }
      return { openId: data.openid, sessionKey: data.session_key ?? "" };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException("微信登录请求异常");
    }
  }

  async wechatLogin(code: string, userIp = "") {
    const session = await this.resolveWechatSession(code);
    const openId = session.openId;
    const sessionEncryptionKey = this.config.get<string>("app.wx.sessionEncryptionKey") ?? "";
    const virtualConfigured = Boolean(
      this.config.get<string>("app.wx.virtualPayOfferId") &&
      this.config.get<string>("app.wx.virtualPayAppKey")
    );
    if (virtualConfigured && session.sessionKey && sessionEncryptionKey.length < 32) {
      throw new UnauthorizedException("虚拟支付会话密钥未完成安全配置");
    }
    const encryptedSessionKey = session.sessionKey && sessionEncryptionKey
      ? encryptWechatSessionKey(session.sessionKey, sessionEncryptionKey)
      : "";
    let user = await this.prisma.user.findUnique({ where: { openId } });
    if (!user) {
      const seq = await this.prisma.user.count();
      const { registerGift } = await readCreditsConfig(this.prisma);
      user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            openId,
            nickname: `体验用户${seq + 1}`,
            avatarText: "米",
            avatarColor: AVATAR_COLORS[seq % AVATAR_COLORS.length],
            credits: this.wallet.enabled ? 0 : registerGift,
            wechatSessionKeyEncrypted: encryptedSessionKey,
            wechatSessionUpdatedAt: encryptedSessionKey ? new Date() : null,
            wechatSessionUserIp: encryptedSessionKey ? userIp : ""
          }
        });
        if (registerGift > 0 && !this.wallet.enabled) {
          await tx.creditTransaction.create({
            data: {
              userId: created.id,
              type: "adjust",
              amount: registerGift,
              balanceAfter: registerGift,
              reason: "新用户奖励",
              refId: `register_gift:${created.id}`
            }
          });
        }
        return created;
      });
    } else if (encryptedSessionKey) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          wechatSessionKeyEncrypted: encryptedSessionKey,
          wechatSessionUpdatedAt: new Date(),
          wechatSessionUserIp: userIp
        }
      });
    }
    try {
      await this.ensureRegistrationGift(user.id);
    } catch (error) {
      // Reward delivery is retried on a later login. Authentication itself
      // must remain available when a third-party wallet operation is delayed.
      this.logger.error(
        `Registration gift delivery failed for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    user = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return this.issueTokens(user);
  }

  async refreshWechatSession(userId: number, code: string, userIp = "") {
    const session = await this.resolveWechatSession(code);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { openId: true }
    });
    if (!user || user.openId !== session.openId) {
      throw new UnauthorizedException("微信登录账号与当前账号不一致，请重新登录");
    }

    const sessionEncryptionKey = this.config.get<string>("app.wx.sessionEncryptionKey") ?? "";
    const virtualConfigured = Boolean(
      this.config.get<string>("app.wx.virtualPayOfferId") &&
      this.config.get<string>("app.wx.virtualPayAppKey")
    );
    if (virtualConfigured && session.sessionKey && sessionEncryptionKey.length < 32) {
      throw new UnauthorizedException("虚拟支付会话密钥未完成安全配置");
    }
    if (!session.sessionKey || !sessionEncryptionKey) {
      throw new UnauthorizedException("微信登录未返回有效会话，请重新登录");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        wechatSessionKeyEncrypted: encryptWechatSessionKey(session.sessionKey, sessionEncryptionKey),
        wechatSessionUpdatedAt: new Date(),
        wechatSessionUserIp: userIp
      }
    });
    return { ok: true };
  }

  private async ensureRegistrationGift(userId: number) {
    if (!this.wallet.enabled) return;
    const refId = `register_gift:${userId}`;
    const existing = await this.prisma.creditTransaction.findFirst({ where: { userId, refId }, select: { id: true } });
    if (existing) return;
    const { registerGift } = await readCreditsConfig(this.prisma);
    if (registerGift <= 0) return;
    const remote = await this.wallet.present(userId, registerGift, `register_${userId}`, "新用户奖励");
    if (!remote) return;
    await this.prisma.$transaction(async (tx) => {
      const duplicated = await tx.creditTransaction.findFirst({ where: { userId, refId }, select: { id: true } });
      if (duplicated) return;
      await tx.user.update({ where: { id: userId }, data: { credits: remote.balance } });
      await tx.creditTransaction.create({
        data: { userId, type: "adjust", amount: registerGift, balanceAfter: remote.balance, reason: "新用户奖励", refId }
      });
    });
  }

  async refresh(refreshToken: string) {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256Hex(refreshToken) } });
    if (!row || row.revoked || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("刷新令牌无效");
    }
    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!user || user.status === "cancelled") throw new UnauthorizedException("用户不存在");
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
    if (!user || user.status === "cancelled") throw new UnauthorizedException("用户不存在");
    return publicUser(user);
  }
}

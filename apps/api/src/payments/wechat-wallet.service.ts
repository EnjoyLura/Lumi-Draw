import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { decryptWechatSessionKey } from "../auth/session-secret";
import { PrismaService } from "../prisma/prisma.service";
import { WechatVirtualPayClient, type WechatVirtualCurrencyResult } from "./wechat-virtual-pay.client";

@Injectable()
export class WechatWalletService {
  private client?: WechatVirtualPayClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  get enabled() {
    return this.config.get<string>("app.nodeEnv") === "production" &&
      process.env.PAYMENT_ALLOW_MOCK !== "true" &&
      this.getClient().configured;
  }

  async queryBalance(userId: number) {
    if (!this.enabled) return null;
    const session = await this.userSession(userId);
    return this.getClient().queryUserBalance(session.openId, session.sessionKey, session.userIp);
  }

  async deduct(userId: number, amount: number, billNo: string, reason: string) {
    if (!this.enabled) return null;
    const session = await this.userSession(userId);
    return this.getClient().currencyPay({
      ...session,
      amount: Math.max(0, Math.floor(amount)),
      billNo: this.normalizeBillNo(billNo),
      payItem: JSON.stringify([
        { productid: "lumi_credits", unit_price: Math.max(0, Math.floor(amount)), quantity: 1 }
      ]),
      remark: reason
    });
  }

  async refund(userId: number, billNo: string, amount: number) {
    if (!this.enabled) return null;
    const session = await this.userSession(userId);
    const payBillNo = this.normalizeBillNo(billNo);
    const safeAmount = Math.max(0, Math.floor(amount));
    return this.getClient().cancelCurrencyPay({
      ...session,
      payBillNo,
      refundBillNo: this.refundBillNo(payBillNo, safeAmount),
      amount: safeAmount
    });
  }

  async present(userId: number, amount: number, billNo: string, reason: string): Promise<WechatVirtualCurrencyResult | null> {
    if (!this.enabled || amount <= 0) return null;
    const session = await this.userSession(userId);
    return this.getClient().presentCurrency({
      ...session,
      amount: Math.max(0, Math.floor(amount)),
      billNo: this.normalizeBillNo(billNo),
      reason
    });
  }

  private async userSession(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { openId: true, wechatSessionKeyEncrypted: true, wechatSessionUserIp: true }
    });
    if (!user?.openId || !user.wechatSessionKeyEncrypted || !user.wechatSessionUserIp) {
      throw new BadRequestException("微信登录状态已过期，请重新登录后再试");
    }
    const encryptionKey = this.config.get<string>("app.wx.sessionEncryptionKey") ?? "";
    try {
      return {
        openId: user.openId,
        sessionKey: decryptWechatSessionKey(user.wechatSessionKeyEncrypted, encryptionKey),
        userIp: user.wechatSessionUserIp
      };
    } catch {
      throw new BadRequestException("微信登录状态无效，请重新登录后再试");
    }
  }

  private normalizeBillNo(value: string) {
    return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  }

  private refundBillNo(payBillNo: string, amount: number) {
    const digest = createHash("sha256").update(`${payBillNo}:${amount}`, "utf8").digest("hex").slice(0, 26);
    return `RF${digest}`;
  }

  private getClient() {
    if (!this.client) {
      this.client = new WechatVirtualPayClient({
        appId: this.config.get<string>("app.wx.appId") ?? "",
        appSecret: this.config.get<string>("app.wx.appSecret") ?? "",
        offerId: this.config.get<string>("app.wx.virtualPayOfferId") ?? "",
        appKey: this.config.get<string>("app.wx.virtualPayAppKey") ?? "",
        env: this.config.get<0 | 1>("app.wx.virtualPayEnv") ?? 0,
        apiBase: "https://api.weixin.qq.com"
      });
    }
    return this.client;
  }
}

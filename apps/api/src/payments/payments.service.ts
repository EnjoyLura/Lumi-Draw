import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentOrder, Prisma } from "@prisma/client";
import { CreditsService } from "../credits/credits.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateMembershipOrderDto, CreateRechargeOrderDto } from "./payments.dto";
import {
  isWechatPayConfigured,
  loadPem,
  WechatPayClient,
  type WechatNotifyHeaders,
  type WechatPayConfig
} from "./wechat-pay.client";

type OrderWithUser = PaymentOrder & { user?: { memberExpireAt: Date | null } };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly config: ConfigService
  ) {}

  async createRechargeOrder(userId: number, dto: CreateRechargeOrderDto) {
    const spec = dto.tierId ? await this.rechargeTierSpec(dto.tierId) : this.customRechargeSpec(dto.amount);
    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        type: "recharge",
        orderNo: this.createOrderNo("R"),
        channel: "wechat",
        amountFen: spec.amountFen,
        subject: spec.subject,
        body: spec.body,
        rechargeTierId: dto.tierId,
        credits: spec.credits,
        bonusCredits: spec.bonusCredits
      }
    });
    return this.toOrderView(order, { preparePayment: true });
  }

  async createMembershipOrder(userId: number, dto: CreateMembershipOrderDto) {
    const plan = await this.prisma.memberPlan.findFirst({ where: { id: dto.planId, enabled: true } });
    if (!plan) throw new NotFoundException("会员方案不存在");

    const order = await this.prisma.paymentOrder.create({
      data: {
        userId,
        type: "membership",
        orderNo: this.createOrderNo("M"),
        channel: "wechat",
        amountFen: plan.price * 100,
        subject: `开通${plan.name}`,
        body: plan.rights,
        memberPlanId: plan.id,
        credits: plan.giftCredits,
        memberDays: this.resolveMemberDays(plan.name)
      }
    });
    return this.toOrderView(order, { preparePayment: true });
  }

  async getOrder(userId: number, id: string) {
    const order = await this.findUserOrder(userId, id);
    return this.toOrderView(order);
  }

  async mockComplete(userId: number, id: string) {
    if (!this.allowMockPayment()) {
      throw new ForbiddenException("模拟支付未开启");
    }

    const order = await this.findUserOrder(userId, id);
    const paid = await this.markOrderPaid(order, `mock_${Date.now()}`);
    return this.toOrderView(paid);
  }

  async handleWechatNotify(body: unknown, headers: WechatNotifyHeaders, rawBody = "") {
    const client = this.createWechatClient();
    if (!client || !rawBody) {
      return { received: true, ignored: true, reason: "wechat pay notify is not configured" };
    }
    if (!client.verifyNotify(headers, rawBody)) {
      throw new ForbiddenException("invalid wechat pay notification signature");
    }
    const resource = (body as { resource?: { associated_data?: string; nonce: string; ciphertext: string } })?.resource;
    if (!resource?.nonce || !resource.ciphertext) {
      throw new BadRequestException("invalid wechat pay notification body");
    }
    const transaction = client.decryptNotifyResource(resource);
    if (!transaction.out_trade_no) {
      throw new BadRequestException("wechat pay notification missing out_trade_no");
    }
    if (transaction.trade_state !== "SUCCESS") {
      return { received: true, ignored: true, tradeState: transaction.trade_state ?? "" };
    }
    const order = await this.prisma.paymentOrder.findUnique({ where: { orderNo: transaction.out_trade_no } });
    if (!order) {
      throw new NotFoundException("payment order not found");
    }
    const payConfig = this.wechatPayConfig();
    if (transaction.appid && transaction.appid !== payConfig.appId) throw new ForbiddenException("微信支付应用号不匹配");
    if (transaction.mchid && transaction.mchid !== payConfig.mchId) throw new ForbiddenException("微信支付商户号不匹配");
    if (transaction.amount?.total !== undefined && transaction.amount.total !== order.amountFen) {
      throw new BadRequestException("微信支付金额与订单金额不一致");
    }
    if (transaction.amount?.currency && transaction.amount.currency !== "CNY") throw new BadRequestException("微信支付币种不正确");
    await this.markOrderPaid(order, transaction.transaction_id || transaction.out_trade_no);
    return { received: true };
  }

  private async rechargeTierSpec(tierId: number) {
    const tier = await this.prisma.rechargeTier.findFirst({ where: { id: tierId, enabled: true } });
    if (!tier) throw new NotFoundException("充值方案不存在");
    return {
      amountFen: tier.price * 100,
      credits: tier.credits,
      bonusCredits: tier.bonus,
      subject: `积分充值 ${tier.credits + tier.bonus}积分`,
      body: `购买${tier.credits}积分，赠送${tier.bonus}积分`
    };
  }

  private customRechargeSpec(amount: number | undefined) {
    if (!amount || !Number.isFinite(amount) || amount < 0.1) throw new BadRequestException("充值金额不能低于0.1元");
    const normalized = Math.round(amount * 100) / 100;
    const credits = Math.floor(normalized * 10);
    const bonusCredits = Math.floor(credits * 0.05);
    return {
      amountFen: Math.round(normalized * 100),
      credits,
      bonusCredits,
      subject: `自定义充值 ${credits + bonusCredits}积分`,
      body: `购买${credits}积分，赠送${bonusCredits}积分`
    };
  }

  private async findUserOrder(userId: number, id: string) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("支付订单不存在");
    if (order.userId !== userId) throw new ForbiddenException("无权查看该订单");
    return order;
  }

  private async markOrderPaid(order: PaymentOrder, transactionId: string) {
    if (order.status === "paid") return order;
    if (order.status !== "pending") throw new BadRequestException("订单状态不能支付");

    return this.prisma.$transaction(async (tx) => {
      const reusedTransaction = await tx.paymentOrder.findFirst({
        where: { transactionId, status: "paid", id: { not: order.id } },
        select: { id: true }
      });
      if (reusedTransaction) throw new BadRequestException("微信支付交易号已被其他订单使用");

      const claimed = await tx.paymentOrder.updateMany({
        where: { id: order.id, status: "pending" },
        data: { status: "paid", transactionId, paidAt: new Date() }
      });
      const paid = await tx.paymentOrder.findUnique({
        where: { id: order.id },
        include: { user: { select: { memberExpireAt: true } } }
      });
      if (!paid) throw new NotFoundException("支付订单不存在");
      if (claimed.count === 0) {
        if (paid.status === "paid") return paid;
        throw new BadRequestException("订单状态不能支付");
      }

      await this.applyPaidOrder(tx, paid);
      return paid;
    });
  }

  private async applyPaidOrder(tx: Prisma.TransactionClient, order: OrderWithUser) {
    if (order.type === "recharge") {
      await this.credits.addTransactionInTx(
        tx,
        order.userId,
        "recharge",
        order.credits + order.bonusCredits,
        order.subject,
        order.id
      );
      return;
    }

    if (order.type === "membership") {
      const expireAt = this.resolveMemberExpireAt(order.user?.memberExpireAt ?? null, order.memberDays);
      await tx.user.update({
        where: { id: order.userId },
        data: {
          memberPlan: order.subject.replace(/^开通/, ""),
          memberExpireAt: expireAt
        }
      });
      if (order.credits > 0) {
        await this.credits.addTransactionInTx(tx, order.userId, "membership", order.credits, `${order.subject}赠送积分`, order.id);
      }
      return;
    }

    throw new BadRequestException("未知订单类型");
  }

  private resolveMemberExpireAt(current: Date | null, days: number) {
    const base = current && current.getTime() > Date.now() ? current : new Date();
    const next = new Date(base);
    next.setDate(next.getDate() + Math.max(days, 1));
    return next;
  }

  private resolveMemberDays(name: string) {
    if (name.includes("年") || name.toLowerCase().includes("year")) return 365;
    if (name.includes("季") || name.toLowerCase().includes("quarter")) return 90;
    return 30;
  }

  private createOrderNo(prefix: string) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}${stamp}${random}`;
  }

  private allowMockPayment() {
    const explicit = process.env.PAYMENT_ALLOW_MOCK;
    if (explicit) return explicit === "true";
    return this.config.get<string>("app.nodeEnv") !== "production";
  }

  private async paymentParams(order: PaymentOrder, preparePayment: boolean) {
    if (this.allowMockPayment()) {
      return {
        provider: "mock",
        mockCompleteUrl: `/payments/${order.id}/mock-complete`
      };
    }
    const client = this.createWechatClient();
    if (client && preparePayment) {
      const user = await this.prisma.user.findUnique({ where: { id: order.userId }, select: { openId: true } });
      if (!user?.openId) throw new BadRequestException("user is not bound to a wechat openid");
      return client.createJsapiPayment({
        description: order.subject,
        outTradeNo: order.orderNo,
        amountFen: order.amountFen,
        openId: user.openId,
        attach: order.id
      });
    }
    return {
      provider: "wechat",
      configured: Boolean(client),
      message: client ? "WeChat Pay order needs to be recreated" : "WeChat Pay signing is not configured"
    };
  }

  private createWechatClient() {
    const config = this.wechatPayConfig();
    if (!isWechatPayConfigured(config)) return null;
    return new WechatPayClient(config);
  }

  private wechatPayConfig(): WechatPayConfig {
    return {
      appId: this.config.get<string>("app.wx.appId") ?? "",
      mchId: this.config.get<string>("app.wx.mchId") ?? "",
      apiBase: this.config.get<string>("app.wx.payApiBase") ?? "https://api.mch.weixin.qq.com",
      apiV3Key: this.config.get<string>("app.wx.payApiV3Key") ?? "",
      certSerialNo: this.config.get<string>("app.wx.payCertSerialNo") ?? "",
      privateKey: loadPem(
        this.config.get<string>("app.wx.payPrivateKey"),
        this.config.get<string>("app.wx.payPrivateKeyPath")
      ),
      platformCertificate: loadPem(
        this.config.get<string>("app.wx.payPlatformCertificate"),
        this.config.get<string>("app.wx.payPlatformCertificatePath")
      ),
      publicKey: loadPem(
        this.config.get<string>("app.wx.payPublicKey"),
        this.config.get<string>("app.wx.payPublicKeyPath")
      ),
      publicKeyId: this.config.get<string>("app.wx.payPublicKeyId") ?? "",
      notifyUrl: this.config.get<string>("app.wx.payNotifyUrl") ?? ""
    };
  }

  private async toOrderView(order: PaymentOrder, options: { preparePayment?: boolean } = {}) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      type: order.type,
      status: order.status,
      channel: order.channel,
      amountFen: order.amountFen,
      amountYuan: order.amountFen / 100,
      subject: order.subject,
      body: order.body,
      credits: order.credits,
      bonusCredits: order.bonusCredits,
      memberDays: order.memberDays,
      paidAt: order.paidAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      paymentParams: order.status === "pending" ? await this.paymentParams(order, Boolean(options.preparePayment)) : null
    };
  }
}

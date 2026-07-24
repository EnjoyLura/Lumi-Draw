import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { PrismaService } from "../prisma/prisma.service";
import { WechatWalletService } from "../payments/wechat-wallet.service";

export type CreditType = "recharge" | "consume" | "refund" | "checkin" | "invite" | "membership" | "adjust";

@Injectable()
export class CreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WechatWalletService
  ) {}

  private async existingTransaction(tx: Prisma.TransactionClient, userId: number, refId: string) {
    if (!refId) return null;
    return tx.creditTransaction.findFirst({ where: { userId, refId } });
  }

  async addTransactionInTx(
    tx: Prisma.TransactionClient,
    userId: number,
    type: CreditType,
    amount: number,
    reason = "",
    refId = ""
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");

    const existing = await this.existingTransaction(tx, userId, refId);
    if (existing) return { balance: existing.balanceAfter, transaction: existing };

    const next = user.credits + amount;
    if (next < 0) {
      throw new HttpException({ code: 40020, message: "积分不足" }, 400);
    }

    await tx.user.update({ where: { id: userId }, data: { credits: next } });
    const transaction = await tx.creditTransaction.create({
      data: { userId, type, amount, balanceAfter: next, reason, refId }
    });
    return { balance: next, transaction };
  }

  async syncExternalBalanceInTx(
    tx: Prisma.TransactionClient,
    userId: number,
    type: CreditType,
    amount: number,
    balanceAfter: number,
    reason = "",
    refId = ""
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("用户不存在");
    const existing = await this.existingTransaction(tx, userId, refId);
    if (existing) return { balance: existing.balanceAfter, transaction: existing };
    const safeBalance = Math.max(0, Math.floor(balanceAfter));
    await tx.user.update({ where: { id: userId }, data: { credits: safeBalance } });
    const transaction = await tx.creditTransaction.create({
      data: { userId, type, amount: Math.floor(amount), balanceAfter: safeBalance, reason, refId }
    });
    return { balance: safeBalance, transaction };
  }

  async syncExternalBalance(userId: number, type: CreditType, amount: number, balanceAfter: number, reason = "", refId = "") {
    return this.prisma.$transaction((tx) => this.syncExternalBalanceInTx(tx, userId, type, amount, balanceAfter, reason, refId));
  }

  async addTransaction(userId: number, type: CreditType, amount: number, reason = "", refId = "") {
    return this.prisma.$transaction((tx) => this.addTransactionInTx(tx, userId, type, amount, reason, refId));
  }

  async getBalance(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    if (!user) throw new NotFoundException("用户不存在");
    const remote = await this.wallet.queryBalance(userId);
    if (remote && remote.balance !== user.credits) {
      await this.prisma.user.update({ where: { id: userId }, data: { credits: remote.balance } });
      return { credits: remote.balance };
    }
    return { credits: user.credits };
  }

  async getRecords(userId: number, type: "earn" | "spend" | "all", page: number, pageSize: number) {
    const where: Prisma.CreditTransactionWhereInput = { userId };
    if (type === "earn") where.amount = { gt: 0 };
    else if (type === "spend") where.amount = { lt: 0 };
    const [rows, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({ where, orderBy: { createdAt: "desc" }, ...skipTake(page, pageSize) }),
      this.prisma.creditTransaction.count({ where })
    ]);
    const items = rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      balanceAfter: r.balanceAfter,
      reason: r.reason,
      refId: r.refId,
      createdAt: r.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }
}

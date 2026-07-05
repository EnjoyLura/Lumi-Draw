import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { buildPage, skipTake } from "../common/dto/pagination";
import { PrismaService } from "../prisma/prisma.service";

export type CreditType = "recharge" | "consume" | "refund" | "checkin" | "invite" | "membership" | "adjust";

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async addTransaction(userId: number, type: CreditType, amount: number, reason = "", refId = "") {
    return this.prisma.$transaction((tx) => this.addTransactionInTx(tx, userId, type, amount, reason, refId));
  }

  async getBalance(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    if (!user) throw new NotFoundException("用户不存在");
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
      createdAt: r.createdAt.toISOString()
    }));
    return buildPage(items, total, page, pageSize);
  }
}

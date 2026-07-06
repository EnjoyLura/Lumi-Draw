import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

function dayKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastNDays(n: number): string[] {
  const keys: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    keys.push(dayKey(d));
  }
  return keys;
}

function bucketByDay(dates: Date[], keys: string[]): number[] {
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const d of dates) {
    const k = dayKey(d);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return keys.map((k) => counts.get(k) ?? 0);
}

function dayStart(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function nextDayStart(key: string) {
  const d = dayStart(key);
  d.setDate(d.getDate() + 1);
  return d;
}

function sumFen(result: { _sum: { amountFen: number | null } }) {
  return result._sum.amountFen ?? 0;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const [totalUsers, totalWorks, publishedWorks, pendingWorks, pendingReports, pendingFeedback, todayNewUsers, todayNewWorks] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.work.count(),
      this.prisma.work.count({ where: { status: "published" } }),
      this.prisma.work.count({ where: { status: "pending" } }),
      this.prisma.report.count({ where: { status: { in: ["pending", "processing"] } } }),
      this.prisma.feedback.count({ where: { status: { in: ["pending", "processing"] } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startToday } } }),
      this.prisma.work.count({ where: { createdAt: { gte: startToday } } })
    ]);
    return {
      metrics: { totalUsers, totalWorks, publishedWorks, pendingWorks, todayNewUsers, todayNewWorks },
      // 待办：举报/反馈模型后续增量补充，暂只给待审核作品数
      todos: { pendingWorks, pendingReports, pendingFeedback }
    };
  }

  async financeSummary() {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(startToday);
    startMonth.setDate(1);

    const paidWhere = { status: "paid" };
    const [todayIncome, monthIncome, totalIncome, paidOrders, pendingOrders] = await Promise.all([
      this.prisma.paymentOrder.aggregate({ where: { ...paidWhere, paidAt: { gte: startToday } }, _sum: { amountFen: true } }),
      this.prisma.paymentOrder.aggregate({ where: { ...paidWhere, paidAt: { gte: startMonth } }, _sum: { amountFen: true } }),
      this.prisma.paymentOrder.aggregate({ where: paidWhere, _sum: { amountFen: true } }),
      this.prisma.paymentOrder.count({ where: paidWhere }),
      this.prisma.paymentOrder.count({ where: { status: "pending" } })
    ]);

    return {
      todayIncomeFen: sumFen(todayIncome),
      monthIncomeFen: sumFen(monthIncome),
      totalIncomeFen: sumFen(totalIncome),
      monthRefundFen: 0,
      paidOrders,
      pendingOrders
    };
  }

  async generationStats() {
    const [modelRows, qualityRows, ratioRows, paidOrders, totalUsers] = await Promise.all([
      this.prisma.generateJob.groupBy({ by: ["modelId"], _count: { _all: true } }),
      this.prisma.work.groupBy({ by: ["quality"], _count: { _all: true } }),
      this.prisma.work.groupBy({ by: ["ratio"], _count: { _all: true } }),
      this.prisma.paymentOrder.count({ where: { status: "paid" } }),
      this.prisma.user.count()
    ]);
    const byCountDesc = <T extends { count: number }>(rows: T[]) => rows.sort((a, b) => b.count - a.count);
    return {
      models: byCountDesc(modelRows.map((row) => ({ id: row.modelId, count: row._count._all }))),
      qualities: byCountDesc(qualityRows.map((row) => ({ name: row.quality || "未设置", count: row._count._all }))),
      ratios: byCountDesc(ratioRows.map((row) => ({ name: row.ratio || "未设置", count: row._count._all }))),
      conversionRate: totalUsers > 0 ? Math.round((paidOrders / totalUsers) * 1000) / 10 : 0
    };
  }

  private daysOf(range?: string) {
    return range === "30d" ? 30 : 7;
  }

  async trends(range?: string) {
    const keys = lastNDays(this.daysOf(range));
    const start = dayStart(keys[0]);
    const [users, works] = await Promise.all([
      this.prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
      this.prisma.work.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } })
    ]);
    return {
      range: `${this.daysOf(range)}d`,
      labels: keys,
      newUsers: bucketByDay(users.map((u) => u.createdAt), keys),
      newWorks: bucketByDay(works.map((w) => w.createdAt), keys)
    };
  }

  async detail(metric: string | undefined, range?: string) {
    const keys = lastNDays(this.daysOf(range));
    const start = dayStart(keys[0]);
    const m = metric || "newUsers";

    if (m === "totalUsers") {
      const series = await Promise.all(keys.map((key) => this.prisma.user.count({ where: { createdAt: { lt: nextDayStart(key) } } })));
      return { metric: m, range: `${this.daysOf(range)}d`, labels: keys, series, total: series[series.length - 1] ?? 0 };
    }

    if (m === "totalWorks") {
      const series = await Promise.all(keys.map((key) => this.prisma.work.count({ where: { createdAt: { lt: nextDayStart(key) } } })));
      return { metric: m, range: `${this.daysOf(range)}d`, labels: keys, series, total: series[series.length - 1] ?? 0 };
    }

    const isWorks = m === "newWorks" || m === "works";
    const dates = isWorks
      ? (await this.prisma.work.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } })).map((w) => w.createdAt)
      : (await this.prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } })).map((u) => u.createdAt);
    const series = bucketByDay(dates, keys);
    return { metric: isWorks ? "newWorks" : "newUsers", range: `${this.daysOf(range)}d`, labels: keys, series, total: series[series.length - 1] ?? 0 };
  }
}

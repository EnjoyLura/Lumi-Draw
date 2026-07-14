import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async plans() {
    const rows = await this.prisma.memberPlan.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      rights: p.rights,
      giftCredits: p.giftCredits,
      checkinBonus: p.checkinBonus,
      milestoneBonus: p.milestoneBonus,
      publishBonus: p.publishBonus
    }));
  }

  async status(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberPlan: true, memberExpireAt: true }
    });
    if (!user) throw new NotFoundException("用户不存在");
    const active = user.memberPlan !== "" && (!user.memberExpireAt || user.memberExpireAt.getTime() > Date.now());
    return {
      memberPlan: user.memberPlan,
      memberExpireAt: user.memberExpireAt ? user.memberExpireAt.toISOString() : null,
      isMember: active
    };
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const bySort = { orderBy: [{ sort: "asc" as const }, { id: "asc" as const }] };

@Injectable()
export class AdminConfigService {
  constructor(private readonly prisma: PrismaService) {}

  banners() {
    return this.prisma.banner.findMany(bySort);
  }
  gameplays() {
    return this.prisma.gameplay.findMany(bySort);
  }
  styles() {
    return this.prisma.style.findMany(bySort);
  }
  categories() {
    return this.prisma.category.findMany(bySort);
  }
  hotSearches() {
    return this.prisma.hotSearch.findMany({ orderBy: [{ top: "desc" }, { hot: "desc" }, { id: "asc" }] });
  }
  models() {
    return this.prisma.modelConfig.findMany(bySort);
  }
  qualities() {
    return this.prisma.qualityConfig.findMany(bySort);
  }
  ratios() {
    return this.prisma.ratioConfig.findMany(bySort);
  }
  rechargeTiers() {
    return this.prisma.rechargeTier.findMany(bySort);
  }
  memberPlans() {
    return this.prisma.memberPlan.findMany(bySort);
  }
  versions() {
    return this.prisma.appVersion.findMany({ orderBy: [{ sort: "asc" }, { id: "desc" }] });
  }
  agreements() {
    return this.prisma.agreement.findMany({ orderBy: { type: "asc" } });
  }

  async settings() {
    const rows = await this.prisma.appSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async reviewSettings() {
    const rows = await this.prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const bool = (k: string, def: boolean) => (map.has(k) ? map.get(k) === "true" : def);
    return {
      wxTextSecCheckEnabled: bool("wxTextSecCheckEnabled", true),
      wxImageSecCheckEnabled: bool("wxImageSecCheckEnabled", true),
      manualReviewEnabled: bool("manualReviewEnabled", true),
      autoPublishAfterPass: bool("autoPublishAfterPass", false)
    };
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

const enabledOrder = { where: { enabled: true }, orderBy: [{ sort: "asc" as const }, { id: "asc" as const }] };
const defaultAgreements: Record<string, { title: string; content: string }> = {
  user: {
    title: "用户协议",
    content: "欢迎使用露米绘画。使用本服务即表示您同意遵守平台规则，不生成违法违规、侵权或伤害他人的内容。"
  },
  privacy: {
    title: "隐私政策",
    content: "我们仅在提供登录、创作、支付、审核和客服所必需的范围内处理您的信息，并按法律法规要求保护数据安全。"
  },
  recharge: {
    title: "充值协议",
    content: "积分属于平台虚拟权益，仅用于露米绘画内的 AI 生成等服务。充值前请确认方案内容，支付成功后积分实时入账。"
  },
  membership: {
    title: "会员服务协议",
    content: "会员权益包括积分赠送、签到加成和优先体验等，以页面展示和后台配置为准。"
  }
};

@Injectable()
export class ConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService
  ) {}

  async getBanners() {
    const rows = await this.prisma.banner.findMany(enabledOrder);
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      imageUrl: this.uploads.readUrl(b.imageUrl, "public"),
      action: b.action,
      sort: b.sort
    }));
  }

  async getGameplays() {
    const rows = await this.prisma.gameplay.findMany(enabledOrder);
    return rows.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      imageUrl: this.uploads.readUrl(g.imageUrl, "public"),
      uses: g.uses,
      hot: g.hot
    }));
  }

  async getStyles() {
    const rows = await this.prisma.style.findMany(enabledOrder);
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      prompt: s.prompt,
      imageUrl: this.uploads.readUrl(s.imageUrl, "public"),
      uses: s.uses
    }));
  }

  async getCategories() {
    const rows = await this.prisma.category.findMany(enabledOrder);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.count
    }));
  }

  async getHotSearches() {
    const rows = await this.prisma.hotSearch.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    return rows.map((h) => ({
      id: h.id,
      keyword: h.keyword,
      hot: h.hot,
      top: h.top
    }));
  }

  async getModels() {
    const rows = await this.prisma.modelConfig.findMany(enabledOrder);
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      tags: m.tags,
      badge: m.badge,
      costCredits: m.costCredits,
      supportsTextToImage: m.supportsTextToImage,
      supportsImageToImage: m.supportsImageToImage
    }));
  }

  async getQualities() {
    const rows = await this.prisma.qualityConfig.findMany(enabledOrder);
    return rows.map((q) => ({
      id: q.id,
      label: q.label,
      pixel: q.pixel,
      multiplier: q.multiplier
    }));
  }

  async getRatios() {
    const rows = await this.prisma.ratioConfig.findMany(enabledOrder);
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description
    }));
  }

  async getRechargeTiers() {
    const rows = await this.prisma.rechargeTier.findMany(enabledOrder);
    return rows.map((r) => ({
      id: r.id,
      price: r.price,
      credits: r.credits,
      bonus: r.bonus
    }));
  }

  async getMemberPlans() {
    const rows = await this.prisma.memberPlan.findMany(enabledOrder);
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

  async getAnnouncements() {
    const rows = await this.prisma.announcement.findMany({
      where: { enabled: true },
      orderBy: [{ popup: "desc" }, { id: "desc" }]
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      action: a.action,
      popup: a.popup,
      rangeText: a.rangeText,
      createdAt: a.createdAt.toISOString()
    }));
  }

  async getChangelog() {
    const rows = await this.prisma.appVersion.findMany({
      orderBy: [{ sort: "asc" }, { id: "desc" }]
    });
    return rows.map((v) => ({
      id: v.id,
      version: v.version,
      releasedAt: v.releasedAt,
      items: v.items
    }));
  }

  async getAgreement(type: string) {
    const row = await this.prisma.agreement.findUnique({ where: { type } });
    if (!row) {
      const fallback = defaultAgreements[type];
      if (!fallback) throw new NotFoundException(`协议不存在: ${type}`);
      return {
        type,
        title: fallback.title,
        content: fallback.content,
        updatedAt: ""
      };
    }
    return {
      type: row.type,
      title: row.title,
      content: row.content,
      updatedAt: row.updatedAt.toISOString()
    };
  }

  async getSettings() {
    const rows = await this.prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return {
      reviewMode: map.get("reviewMode") ?? "auto",
      manualReviewEnabled: (map.get("manualReviewEnabled") ?? "true") === "true"
    };
  }

  async getCreditsConfig() {
    const row = await this.prisma.appSetting.findUnique({ where: { key: "creditsConfig" } });
    try {
      const value = row ? JSON.parse(row.value) : {};
      return { publishReward: Number(value.publishReward ?? 50) };
    } catch {
      return { publishReward: 50 };
    }
  }

  async getBootstrap() {
    const [
      banners,
      gameplays,
      categories,
      hotSearches,
      models,
      styles,
      qualities,
      ratios,
      rechargeTiers,
      memberPlans,
      announcements,
      settings,
      creditsConfig
    ] = await Promise.all([
      this.getBanners(),
      this.getGameplays(),
      this.getCategories(),
      this.getHotSearches(),
      this.getModels(),
      this.getStyles(),
      this.getQualities(),
      this.getRatios(),
      this.getRechargeTiers(),
      this.getMemberPlans(),
      this.getAnnouncements(),
      this.getSettings(),
      this.getCreditsConfig()
    ]);

    return {
      user: null,
      banners,
      gameplays,
      categories,
      hotSearches,
      models,
      styles,
      qualities,
      ratios,
      rechargeTiers,
      memberPlans,
      announcements,
      settings,
      creditsConfig
    };
  }
}

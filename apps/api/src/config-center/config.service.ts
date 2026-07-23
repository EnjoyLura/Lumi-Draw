import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

const enabledOrder = { where: { enabled: true }, orderBy: [{ sort: "asc" as const }, { id: "asc" as const }] };

function resolveBannerAction(action: string, title: string) {
  const value = action.trim();
  if (["创作页", "create"].includes(value)) {
    if (/签到/.test(title)) return "checkin";
    if (/发布作品/.test(title)) return "publish";
    if (/gpt\s*image\s*2/i.test(title)) return "create-gpt-image-2";
  }
  const aliases: Record<string, string> = {
    "签到页": "checkin", "会员页": "membership", "发布页": "publish", "发布作品页": "publish",
    "充值页": "recharge", "邀请页": "invite", "活动页": "create", "无": "none"
  };
  return aliases[value] || value;
}

const defaultAgreements: Record<string, { title: string; content: string }> = {
  user: {
    title: "用户协议",
    content: "欢迎使用露米绘画。使用本服务即表示您同意遵守平台规则，不生成违法违规、侵权或伤害他人的内容。"
  },
  privacy: {
    title: "隐私政策",
    content: `更新日期：2026年7月23日
生效日期：2026年7月23日

露米绘画AI运营者（以下简称“我们”）重视您的个人信息与隐私安全。本政策说明我们在提供微信小程序服务时如何处理和保护您的信息。

一、我们处理的信息
1. 登录与账号：您登录时，我们通过微信登录能力取得用于识别账号的必要标识，不会取得您的微信密码。
2. 个人资料：仅在您主动选择或填写时处理头像、昵称、个人简介等资料。
3. 创作内容：处理您提交的提示词、参考图片、生成结果、作品标题和描述，用于完成AI创作、保存作品与内容安全审核。
4. 交易与权益：处理订单号、支付状态、金额、积分与会员权益记录。支付由微信支付处理，我们不收集银行卡号或支付密码。
5. 客服与反馈：处理您主动提交的反馈内容、图片和联系方式，用于解决问题。
6. 运行安全：为保障服务稳定与账号安全，服务器会记录必要的访问时间、请求状态和错误日志。

二、使用目的与共享
我们仅为登录、AI创作、图片存储与展示、支付结算、内容审核、客服和安全保障使用上述信息。为完成服务，必要信息可能由微信、云存储与内容分发服务商、AI生成服务商处理；我们要求合作方按约定保护信息，不将信息用于无关目的。

三、保存与保护
信息原则上存储在中国境内，并仅在实现目的或法律要求的期限内保存。我们采取访问控制、传输加密、密钥隔离和备份等措施保护信息。

四、您的权利
您可以在小程序内查看、修改个人资料，管理或删除作品；也可以在“设置—注销账号”中申请注销。注销后，个人资料、作品与创作记录将清除，法律法规要求保留的交易记录将在法定期限内隔离保存。

五、未成年人保护
未满十四周岁的用户应在监护人同意和指导下使用本服务。请勿提交与创作无关的敏感个人信息。

六、联系我们
如对本政策、个人信息或账号注销有疑问，可通过“设置—联系客服”或“体验反馈”联系我们。`
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
      action: resolveBannerAction(b.action, b.title),
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
      reviewMode: map.get("reviewMode") ?? "manual",
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

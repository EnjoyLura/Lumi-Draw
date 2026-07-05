import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const banners = [
  { id: 1, title: "签到送好礼", description: "每日签到领积分，连续7天送高级模型体验券", action: "签到页", sort: 1, enabled: true },
  { id: 2, title: "GPT Image 2 全新上线", description: "画质更细腻，理解力更强，创作效果飞跃提升", action: "创作页", sort: 2, enabled: true },
  { id: 3, title: "发布作品送积分", description: "发布原创作品即得50积分，被收藏额外奖励", action: "创作页", sort: 3, enabled: true },
  { id: 4, title: "会员限时5折", description: "年度会员立减50%，每日生成次数翻倍不限量", action: "会员页", sort: 4, enabled: false }
];

const gameplays = [
  { id: 1, name: "人物美颜", description: "一键美颜，智能磨皮提亮肤色", uses: "12.6w", hot: true, enabled: true, sort: 1 },
  { id: 2, name: "证件照", description: "快速生成标准规格证件照", uses: "8.3w", hot: true, enabled: true, sort: 2 },
  { id: 3, name: "宠物头像", description: "萌宠专属卡通头像生成", uses: "5.1w", hot: false, enabled: true, sort: 3 },
  { id: 4, name: "古风国潮", description: "国风古韵人像与场景创作", uses: "4.8w", hot: false, enabled: true, sort: 4 },
  { id: 5, name: "Q版头像", description: "可爱Q版卡通形象定制", uses: "6.2w", hot: true, enabled: true, sort: 5 },
  { id: 6, name: "Logo设计", description: "AI辅助品牌Logo灵感生成", uses: "3.9w", hot: false, enabled: false, sort: 6 }
];

const styles = [
  { id: 1, name: "赛博朋克", uses: 9800, prompt: "cyberpunk style, neon lights, futuristic city, high detail" },
  { id: 2, name: "国风", uses: 8600, prompt: "chinese ink painting style, traditional, elegant, misty" },
  { id: 3, name: "二次元", uses: 12400, prompt: "anime style, soft colors, clean lineart, studio ghibli" },
  { id: 4, name: "写实", uses: 7300, prompt: "photorealistic, ultra detailed, natural lighting, 8k" },
  { id: 5, name: "油画", uses: 4200, prompt: "oil painting style, impressionist, textured brushstrokes" },
  { id: 6, name: "水彩", uses: 3900, prompt: "watercolor style, soft wash, pastel, delicate" },
  { id: 7, name: "梦幻", uses: 5100, prompt: "dreamy, ethereal, surreal, pastel colors, glowing" },
  { id: 8, name: "极简", uses: 2600, prompt: "minimalist style, clean lines, simple, negative space" },
  { id: 9, name: "像素", uses: 2100, prompt: "pixel art, 16-bit, retro game style, colorful" },
  { id: 10, name: "暗黑", uses: 3300, prompt: "dark gothic style, dramatic lighting, moody, high contrast" }
];

const categories = [
  { id: 1, name: "二次元", count: 9800 },
  { id: 2, name: "风景", count: 7200 },
  { id: 3, name: "建筑", count: 3100 },
  { id: 4, name: "表情包", count: 5400 },
  { id: 5, name: "写实", count: 6800 },
  { id: 6, name: "国风", count: 8600 },
  { id: 7, name: "人像", count: 9100 },
  { id: 8, name: "动物", count: 4300 },
  { id: 9, name: "抽象", count: 2600 }
];

const hotSearches = [
  { id: 1, keyword: "赛博朋克", hot: 9800, top: true },
  { id: 2, keyword: "古风少女", hot: 8600, top: false },
  { id: 3, keyword: "证件照", hot: 7200, top: false },
  { id: 4, keyword: "宠物头像", hot: 5400, top: false },
  { id: 5, keyword: "二次元", hot: 12400, top: true },
  { id: 6, keyword: "Logo设计", hot: 3900, top: false }
];

// 真实接入的 KIE 模型（见 agent.md 接入模型）
const models = [
  { id: "gpt-image-2", providerModel: "gpt-image-2", name: "GPT Image 2", description: "画质细腻·理解力强", tags: ["写实", "高清"], costCredits: 15, badge: "推荐", supportsTextToImage: true, supportsImageToImage: true, sort: 1 },
  { id: "nano-banana-2", providerModel: "nano-banana-2", name: "Nano Banana 2", description: "速度极快·性价比高", tags: ["快速", "全能"], costCredits: 8, badge: "性价比", supportsTextToImage: true, supportsImageToImage: true, sort: 2 },
  { id: "nano-banana-pro", providerModel: "nano-banana-pro", name: "Nano Banana Pro", description: "专业级细节·高保真输出", tags: ["专业", "高保真"], costCredits: 18, badge: "NEW", supportsTextToImage: true, supportsImageToImage: true, sort: 3 },
  { id: "seedream-4-5", providerModel: "seedream-4-5", name: "Seedream 4.5", description: "艺术感强·风格多样", tags: ["艺术", "多样"], costCredits: 12, badge: "", supportsTextToImage: true, supportsImageToImage: true, sort: 4 }
];

const qualities = [
  { id: 1, label: "全高清 1K", pixel: "1024px", multiplier: 1, sort: 1 },
  { id: 2, label: "超清 2K", pixel: "2048px", multiplier: 1.5, sort: 2 },
  { id: 3, label: "超高清 4K", pixel: "4096px", multiplier: 2, sort: 3 }
];

const ratios = [
  { id: 1, label: "1:1", description: "方形", sort: 1 },
  { id: 2, label: "3:4", description: "竖版", sort: 2 },
  { id: 3, label: "4:3", description: "横版", sort: 3 },
  { id: 4, label: "16:9", description: "宽屏", sort: 4 },
  { id: 5, label: "9:16", description: "手机竖屏", sort: 5 }
];

const rechargeTiers = [
  { id: 1, price: 6, credits: 60, bonus: 0, sort: 1 },
  { id: 2, price: 18, credits: 180, bonus: 10, sort: 2 },
  { id: 3, price: 30, credits: 300, bonus: 30, sort: 3 },
  { id: 4, price: 68, credits: 680, bonus: 100, sort: 4 },
  { id: 5, price: 128, credits: 1280, bonus: 280, sort: 5 }
];

const memberPlans = [
  { id: 1, name: "月卡", price: 18, rights: "每日20次·1K无限", giftCredits: 100, checkinBonus: 5, sort: 1 },
  { id: 2, name: "季卡", price: 48, rights: "每日30次·2K无限", giftCredits: 350, checkinBonus: 8, sort: 2 },
  { id: 3, name: "年卡", price: 168, rights: "每日不限·4K无限·专属模型", giftCredits: 1500, checkinBonus: 15, sort: 3 }
];

const versions = [
  { id: 1, version: "v1.2.0", releasedAt: "2025-06-20", sort: 1, items: [{ type: "新增", text: "新增 GPT Image 2 模型，画质更细腻" }, { type: "优化", text: "优化生成速度与排队体验" }, { type: "修复", text: "修复暗色模式下部分组件显示异常" }] },
  { id: 2, version: "v1.1.0", releasedAt: "2025-05-10", sort: 2, items: [{ type: "新增", text: "新增会员体系，月卡/季卡/年卡" }, { type: "新增", text: "新增每日签到与连续签到里程碑奖励" }, { type: "优化", text: "优化个人主页与画廊管理功能" }] },
  { id: 3, version: "v1.0.0", releasedAt: "2025-03-01", sort: 3, items: [{ type: "新增", text: "首个正式版本发布" }] }
];

const agreements = [
  { type: "user", title: "用户协议", content: "欢迎使用露米绘画。使用本服务即表示您同意本用户协议。请合理使用 AI 生成能力，不得生成违法违规内容。" },
  { type: "privacy", title: "隐私政策", content: "我们重视您的隐私。本政策说明我们如何收集、使用与保护您的个人信息。仅在提供服务所必需的范围内处理数据。" },
  { type: "membership", title: "会员服务协议", content: "会员权益包含每日生成次数、分辨率上限与专属模型等。会员为虚拟服务，开通后除法律规定外不支持退款。" }
];

const settings = [
  { key: "reviewMode", value: "auto" },
  { key: "manualReviewEnabled", value: "true" }
];

async function main() {
  for (const b of banners) {
    await prisma.banner.upsert({ where: { id: b.id }, update: b, create: b });
  }
  for (const g of gameplays) {
    await prisma.gameplay.upsert({ where: { id: g.id }, update: g, create: g });
  }
  for (const s of styles) {
    await prisma.style.upsert({ where: { id: s.id }, update: s, create: s });
  }
  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
  }
  for (const h of hotSearches) {
    await prisma.hotSearch.upsert({ where: { id: h.id }, update: h, create: h });
  }
  for (const m of models) {
    await prisma.modelConfig.upsert({ where: { id: m.id }, update: m, create: m });
  }
  for (const q of qualities) {
    await prisma.qualityConfig.upsert({ where: { id: q.id }, update: q, create: q });
  }
  for (const r of ratios) {
    await prisma.ratioConfig.upsert({ where: { id: r.id }, update: r, create: r });
  }
  for (const t of rechargeTiers) {
    await prisma.rechargeTier.upsert({ where: { id: t.id }, update: t, create: t });
  }
  for (const p of memberPlans) {
    await prisma.memberPlan.upsert({ where: { id: p.id }, update: p, create: p });
  }
  for (const v of versions) {
    await prisma.appVersion.upsert({ where: { id: v.id }, update: v, create: v });
  }
  for (const a of agreements) {
    await prisma.agreement.upsert({ where: { type: a.type }, update: a, create: a });
  }
  for (const s of settings) {
    await prisma.appSetting.upsert({ where: { key: s.key }, update: s, create: s });
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

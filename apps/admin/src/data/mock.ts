// 管理后台模拟数据（移植自 prototype/admin-prototype.html）
// 随对应页面迁移逐步补齐字段，未迁移页面的数据后续补充。
import checkinGiftBanner from "../assets/banners/checkin-gift.webp";
import gptImage2Banner from "../assets/banners/gpt-image-2.webp";
import membershipOfferBanner from "../assets/banners/membership-offer.webp";
import publishRewardBanner from "../assets/banners/publish-reward.webp";

export interface AdminUser {
  id: number;
  name: string;
  avatar: string;
  color: string;
  bio: string;
  gender: string;
  credits: number;
  member: string;
  status: string;
  works: number;
  likes: number;
  followers: number;
  following: number;
  reg: string;
  phone: string;
  active: boolean;
}

export interface AdminWork {
  id: number;
  userId: number;
  title: string;
  desc: string;
  prompt: string;
  model: string;
  ratio: string;
  quality: string;
  style: string;
  likes: number;
  favorites: number;
  remakes: number;
  status: string;
  featured: boolean;
  recommend: boolean;
  time: string;
  tags?: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
  authorName?: string;
}

export interface AdminModel {
  id: string;
  name: string;
  desc: string;
  tags: string[];
  cost: number;
  badge: string;
  on: boolean;
}

export interface AdminReport {
  id: number;
  reporter: number;
  workId: number;
  reason: string;
  status: string;
  time: string;
}

export interface AdminFeedback {
  id: number;
  userId: number;
  content: string;
  type: string;
  status: string;
  time: string;
  imgs: number;
  wechat: string;
  reply?: string;
}

export interface MemberPlan {
  id: number;
  name: string;
  price: number;
  rights: string;
  gift: number;
  ckBonus: number;
  milestoneBonus?: number;
  publishBonus?: number;
}

export const IMG = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/300`;

export const USERS: AdminUser[] = [
  { id: 1, name: "云端造梦师", avatar: "梦", color: "#5B9FE8", bio: "用AI描绘心中的梦境", gender: "女", credits: 860, member: "年卡", status: "正常", works: 48, likes: 1200, followers: 326, following: 58, reg: "2025-03-12", phone: "138****8801", active: true },
  { id: 2, name: "星辰大海", avatar: "星", color: "#6FD4B0", bio: "探索AI的无限可能", gender: "男", credits: 320, member: "月卡", status: "正常", works: 36, likes: 890, followers: 215, following: 42, reg: "2025-04-02", phone: "139****2205", active: true },
  { id: 3, name: "月光如水", avatar: "月", color: "#FFB59A", bio: "月光下的AI画家", gender: "女", credits: 1580, member: "季卡", status: "正常", works: 52, likes: 2100, followers: 580, following: 73, reg: "2025-02-18", phone: "137****6633", active: true },
  { id: 4, name: "风之绘师", avatar: "风", color: "#B8A5E3", bio: "风中捕捉灵感", gender: "男", credits: 90, member: "无", status: "封禁", works: 29, likes: 670, followers: 180, following: 35, reg: "2025-05-20", phone: "135****7788", active: false },
  { id: 5, name: "光影魔术", avatar: "光", color: "#FFE08A", bio: "玩转光与影的魔法", gender: "男", credits: 410, member: "无", status: "正常", works: 41, likes: 1500, followers: 410, following: 67, reg: "2025-05-28", phone: "136****9900", active: true },
  { id: 6, name: "涂鸦小新", avatar: "涂", color: "#FFA8B8", bio: "新手上路，多多指教", gender: "男", credits: 0, member: "无", status: "正常", works: 3, likes: 20, followers: 8, following: 15, reg: "2025-06-30", phone: "150****1122", active: false }
];

export const MODELS: AdminModel[] = [
  { id: "gpt2", name: "GPT Image 2", desc: "画质细腻·理解力强", tags: ["写实", "高清"], cost: 15, badge: "推荐", on: true },
  { id: "nano", name: "Nano Banana 2", desc: "速度极快·性价比高", tags: ["快速", "全能"], cost: 8, badge: "性价比", on: true },
  { id: "flux", name: "Flux Pro", desc: "艺术感强·细节丰富", tags: ["艺术", "创意"], cost: 12, badge: "NEW", on: true },
  { id: "sdxl", name: "SDXL", desc: "开源之王·风格多样", tags: ["多样", "自定义"], cost: 6, badge: "", on: true },
  { id: "dalle3", name: "DALL-E 3", desc: "语义理解·精准还原", tags: ["精准", "还原"], cost: 14, badge: "", on: false },
  { id: "mj", name: "Midjourney", desc: "艺术天花板·极致美学", tags: ["美学", "艺术"], cost: 20, badge: "推荐", on: true }
];

export function modelName(id: string) {
  const m = MODELS.find((x) => x.id === id);
  return m ? m.name : id;
}

export const WORKS: AdminWork[] = [
  { id: 1, userId: 2, title: "霓虹都市", desc: "赛博朋克风格的夜晚城市，霓虹灯光映照在雨后的街道上", prompt: "cyberpunk city at night, neon lights, rain", model: "gpt2", ratio: "3:4", quality: "2K", style: "赛博朋克", likes: 328, favorites: 92, remakes: 45, status: "已发布", featured: true, recommend: true, time: "2小时前" },
  { id: 2, userId: 3, title: "山水之间", desc: "中国水墨风格的山河画卷，云雾缭绕", prompt: "Chinese ink painting, mountains, river, misty", model: "flux", ratio: "4:3", quality: "4K", style: "国风", likes: 512, favorites: 186, remakes: 78, status: "已发布", featured: true, recommend: false, time: "3小时前" },
  { id: 3, userId: 1, title: "少女与猫", desc: "吉卜力风格的少女与猫咪，温暖柔和的光线", prompt: "anime girl with cat, soft colors, ghibli", model: "nano", ratio: "2:3", quality: "1K", style: "二次元", likes: 680, favorites: 245, remakes: 112, status: "已发布", featured: false, recommend: true, time: "5小时前" },
  { id: 4, userId: 5, title: "抽象梦境", desc: "超现实主义的梦境，漂浮的岛屿和柔和的色彩", prompt: "abstract dream, floating islands, surreal", model: "sdxl", ratio: "1:1", quality: "2K", style: "梦幻", likes: 234, favorites: 78, remakes: 31, status: "待审核", featured: false, recommend: false, time: "20分钟前" },
  { id: 5, userId: 1, title: "古风少女", desc: "身着汉服的古风少女，桃花纷飞的春日", prompt: "ancient chinese girl, hanfu, peach blossom", model: "mj", ratio: "9:16", quality: "4K", style: "国风", likes: 892, favorites: 356, remakes: 156, status: "已发布", featured: true, recommend: true, time: "8小时前" },
  { id: 6, userId: 3, title: "赛博精灵", desc: "赛博朋克风格的精灵，发光的双眼和未来服装", prompt: "cyberpunk elf, glowing eyes, futuristic", model: "gpt2", ratio: "4:3", quality: "2K", style: "赛博朋克", likes: 445, favorites: 132, remakes: 67, status: "待审核", featured: false, recommend: false, time: "35分钟前" },
  { id: 7, userId: 4, title: "水彩猫咪", desc: "柔和水彩画风的猫咪，温馨艺术感", prompt: "watercolor cat, soft brushstrokes, pastel", model: "flux", ratio: "3:4", quality: "1K", style: "水彩", likes: 567, favorites: 201, remakes: 89, status: "已下架", featured: false, recommend: false, time: "12小时前" },
  { id: 8, userId: 5, title: "极简几何", desc: "极简主义的几何艺术，干净的线条和现代感", prompt: "minimalist geometric art, clean lines", model: "sdxl", ratio: "1:1", quality: "2K", style: "极简", likes: 189, favorites: 56, remakes: 22, status: "已发布", featured: false, recommend: false, time: "1天前" },
  { id: 9, userId: 2, title: "暗黑天使", desc: "哥特风格的暗黑天使，戏剧性的光影", prompt: "dark angel, gothic, dramatic lighting", model: "mj", ratio: "9:16", quality: "4K", style: "暗黑", likes: 723, favorites: 289, remakes: 134, status: "待审核", featured: false, recommend: false, time: "1小时前" },
  { id: 10, userId: 3, title: "蒸汽城市", desc: "蒸汽朋克风格的城市，黄铜齿轮和维多利亚时代风貌", prompt: "steampunk city, brass, gears, victorian", model: "gpt2", ratio: "4:3", quality: "2K", style: "蒸汽波", likes: 356, favorites: 98, remakes: 43, status: "已发布", featured: false, recommend: false, time: "2天前" }
];

export interface AdminStyle {
  id: number;
  n: string;
  s: number;
  prompt: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export const STYLES: AdminStyle[] = [
  { id: 1, n: "赛博朋克", s: 9800, prompt: "cyberpunk style, neon lights, futuristic city, high detail", imageUrl: gptImage2Banner },
  { id: 2, n: "国风", s: 8600, prompt: "chinese ink painting style, traditional, elegant, misty", imageUrl: publishRewardBanner },
  { id: 3, n: "二次元", s: 12400, prompt: "anime style, soft colors, clean lineart, studio ghibli", imageUrl: gptImage2Banner },
  { id: 4, n: "写实", s: 7300, prompt: "photorealistic, ultra detailed, natural lighting, 8k", imageUrl: publishRewardBanner },
  { id: 5, n: "油画", s: 4200, prompt: "oil painting style, impressionist, textured brushstrokes", imageUrl: gptImage2Banner },
  { id: 6, n: "水彩", s: 3900, prompt: "watercolor style, soft wash, pastel, delicate", imageUrl: publishRewardBanner },
  { id: 7, n: "梦幻", s: 5100, prompt: "dreamy, ethereal, surreal, pastel colors, glowing", imageUrl: gptImage2Banner },
  { id: 8, n: "极简", s: 2600, prompt: "minimalist style, clean lines, simple, negative space", imageUrl: publishRewardBanner },
  { id: 9, n: "像素", s: 2100, prompt: "pixel art, 16-bit, retro game style, colorful", imageUrl: gptImage2Banner },
  { id: 10, n: "暗黑", s: 3300, prompt: "dark gothic style, dramatic lighting, moody, high contrast", imageUrl: publishRewardBanner }
];

export interface AdminBanner {
  id: number;
  title: string;
  desc: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  action: string;
  sort: number;
  on: boolean;
}

export interface AdminGameplay {
  id: number;
  name: string;
  desc: string;
  uses: string;
  hot: boolean;
  on: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface AdminCategory {
  id: number;
  n: string;
  cnt: number;
}

export interface AdminHotSearch {
  id: number;
  k: string;
  hot: number;
  top: boolean;
  sort?: number;
}

export interface AdminQuality {
  id: number;
  label: string;
  pixel: string;
  mult: number;
  on: boolean;
}

export interface AdminRatio {
  id: number;
  label: string;
  desc: string;
  on: boolean;
}

export const MODEL_BADGES = ["无", "推荐", "性价比", "NEW", "热门"];

export const BANNERS: AdminBanner[] = [
  { id: 1, title: "签到送好礼", desc: "每日签到领积分，连续7天送高级模型体验券", imageUrl: checkinGiftBanner, action: "checkin", sort: 1, on: true },
  { id: 2, title: "GPT Image 2 全新上线", desc: "画质更细腻，理解力更强，创作效果飞跃提升", imageUrl: gptImage2Banner, action: "create-gpt-image-2", sort: 2, on: true },
  { id: 3, title: "发布作品送积分", desc: "发布原创作品即得50积分，被收藏额外奖励", imageUrl: publishRewardBanner, action: "publish", sort: 3, on: true },
  { id: 4, title: "会员限时5折", desc: "年度会员立减50%，每日生成次数翻倍不限量", imageUrl: membershipOfferBanner, action: "会员页", sort: 4, on: false }
];

export const GAMEPLAYS: AdminGameplay[] = [
  { id: 1, name: "人物美颜", desc: "一键美颜，智能磨皮提亮肤色", uses: "12.6w", hot: true, on: true, imageUrl: publishRewardBanner },
  { id: 2, name: "证件照", desc: "快速生成标准规格证件照", uses: "8.3w", hot: true, on: true, imageUrl: gptImage2Banner },
  { id: 3, name: "宠物头像", desc: "萌宠专属卡通头像生成", uses: "5.1w", hot: false, on: true, imageUrl: publishRewardBanner },
  { id: 4, name: "古风国潮", desc: "国风古韵人像与场景创作", uses: "4.8w", hot: false, on: true, imageUrl: gptImage2Banner },
  { id: 5, name: "Q版头像", desc: "可爱Q版卡通形象定制", uses: "6.2w", hot: true, on: true, imageUrl: publishRewardBanner },
  { id: 6, name: "Logo设计", desc: "AI辅助品牌Logo灵感生成", uses: "3.9w", hot: false, on: false, imageUrl: gptImage2Banner }
];

export const HOT_SEARCHES: AdminHotSearch[] = [
  { id: 1, k: "赛博朋克", hot: 9800, top: true, sort: 1 },
  { id: 2, k: "古风少女", hot: 8600, top: false, sort: 2 },
  { id: 3, k: "证件照", hot: 7200, top: false, sort: 3 },
  { id: 4, k: "宠物头像", hot: 5400, top: false, sort: 4 },
  { id: 5, k: "二次元", hot: 12400, top: true, sort: 5 },
  { id: 6, k: "Logo设计", hot: 3900, top: false, sort: 6 }
];

export const CATEGORIES: AdminCategory[] = [
  { id: 1, n: "二次元", cnt: 9800 },
  { id: 2, n: "风景", cnt: 7200 },
  { id: 3, n: "建筑", cnt: 3100 },
  { id: 4, n: "表情包", cnt: 5400 },
  { id: 5, n: "写实", cnt: 6800 },
  { id: 6, n: "国风", cnt: 8600 },
  { id: 7, n: "人像", cnt: 9100 },
  { id: 8, n: "动物", cnt: 4300 },
  { id: 9, n: "抽象", cnt: 2600 }
];

export const QUALITIES: AdminQuality[] = [
  { id: 1, label: "全高清 1K", pixel: "1024px", mult: 1, on: true },
  { id: 2, label: "超清 2K", pixel: "2048px", mult: 1.5, on: true },
  { id: 3, label: "超高清 4K", pixel: "4096px", mult: 2, on: true }
];

export const RATIOS: AdminRatio[] = [
  { id: 1, label: "1:1", desc: "方形", on: true },
  { id: 2, label: "3:4", desc: "竖版", on: true },
  { id: 3, label: "4:3", desc: "横版", on: true },
  { id: 4, label: "16:9", desc: "宽屏", on: true },
  { id: 5, label: "9:16", desc: "手机竖屏", on: true }
];

export function nextId(arr: Array<{ id: number }>): number {
  return arr.reduce((m, x) => Math.max(m, x.id), 0) + 1;
}

export const REPORTS: AdminReport[] = [
  { id: 1, reporter: 5, workId: 7, reason: "色情低俗", status: "待处理", time: "10分钟前" },
  { id: 2, reporter: 2, workId: 9, reason: "侵权盗版", status: "待处理", time: "1小时前" },
  { id: 3, reporter: 3, workId: 1, reason: "垃圾广告", status: "已处理", time: "昨天" }
];

export const FEEDBACKS: AdminFeedback[] = [
  { id: 1, userId: 2, content: "希望增加更多国风模型，现在的风格不够多", type: "优化建议", imgs: 0, wechat: "", status: "待处理", time: "30分钟前" },
  { id: 2, userId: 5, content: "生成图片有时候会失败，但积分被扣了，麻烦核实一下", type: "Bug反馈", imgs: 2, wechat: "lumi_user_05", status: "处理中", time: "2小时前" },
  { id: 3, userId: 1, content: "整体体验很流畅，客服响应也快，点赞！", type: "体验反馈", imgs: 0, wechat: "", status: "已解决", time: "昨天" }
];

export const FB_STATUS = ["待处理", "处理中", "已解决", "不采纳"];

export const FB_TYPE_COLOR: Record<string, string> = { Bug反馈: "danger", 体验反馈: "info", 优化建议: "purple" };

export interface AdminAnnounce {
  id: number;
  title: string;
  summary: string;
  action: string;
  popup: boolean;
  time: string;
  range: string;
}

export const ANNOUNCEMENTS: AdminAnnounce[] = [
  { id: 1, title: "夏日创作季活动", summary: "活动期间创作作品即可参与抽奖，有机会获得1000积分大奖！", action: "活动页", popup: true, time: "2025-06-25", range: "06-25 ~ 07-10" },
  { id: 2, title: "系统维护通知", summary: "7月5日凌晨2:00-4:00进行系统维护，期间服务暂停", action: "无", popup: false, time: "2025-06-28", range: "07-05" },
  { id: 3, title: "新模型上线公告", summary: "GPT Image 2 正式上线，画质与理解力全面提升，欢迎体验", action: "创作页", popup: false, time: "2025-06-20", range: "长期" }
];

export const ANNOUNCE_ACTIONS = ["无", "活动页", "创作页", "会员页", "签到页"];

export interface AdminPush {
  id: number;
  title: string;
  content: string;
  target: string;
  time: string;
  status: string;
}

export const PUSHES: AdminPush[] = [
  { id: 1, title: "新模型上线通知", content: "GPT Image 2 正式上线，欢迎前往创作页体验全新画质。", target: "全部用户", time: "昨天 15:00", status: "已发送" },
  { id: 2, title: "会员限时活动", content: "年度会员限时5折，每日生成次数翻倍，速来抢购！", target: "会员用户", time: "06-25 10:00", status: "已发送" },
  { id: 3, title: "系统维护通知", content: "7月5日凌晨2:00-4:00进行系统维护。", target: "全部用户", time: "06-20 09:00", status: "已撤回" }
];

export const PUSH_TARGETS = ["全部用户", "会员用户", "活跃用户", "指定用户"];

export const MEMBER_PLANS: MemberPlan[] = [
  { id: 1, name: "月卡", price: 18, rights: "每日20次·1K无限", gift: 100, ckBonus: 5 },
  { id: 2, name: "季卡", price: 48, rights: "每日30次·2K无限", gift: 350, ckBonus: 8 },
  { id: 3, name: "年卡", price: 168, rights: "每日不限·4K无限·专属模型", gift: 1500, ckBonus: 15 }
];

export interface AdminRecharge {
  id: number;
  price: number;
  credits: number;
  bonus: number;
  on: boolean;
}

export const RECHARGE_TIERS: AdminRecharge[] = [
  { id: 1, price: 6, credits: 60, bonus: 0, on: true },
  { id: 2, price: 18, credits: 180, bonus: 10, on: true },
  { id: 3, price: 30, credits: 300, bonus: 30, on: true },
  { id: 4, price: 68, credits: 680, bonus: 100, on: true },
  { id: 5, price: 128, credits: 1280, bonus: 280, on: true }
];

export interface CheckinTier {
  day: number;
  c: number;
}

export const CHECKIN: { base: number; tiers: CheckinTier[] } = {
  base: 10,
  tiers: [
    { day: 1, c: 10 },
    { day: 2, c: 10 },
    { day: 3, c: 15 },
    { day: 4, c: 15 },
    { day: 5, c: 20 },
    { day: 6, c: 20 },
    { day: 7, c: 50 }
  ]
};

export interface AdminTxn {
  id: number | string;
  userId: number;
  userName?: string;
  type: string;
  amount: string;
  credits: string;
  status: string;
  time: string;
  orderNo?: string;
  transactionId?: string;
  channel?: string;
}

export const TRANSACTIONS: AdminTxn[] = [
  { id: 1, userId: 2, type: "充值", amount: "+68元", credits: "+680", status: "成功", time: "今天 14:30" },
  { id: 2, userId: 3, type: "消费", amount: "-15积分", credits: "", status: "成功", time: "今天 13:05" },
  { id: 3, userId: 1, type: "充值", amount: "+18元", credits: "+180", status: "成功", time: "今天 11:20" },
  { id: 4, userId: 5, type: "退款", amount: "-6元", credits: "-60", status: "已退款", time: "昨天 20:10" },
  { id: 5, userId: 2, type: "会员", amount: "+168元", credits: "年卡", status: "成功", time: "昨天 16:40" },
  { id: 6, userId: 4, type: "消费", amount: "-20积分", credits: "", status: "失败", time: "昨天 09:15" },
  { id: 7, userId: 1, type: "签到", amount: "+10积分", credits: "+10", status: "成功", time: "今天 08:12" },
  { id: 8, userId: 3, type: "签到", amount: "+15积分", credits: "+15", status: "成功", time: "今天 07:50" },
  { id: 9, userId: 5, type: "充值", amount: "+30元", credits: "+300", status: "失败", time: "昨天 18:22" }
];

export const TREND = {
  users: [120, 145, 132, 178, 210, 196, 245],
  works: [860, 920, 1050, 980, 1120, 1240, 1380],
  income: [3200, 3800, 3500, 4200, 4800, 4500, 5600]
};

export const WEEK = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function userName(id: number) {
  const u = USERS.find((x) => x.id === id);
  return u ? u.name : "用户" + id;
}

const STATUS_TYPE: Record<string, string> = {
  正常: "success",
  已发布: "success",
  成功: "success",
  已回复: "success",
  已处理: "success",
  已解决: "success",
  待审核: "warning",
  待处理: "warning",
  待回复: "warning",
  处理中: "info",
  封禁: "danger",
  已下架: "muted",
  不采纳: "muted",
  已撤回: "muted",
  失败: "danger",
  已退款: "purple"
};

export function statusType(s: string) {
  return STATUS_TYPE[s] || "muted";
}

export const VER_TYPES = ["新增", "优化", "修复"];

export const VER_TYPE_COLOR: Record<string, string> = { 新增: "success", 优化: "info", 修复: "warning" };

export interface VersionItem {
  type: string;
  text: string;
}

export interface AdminVersion {
  id: number;
  ver: string;
  time: string;
  items: VersionItem[];
}

export const VERSIONS: AdminVersion[] = [
  { id: 1, ver: "v1.2.0", time: "2025-06-20", items: [{ type: "新增", text: "新增 GPT Image 2 模型，画质更细腻" }, { type: "优化", text: "优化生成速度与排队体验" }, { type: "修复", text: "修复暗色模式下部分组件显示异常" }] },
  { id: 2, ver: "v1.1.0", time: "2025-05-10", items: [{ type: "新增", text: "新增会员体系，月卡/季卡/年卡" }, { type: "新增", text: "新增每日签到与连续签到里程碑奖励" }, { type: "优化", text: "优化个人主页与画廊管理功能" }] },
  { id: 3, ver: "v1.0.0", time: "2025-03-01", items: [{ type: "新增", text: "首个正式版本发布" }] }
];

export const SENSITIVE: string[] = ["敏感词A", "违规词B", "广告词C", "政治敏感D"];

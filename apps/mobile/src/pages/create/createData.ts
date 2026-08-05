import { mockImage } from "../../services/mockImages";

export interface CreateModel {
  id: string;
  name: string;
  description: string;
  tags: string[];
  cost: number;
  image: string;
  badge?: string;
  badgeColor?: string;
}

export interface CreateStyle {
  name: string;
  image: string;
  prompt: string;
}

export interface QualityOption {
  label: string;
  description: string;
  icon: string;
  multiplier: number;
}

export interface RatioOption {
  label: string;
  width: number;
  height: number;
}

export interface GameplayTemplate {
  id: number;
  name: string;
  image: string;
  uses: string;
  prompt: string;
}

export const createModels: CreateModel[] = [
  {
    id: "gpt2",
    name: "图像生成模型 V3.0",
    description: "画质细腻·理解力强",
    tags: ["写实", "高清"],
    cost: 15,
    image: mockImage("gpt2", 200, 120),
    badge: "推荐",
    badgeColor: "var(--accent)"
  },
  {
    id: "nano",
    name: "Nano Banana 2",
    description: "速度极快·性价比高",
    tags: ["快速", "全能"],
    cost: 8,
    image: mockImage("nano", 200, 120),
    badge: "性价比",
    badgeColor: "var(--mint)"
  },
  {
    id: "flux",
    name: "Flux Pro",
    description: "艺术感强·细节丰富",
    tags: ["艺术", "创意"],
    cost: 12,
    image: mockImage("flux", 200, 120),
    badge: "NEW",
    badgeColor: "var(--rose)"
  },
  {
    id: "sdxl",
    name: "SDXL",
    description: "开源之王·风格多样",
    tags: ["多样", "自定义"],
    cost: 6,
    image: mockImage("sdxl", 200, 120),
    badge: "性价比",
    badgeColor: "var(--mint)"
  },
  {
    id: "dalle3",
    name: "DALL-E 3",
    description: "语义理解·精准还原",
    tags: ["精准", "还原"],
    cost: 14,
    image: mockImage("dalle", 200, 120)
  },
  {
    id: "mj",
    name: "Midjourney",
    description: "艺术天花板·极致美学",
    tags: ["美学", "艺术"],
    cost: 20,
    image: mockImage("mj", 200, 120),
    badge: "推荐",
    badgeColor: "var(--accent)"
  }
];

const stylePrompts: Record<string, string> = {
  赛博朋克: "赛博朋克风格，霓虹灯光，未来科技感，高对比度",
  赛璐璐: "赛璐璐动画风格，清晰线稿，平涂色块，明快配色",
  黑白: "黑白影像风格，丰富灰阶，强烈明暗关系",
  国风: "中国传统国风美学，典雅配色，东方意境",
  油画: "古典油画风格，细腻笔触，丰富颜料质感",
  水彩: "水彩画风格，柔和晕染，通透色彩，纸张肌理",
  二次元: "精致二次元动漫风格，清晰线稿，细腻上色",
  写实: "照片级写实风格，自然光影，真实材质，细节清晰",
  "3D": "高品质3D渲染风格，立体光影，精细材质",
  像素: "复古像素艺术风格，清晰像素块，游戏美术质感",
  蒸汽波: "蒸汽波美学，复古未来主义，霓虹渐变色彩",
  极简: "极简主义风格，简洁构图，留白，干净视觉语言",
  梦幻: "梦幻唯美风格，柔和光晕，空灵氛围，浪漫色彩",
  暗黑: "暗黑哥特风格，戏剧性光影，深色调，神秘氛围",
  复古: "复古胶片风格，怀旧色调，细腻颗粒质感"
};

export const createStyles: CreateStyle[] = Object.entries(stylePrompts).map(([name, prompt]) => ({
  name,
  prompt,
  image: mockImage(name, 100, 100)
}));

export const qualityOptions: QualityOption[] = [
  { label: "全高清1K", description: "1024px", icon: "1K", multiplier: 1 },
  { label: "超清2K", description: "2048px", icon: "2K", multiplier: 1.5 },
  { label: "超高清4K", description: "4096px", icon: "4K", multiplier: 2 }
];

export const ratioOptions: RatioOption[] = [
  { label: "1:1", width: 1, height: 1 },
  { label: "3:4", width: 3, height: 4 },
  { label: "4:3", width: 4, height: 3 },
  { label: "16:9", width: 16, height: 9 },
  { label: "9:16", width: 9, height: 16 }
];

export const countOptions = [1, 2, 3, 4];

export const gameplayTemplates: GameplayTemplate[] = [
  { id: 1, name: "人物美颜", image: mockImage("gp1", 300, 400), uses: "12.6w", prompt: "自然精致的人像美颜，保留真实五官与皮肤纹理，柔和光线，肤色通透，细节清晰" },
  { id: 2, name: "证件照", image: mockImage("gp2", 300, 400), uses: "8.3w", prompt: "正面标准证件照，人物居中，端正自然，纯色背景，光线均匀，五官清晰，专业摄影" },
  { id: 3, name: "宠物头像", image: mockImage("gp3", 300, 400), uses: "5.1w", prompt: "一只可爱的宠物头像，表情生动，主体居中，干净背景，细节丰富，适合作为社交头像" },
  { id: 4, name: "古风国潮", image: mockImage("gp4", 300, 400), uses: "4.8w", prompt: "中国古风国潮画面，传统东方美学，精致纹样，典雅配色，电影感光影，细节丰富" },
  { id: 5, name: "Q版头像", image: mockImage("gp5", 300, 400), uses: "6.2w", prompt: "可爱的Q版卡通头像，大眼睛，圆润造型，表情生动，主体居中，干净背景，精致插画" },
  { id: 6, name: "Logo设计", image: mockImage("gp6", 300, 400), uses: "3.9w", prompt: "简洁专业的品牌Logo设计，视觉识别度高，构图平衡，现代设计语言，纯色背景，可用于商业品牌" },
  { id: 7, name: "壁纸", image: mockImage("gp7", 300, 400), uses: "7.5w", prompt: "高品质手机壁纸，主体突出，构图舒适，光影细腻，色彩协调，画面细节丰富" },
  { id: 8, name: "表情包", image: mockImage("gp8", 300, 400), uses: "9.0w", prompt: "可爱有趣的表情包形象，夸张生动的表情，主体清晰，简洁背景，适合社交聊天使用" }
];

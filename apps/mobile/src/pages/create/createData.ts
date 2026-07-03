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
}

export interface QualityOption {
  label: string;
  description: string;
  icon: string;
}

export interface RatioOption {
  label: string;
  width: number;
  height: number;
}

export interface GameplayTemplate {
  name: string;
  image: string;
  uses: string;
}

export const createModels: CreateModel[] = [
  {
    id: "gpt2",
    name: "GPT Image 2",
    description: "画质细腻·理解力强",
    tags: ["写实", "高清"],
    cost: 15,
    image: "https://picsum.photos/seed/gpt2/200/120",
    badge: "推荐",
    badgeColor: "var(--accent)"
  },
  {
    id: "nano",
    name: "Nano Banana 2",
    description: "速度极快·性价比高",
    tags: ["快速", "全能"],
    cost: 8,
    image: "https://picsum.photos/seed/nano/200/120",
    badge: "性价比",
    badgeColor: "var(--mint)"
  },
  {
    id: "flux",
    name: "Flux Pro",
    description: "艺术感强·细节丰富",
    tags: ["艺术", "创意"],
    cost: 12,
    image: "https://picsum.photos/seed/flux/200/120",
    badge: "NEW",
    badgeColor: "var(--rose)"
  },
  {
    id: "sdxl",
    name: "SDXL",
    description: "开源之王·风格多样",
    tags: ["多样", "自定义"],
    cost: 6,
    image: "https://picsum.photos/seed/sdxl/200/120",
    badge: "性价比",
    badgeColor: "var(--mint)"
  },
  {
    id: "dalle3",
    name: "DALL-E 3",
    description: "语义理解·精准还原",
    tags: ["精准", "还原"],
    cost: 14,
    image: "https://picsum.photos/seed/dalle/200/120"
  },
  {
    id: "mj",
    name: "Midjourney",
    description: "艺术天花板·极致美学",
    tags: ["美学", "艺术"],
    cost: 20,
    image: "https://picsum.photos/seed/mj/200/120",
    badge: "推荐",
    badgeColor: "var(--accent)"
  }
];

export const createStyles: CreateStyle[] = [
  "赛博朋克",
  "赛璐璐",
  "黑白",
  "国风",
  "油画",
  "水彩",
  "二次元",
  "写实",
  "3D",
  "像素",
  "蒸汽波",
  "极简",
  "梦幻",
  "暗黑",
  "复古",
  "更多"
].map((name) => ({
  name,
  image: `https://picsum.photos/seed/${encodeURIComponent(name)}/100/100`
}));

export const qualityOptions: QualityOption[] = [
  { label: "全高清1K", description: "1024px", icon: "HD" },
  { label: "超清2K", description: "2048px", icon: "2K" },
  { label: "超高清4K", description: "4096px", icon: "4K" }
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
  { name: "人物美颜", image: "https://picsum.photos/seed/gp1/300/400", uses: "12.6w" },
  { name: "证件照", image: "https://picsum.photos/seed/gp2/300/400", uses: "8.3w" },
  { name: "宠物头像", image: "https://picsum.photos/seed/gp3/300/400", uses: "5.1w" },
  { name: "古风国潮", image: "https://picsum.photos/seed/gp4/300/400", uses: "4.8w" },
  { name: "Q版头像", image: "https://picsum.photos/seed/gp5/300/400", uses: "6.2w" },
  { name: "Logo设计", image: "https://picsum.photos/seed/gp6/300/400", uses: "3.9w" },
  { name: "壁纸", image: "https://picsum.photos/seed/gp7/300/400", uses: "7.5w" },
  { name: "表情包", image: "https://picsum.photos/seed/gp8/300/400", uses: "9.0w" }
];

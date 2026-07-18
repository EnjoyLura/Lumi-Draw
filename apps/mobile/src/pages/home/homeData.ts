import { mockImage } from "../../services/mockImages";

export interface HomeBanner {
  image: string;
  title: string;
  description: string;
  action: string;
}

export interface HomeAnnouncement {
  id: number;
  image: string;
  title: string;
  summary: string;
  action: string;
  rangeText: string;
  popup: boolean;
}

export interface Gameplay {
  name: string;
  image: string;
  uses: string;
  hot: boolean;
}

export interface HomeUser {
  id: number;
  name: string;
  avatar: string;
  color: string;
  worksCount?: number;
  likesCount?: number;
  followers?: number;
}

export interface HomeWork {
  id: number;
  image: string;
  userId: number;
  title: string;
  prompt: string;
  ratio: string;
  likes: number;
  published: boolean;
  status?: string;
  createdAt?: string;
  viewedAt?: string;
  liked?: boolean;
  favorited?: boolean;
  modelName?: string;
  description?: string;
  quality?: string;
  modelId?: string;
  styleName?: string;
  tags?: string[];
  favorites?: number;
  remakes?: number;
  isDetailPreloaded?: boolean;
}

export const homeBanners: HomeBanner[] = [
  {
    image: mockImage("checkin", 700, 300),
    title: "签到送好礼",
    description: "每日签到领积分，连续7天送高级模型体验券",
    action: "checkin"
  },
  {
    image: mockImage("gptimg2", 700, 300),
    title: "GPT Image 2 全新上线",
    description: "画质更细腻，理解力更强，创作效果飞跃提升",
    action: "create"
  },
  {
    image: mockImage("publish", 700, 300),
    title: "发布作品送积分",
    description: "发布原创作品即得50积分，被收藏额外奖励",
    action: "publish"
  },
  {
    image: mockImage("vip", 700, 300),
    title: "会员限时5折",
    description: "年度会员立减50%，每日生成次数翻倍不限量",
    action: "membership"
  }
];

export const homeAnnouncements: HomeAnnouncement[] = [
  {
    id: 1,
    image: mockImage("announce1", 600, 280),
    title: "夏日创作季活动",
    summary: "活动期间创作作品即可参与抽奖，有机会获得1000积分大奖！活动时间：6月25日 - 7月10日",
    action: "create",
    rangeText: "06-25 ~ 07-10",
    popup: true
  }
];

export const gameplays: Gameplay[] = [
  { name: "人物美颜", image: mockImage("gp1", 300, 400), uses: "12.6w", hot: true },
  { name: "证件照", image: mockImage("gp2", 300, 400), uses: "8.3w", hot: true },
  { name: "宠物头像", image: mockImage("gp3", 300, 400), uses: "5.1w", hot: false },
  { name: "古风国潮", image: mockImage("gp4", 300, 400), uses: "4.8w", hot: false },
  { name: "Q版头像", image: mockImage("gp5", 300, 400), uses: "6.2w", hot: true },
  { name: "Logo设计", image: mockImage("gp6", 300, 400), uses: "3.9w", hot: false },
  { name: "壁纸", image: mockImage("gp7", 300, 400), uses: "7.5w", hot: false },
  { name: "表情包", image: mockImage("gp8", 300, 400), uses: "9.0w", hot: true }
];

export const homeUsers: HomeUser[] = [
  { id: 1, name: "云端造梦师", avatar: "梦", color: "var(--accent)" },
  { id: 2, name: "星辰大海", avatar: "星", color: "var(--mint)" },
  { id: 3, name: "月光如水", avatar: "月", color: "var(--peach)" },
  { id: 4, name: "风之绘师", avatar: "风", color: "var(--lavender)" },
  { id: 5, name: "光影魔术", avatar: "光", color: "var(--lemon)" }
];

export const homeWorks: HomeWork[] = [
  {
    id: 1,
    image: mockImage("w1", 300, 420),
    userId: 2,
    title: "霓虹都市",
    prompt: "cyberpunk city at night, neon lights, rain, reflective streets",
    ratio: "3:4",
    likes: 328,
    published: true
  },
  {
    id: 2,
    image: mockImage("w2", 300, 225),
    userId: 3,
    title: "山水之间",
    prompt: "Chinese ink painting, mountains, river, misty",
    ratio: "4:3",
    likes: 512,
    published: true
  },
  {
    id: 3,
    image: mockImage("w3", 300, 450),
    userId: 1,
    title: "少女与猫",
    prompt: "anime girl with cat, soft colors, studio ghibli style",
    ratio: "2:3",
    likes: 680,
    published: true
  },
  {
    id: 4,
    image: mockImage("w4", 300, 300),
    userId: 5,
    title: "抽象梦境",
    prompt: "abstract dream, floating islands, surreal, pastel colors",
    ratio: "1:1",
    likes: 234,
    published: true
  },
  {
    id: 5,
    image: mockImage("w5", 300, 530),
    userId: 1,
    title: "古风少女",
    prompt: "ancient chinese girl, hanfu, peach blossom, spring",
    ratio: "9:16",
    likes: 892,
    published: true
  },
  {
    id: 6,
    image: mockImage("w6", 300, 225),
    userId: 3,
    title: "赛博精灵",
    prompt: "cyberpunk elf, glowing eyes, futuristic outfit",
    ratio: "4:3",
    likes: 445,
    published: true
  },
  {
    id: 7,
    image: mockImage("w7", 300, 400),
    userId: 4,
    title: "水彩猫咪",
    prompt: "watercolor cat, soft brushstrokes, pastel, cozy",
    ratio: "3:4",
    likes: 567,
    published: true
  },
  {
    id: 8,
    image: mockImage("w8", 300, 300),
    userId: 5,
    title: "极简几何",
    prompt: "minimalist geometric art, clean lines, pastel palette",
    ratio: "1:1",
    likes: 189,
    published: true
  },
  {
    id: 9,
    image: mockImage("w9", 300, 530),
    userId: 2,
    title: "暗黑天使",
    prompt: "dark angel, gothic, dramatic lighting",
    ratio: "9:16",
    likes: 723,
    published: true
  },
  {
    id: 10,
    image: mockImage("w10", 300, 225),
    userId: 3,
    title: "蒸汽城市",
    prompt: "steampunk city, brass, gears, victorian",
    ratio: "4:3",
    likes: 356,
    published: true
  },
  {
    id: 11,
    image: mockImage("w11", 300, 400),
    userId: 1,
    title: "油画风景",
    prompt: "oil painting landscape, golden field, sunset",
    ratio: "3:4",
    likes: 489,
    published: true
  },
  {
    id: 12,
    image: mockImage("w12", 300, 300),
    userId: 5,
    title: "像素冒险",
    prompt: "pixel art adventure scene, 16-bit, retro game",
    ratio: "1:1",
    likes: 278,
    published: true
  }
];

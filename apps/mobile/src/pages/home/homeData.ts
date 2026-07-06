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
  liked?: boolean;
  favorited?: boolean;
}

export const homeBanners: HomeBanner[] = [
  {
    image: "https://picsum.photos/seed/checkin/700/300",
    title: "签到送好礼",
    description: "每日签到领积分，连续7天送高级模型体验券",
    action: "checkin"
  },
  {
    image: "https://picsum.photos/seed/gptimg2/700/300",
    title: "GPT Image 2 全新上线",
    description: "画质更细腻，理解力更强，创作效果飞跃提升",
    action: "create"
  },
  {
    image: "https://picsum.photos/seed/publish/700/300",
    title: "发布作品送积分",
    description: "发布原创作品即得50积分，被收藏额外奖励",
    action: "publish"
  },
  {
    image: "https://picsum.photos/seed/vip/700/300",
    title: "会员限时5折",
    description: "年度会员立减50%，每日生成次数翻倍不限量",
    action: "membership"
  }
];

export const homeAnnouncements: HomeAnnouncement[] = [
  {
    id: 1,
    image: "https://picsum.photos/seed/announce1/600/280",
    title: "夏日创作季活动",
    summary: "活动期间创作作品即可参与抽奖，有机会获得1000积分大奖！活动时间：6月25日 - 7月10日",
    action: "create",
    rangeText: "06-25 ~ 07-10",
    popup: true
  }
];

export const gameplays: Gameplay[] = [
  { name: "人物美颜", image: "https://picsum.photos/seed/gp1/300/400", uses: "12.6w", hot: true },
  { name: "证件照", image: "https://picsum.photos/seed/gp2/300/400", uses: "8.3w", hot: true },
  { name: "宠物头像", image: "https://picsum.photos/seed/gp3/300/400", uses: "5.1w", hot: false },
  { name: "古风国潮", image: "https://picsum.photos/seed/gp4/300/400", uses: "4.8w", hot: false },
  { name: "Q版头像", image: "https://picsum.photos/seed/gp5/300/400", uses: "6.2w", hot: true },
  { name: "Logo设计", image: "https://picsum.photos/seed/gp6/300/400", uses: "3.9w", hot: false },
  { name: "壁纸", image: "https://picsum.photos/seed/gp7/300/400", uses: "7.5w", hot: false },
  { name: "表情包", image: "https://picsum.photos/seed/gp8/300/400", uses: "9.0w", hot: true }
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
    image: "https://picsum.photos/seed/w1/300/420",
    userId: 2,
    title: "霓虹都市",
    prompt: "cyberpunk city at night, neon lights, rain, reflective streets",
    ratio: "3:4",
    likes: 328,
    published: true
  },
  {
    id: 2,
    image: "https://picsum.photos/seed/w2/300/225",
    userId: 3,
    title: "山水之间",
    prompt: "Chinese ink painting, mountains, river, misty",
    ratio: "4:3",
    likes: 512,
    published: true
  },
  {
    id: 3,
    image: "https://picsum.photos/seed/w3/300/450",
    userId: 1,
    title: "少女与猫",
    prompt: "anime girl with cat, soft colors, studio ghibli style",
    ratio: "2:3",
    likes: 680,
    published: true
  },
  {
    id: 4,
    image: "https://picsum.photos/seed/w4/300/300",
    userId: 5,
    title: "抽象梦境",
    prompt: "abstract dream, floating islands, surreal, pastel colors",
    ratio: "1:1",
    likes: 234,
    published: true
  },
  {
    id: 5,
    image: "https://picsum.photos/seed/w5/300/530",
    userId: 1,
    title: "古风少女",
    prompt: "ancient chinese girl, hanfu, peach blossom, spring",
    ratio: "9:16",
    likes: 892,
    published: true
  },
  {
    id: 6,
    image: "https://picsum.photos/seed/w6/300/225",
    userId: 3,
    title: "赛博精灵",
    prompt: "cyberpunk elf, glowing eyes, futuristic outfit",
    ratio: "4:3",
    likes: 445,
    published: true
  },
  {
    id: 7,
    image: "https://picsum.photos/seed/w7/300/400",
    userId: 4,
    title: "水彩猫咪",
    prompt: "watercolor cat, soft brushstrokes, pastel, cozy",
    ratio: "3:4",
    likes: 567,
    published: true
  },
  {
    id: 8,
    image: "https://picsum.photos/seed/w8/300/300",
    userId: 5,
    title: "极简几何",
    prompt: "minimalist geometric art, clean lines, pastel palette",
    ratio: "1:1",
    likes: 189,
    published: true
  },
  {
    id: 9,
    image: "https://picsum.photos/seed/w9/300/530",
    userId: 2,
    title: "暗黑天使",
    prompt: "dark angel, gothic, dramatic lighting",
    ratio: "9:16",
    likes: 723,
    published: true
  },
  {
    id: 10,
    image: "https://picsum.photos/seed/w10/300/225",
    userId: 3,
    title: "蒸汽城市",
    prompt: "steampunk city, brass, gears, victorian",
    ratio: "4:3",
    likes: 356,
    published: true
  },
  {
    id: 11,
    image: "https://picsum.photos/seed/w11/300/400",
    userId: 1,
    title: "油画风景",
    prompt: "oil painting landscape, golden field, sunset",
    ratio: "3:4",
    likes: 489,
    published: true
  },
  {
    id: 12,
    image: "https://picsum.photos/seed/w12/300/300",
    userId: 5,
    title: "像素冒险",
    prompt: "pixel art adventure scene, 16-bit, retro game",
    ratio: "1:1",
    likes: 278,
    published: true
  }
];

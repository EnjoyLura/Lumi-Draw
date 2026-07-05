import type { HomeWork } from "../home/homeData";

export type GalleryTab = "all" | "published" | "draft";

export interface GalleryTabOption {
  key: GalleryTab;
  label: string;
}

export interface GalleryUser {
  id: number;
  name: string;
  avatar: string;
  color: string;
  points: string;
  userNo: string;
  bio: string;
  role: string;
  works: number;
  followers: string;
  likes: string;
}

export const galleryUser: GalleryUser = {
  id: 1,
  name: "云端造梦师",
  avatar: "梦",
  color: "var(--accent)",
  points: "2860",
  userNo: "LUMI8829",
  bio: "用AI描绘心中的梦境，每一笔都是想象力的延伸",
  role: "AI创作者",
  works: 48,
  followers: "326",
  likes: "1.2k"
};

export interface GalleryGenTask {
  id: number | string;
  prompt: string;
  model: string;
  count: number;
  ratio: string;
  quality: string;
  percent: number;
  elapsed: number;
  stage: string;
}

export const galleryGenTasks: GalleryGenTask[] = [
  {
    id: 1,
    prompt: "夕阳下的海边城堡，梦幻光影",
    model: "露米·梦幻",
    count: 4,
    ratio: "3:4",
    quality: "超清2K",
    percent: 62,
    elapsed: 18,
    stage: "AI绘制中..."
  }
];

export const galleryTabs: GalleryTabOption[] = [
  { key: "all", label: "全部" },
  { key: "published", label: "已发布" },
  { key: "draft", label: "草稿箱" }
];

export const galleryWorks: HomeWork[] = [
  {
    id: 3,
    image: "https://picsum.photos/seed/w3/300/450",
    userId: 1,
    title: "少女与猫",
    prompt: "anime girl with cat, soft colors, studio ghibli style, warm lighting",
    ratio: "2:3",
    likes: 680,
    published: true
  },
  {
    id: 5,
    image: "https://picsum.photos/seed/w5/300/530",
    userId: 1,
    title: "古风少女",
    prompt: "ancient chinese girl, hanfu, peach blossom, spring, elegant",
    ratio: "9:16",
    likes: 892,
    published: true
  },
  {
    id: 11,
    image: "https://picsum.photos/seed/w11/300/400",
    userId: 1,
    title: "油画风景",
    prompt: "oil painting landscape, golden field, sunset, impressionist",
    ratio: "3:4",
    likes: 489,
    published: true
  },
  {
    id: 13,
    image: "https://picsum.photos/seed/w13a/300/400",
    userId: 1,
    title: "",
    prompt: "花园里的可爱机器人，鲜花蝴蝶环绕，柔和阳光，梦幻氛围",
    ratio: "3:4",
    likes: 0,
    published: false
  },
  {
    id: 14,
    image: "https://picsum.photos/seed/w14a/300/300",
    userId: 1,
    title: "",
    prompt: "发光蘑菇的魔法森林，仙灯闪烁，奇幻魔法世界",
    ratio: "1:1",
    likes: 0,
    published: false
  },
  {
    id: 15,
    image: "https://picsum.photos/seed/w15/300/530",
    userId: 1,
    title: "",
    prompt: "星空下的灯塔，海浪拍打礁石，宁静夜晚",
    ratio: "9:16",
    likes: 0,
    published: false
  },
  {
    id: 16,
    image: "https://picsum.photos/seed/w16/300/225",
    userId: 1,
    title: "",
    prompt: "竹林深处的古寺，薄雾缭绕，禅意盎然",
    ratio: "4:3",
    likes: 0,
    published: false
  },
  {
    id: 17,
    image: "https://picsum.photos/seed/w17/300/400",
    userId: 1,
    title: "",
    prompt: "赛博朋克风格的猫咪，机械眼睛，霓虹光芒",
    ratio: "3:4",
    likes: 0,
    published: false
  },
  {
    id: 18,
    image: "https://picsum.photos/seed/w18/300/300",
    userId: 1,
    title: "",
    prompt: "水墨风格的鲤鱼跃龙门，祥云环绕",
    ratio: "1:1",
    likes: 0,
    published: false
  },
  {
    id: 19,
    image: "https://picsum.photos/seed/w19/300/400",
    userId: 1,
    title: "",
    prompt: "午后阳光下的咖啡馆，暖色调，治愈系",
    ratio: "3:4",
    likes: 0,
    published: false
  },
  {
    id: 20,
    image: "https://picsum.photos/seed/w20/300/530",
    userId: 1,
    title: "",
    prompt: "二次元少女骑在巨龙上翱翔天空",
    ratio: "9:16",
    likes: 0,
    published: false
  },
  {
    id: 21,
    image: "https://picsum.photos/seed/w21/300/225",
    userId: 1,
    title: "",
    prompt: "极光之下的雪山湖泊，倒影如镜",
    ratio: "4:3",
    likes: 0,
    published: false
  },
  {
    id: 22,
    image: "https://picsum.photos/seed/w22/300/300",
    userId: 1,
    title: "",
    prompt: "像素风格的太空探险，宇航员与外星生物",
    ratio: "1:1",
    likes: 0,
    published: false
  }
];

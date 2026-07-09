import type { AdminMetric, AiModel, UserProfile, WorkItem } from "./contracts";

export const MOCK_STORAGE_KEY = "lumi-draw:use-mock-data";

export const DEFAULT_USE_MOCK = false;

export const mockUser: UserProfile = {
  id: 1,
  nickname: "云端造梦师",
  avatarText: "梦",
  credits: 1280,
  memberName: "季卡会员"
};

export const mockModels: AiModel[] = [
  {
    id: "gpt-image-2",
    name: "GPT Image 2",
    description: "画质细腻，理解力强",
    costCredits: 15,
    supportsTextToImage: true,
    supportsImageToImage: true
  },
  {
    id: "nano-banana-2",
    name: "Nano Banana 2",
    description: "快速生成，适合高频创作",
    costCredits: 8,
    supportsTextToImage: true,
    supportsImageToImage: true
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    description: "高质量图生图",
    costCredits: 18,
    supportsTextToImage: false,
    supportsImageToImage: true
  },
  {
    id: "seedream-4-5",
    name: "Seedream 4.5",
    description: "中文理解和商业图生成",
    costCredits: 12,
    supportsTextToImage: true,
    supportsImageToImage: false
  }
];

export const mockWorks: WorkItem[] = [
  {
    id: 1,
    title: "霓虹都市",
    imageUrl: "https://picsum.photos/seed/lumi-work-1/320/420",
    authorName: "露米",
    likes: 328,
    published: true
  },
  {
    id: 2,
    title: "山水之间",
    imageUrl: "https://picsum.photos/seed/lumi-work-2/320/240",
    authorName: "云端造梦师",
    likes: 512,
    published: true
  }
];

export const mockAdminMetrics: AdminMetric[] = [
  { key: "users", label: "用户数", value: 2486 },
  { key: "works", label: "作品数", value: 18320 },
  { key: "income", label: "今日收入", value: 5600, unit: "CNY" }
];

export type DataMode = "mock" | "api";

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface UserProfile {
  id: number;
  nickname: string;
  avatarText: string;
  credits: number;
  memberName?: string;
}

export interface AiModel {
  id: string;
  name: string;
  description: string;
  costCredits: number;
  supportsTextToImage: boolean;
  supportsImageToImage: boolean;
}

export interface WorkItem {
  id: number;
  title: string;
  imageUrl: string;
  authorName: string;
  likes: number;
  published: boolean;
}

export interface AdminMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

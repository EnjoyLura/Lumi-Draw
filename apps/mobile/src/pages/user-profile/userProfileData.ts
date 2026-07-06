import { reactive } from "vue";
import { homeWorks, type HomeWork } from "../home/homeData";
import { galleryWorks } from "../gallery/galleryData";

export interface ProfileUser {
  id: number;
  name: string;
  avatar: string;
  color: string;
  bio: string;
  works: number;
  likes: string;
  followers: string;
  following: number;
  gender: "male" | "female" | "unknown";
  role: string;
}

export const profileUsers: ProfileUser[] = [
  { id: 1, name: "云端造梦师", avatar: "梦", color: "var(--accent)", bio: "用AI描绘心中的梦境", works: 48, likes: "1.2k", followers: "326", following: 58, gender: "female", role: "AI创作者" },
  { id: 2, name: "星辰大海", avatar: "星", color: "var(--mint)", bio: "探索AI的无限可能", works: 36, likes: "890", followers: "215", following: 42, gender: "male", role: "AI创作者" },
  { id: 3, name: "月光如水", avatar: "月", color: "var(--peach)", bio: "月光下的AI画家", works: 52, likes: "2.1k", followers: "580", following: 73, gender: "female", role: "AI创作者" },
  { id: 4, name: "风之绘师", avatar: "风", color: "var(--lavender)", bio: "风中捕捉灵感", works: 29, likes: "670", followers: "180", following: 35, gender: "male", role: "AI创作者" },
  { id: 5, name: "光影魔术", avatar: "光", color: "var(--lemon)", bio: "玩转光与影的魔法", works: 41, likes: "1.5k", followers: "410", following: 67, gender: "male", role: "AI创作者" }
];

const allWorks: HomeWork[] = [...homeWorks, ...galleryWorks].reduce<HomeWork[]>((result, work) => {
  if (!result.some((item) => item.id === work.id)) result.push(work);
  return result;
}, []);

export function getProfileUser(id: number): ProfileUser {
  return profileUsers.find((user) => user.id === id) || profileUsers[0];
}

export function getUserWorks(userId: number): HomeWork[] {
  return allWorks.filter((work) => work.userId === userId && work.published);
}

const followState = reactive<Record<number, boolean>>({});

export function isFollowing(id: number) {
  return !!followState[id];
}

export function setFollowing(id: number, value: boolean) {
  followState[id] = value;
}

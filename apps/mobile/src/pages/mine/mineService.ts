import { api } from "../../services/api";
import type { MineUser } from "./mineData";

interface BackendMineProfile {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  credits: number;
}

export function toMineUser(profile: BackendMineProfile): MineUser {
  return {
    name: profile.nickname,
    avatar: profile.avatarText || profile.nickname.slice(0, 1) || "米",
    color: profile.avatarColor || "var(--accent)",
    userNo: `LUMI${String(profile.id).padStart(4, "0")}`,
    credits: profile.credits
  };
}

export function fetchMineProfile() {
  return api.get<BackendMineProfile>("/users/me");
}

export async function fetchUnreadMessageCount() {
  const rows = await api.get<Array<{ unread: number }>>("/notifications/summary");
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.unread) ? row.unread : 0), 0);
}

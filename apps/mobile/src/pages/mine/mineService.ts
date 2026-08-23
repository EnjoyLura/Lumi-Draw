import { api } from "../../services/api";
import { formatPublicUserId } from "../../services/publicUserId";
import type { MineUser } from "./mineData";

interface BackendMineProfile {
  id: number;
  publicId?: string | null;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  credits: number;
}

export function toMineUser(profile: BackendMineProfile): MineUser {
  const fallbackName = `用户${profile.id}`;
  const name = profile.nickname || fallbackName;
  return {
    name,
    avatar: profile.avatarText || name.slice(0, 1) || "U",
    color: profile.avatarColor || "var(--accent)",
    userNo: formatPublicUserId(profile.publicId, profile.id),
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

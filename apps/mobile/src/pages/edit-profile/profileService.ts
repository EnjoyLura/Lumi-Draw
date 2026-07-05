import { api } from "../../services/api";

export interface MobileProfile {
  id: number;
  nickname: string;
  avatarText?: string | null;
  avatarColor?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  gender?: string | null;
}

export function fetchMyProfile() {
  return api.get<MobileProfile>("/users/me");
}

export function updateMyProfile(payload: {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
  gender?: "unknown" | "male" | "female";
}) {
  return api.patch<MobileProfile>("/users/me", payload);
}

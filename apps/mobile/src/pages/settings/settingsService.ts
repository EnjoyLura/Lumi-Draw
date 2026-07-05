import { api } from "../../services/api";

export interface AgreementView {
  type: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface BackendChangeItem {
  type: string;
  text: string;
}

export interface BackendVersionLog {
  id: number;
  version: string;
  releasedAt: string;
  items: BackendChangeItem[];
}

export function fetchAgreement(type: string) {
  return api.get<AgreementView>(`/config/agreements/${encodeURIComponent(type)}`, { skipAuth: true });
}

export function fetchChangelog() {
  return api.get<BackendVersionLog[]>("/config/changelog", { skipAuth: true });
}

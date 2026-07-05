import { api } from "../../services/api";
import type { MessageCategory, MessageCategoryKey, MessageItem } from "./messagesData";

interface BackendSummaryRow extends MessageCategory {
  unread: number;
  latest: {
    desc: string;
    time: string;
  };
}

interface BackendMessage {
  id: number;
  title: string;
  content: string;
  type: MessageCategoryKey;
  unread: boolean;
  time: string;
}

export interface MessageCategoryRow extends MessageCategory {
  latest: { desc: string; time: string };
  unread: number;
}

export function fetchMessageSummary() {
  return api.get<BackendSummaryRow[]>("/notifications/summary");
}

export async function fetchMessageList(type: MessageCategoryKey): Promise<MessageItem[]> {
  const rows = await api.get<BackendMessage[]>(`/notifications/${type}`);
  return rows.map((row) => ({
    content: row.content || row.title,
    time: row.time,
    unread: row.unread
  }));
}

export function markMessageCategoryRead(type: MessageCategoryKey) {
  return api.patch<{ ok: boolean; type: string }>(`/notifications/${type}/read`);
}

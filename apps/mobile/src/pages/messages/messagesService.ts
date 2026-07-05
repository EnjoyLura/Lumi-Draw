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

const SOCIAL_TYPES = new Set<MessageCategoryKey>(["like", "favorite", "remake", "follow"]);
const AVATAR_COLORS = ["#5B9FE8", "#6FD4B0", "#FFB59A", "#B8A5E3", "#FFE08A", "#FFA8B8"];

function actorColor(name: string) {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function toMessageItem(row: BackendMessage): MessageItem {
  const item: MessageItem = {
    content: row.content || row.title,
    time: row.time,
    unread: row.unread
  };

  if (!SOCIAL_TYPES.has(row.type)) return item;
  const actorName = item.content.split(/\s+/)[0]?.trim();
  if (!actorName) return item;

  return {
    ...item,
    content: item.content.replace(actorName, "").trim(),
    user: {
      name: actorName,
      avatar: actorName.slice(0, 1),
      color: actorColor(actorName)
    }
  };
}

export function fetchMessageSummary() {
  return api.get<BackendSummaryRow[]>("/notifications/summary");
}

export async function fetchMessageList(type: MessageCategoryKey): Promise<MessageItem[]> {
  const rows = await api.get<BackendMessage[]>(`/notifications/${type}`);
  return rows.map(toMessageItem);
}

export function markMessageCategoryRead(type: MessageCategoryKey) {
  return api.patch<{ ok: boolean; type: string }>(`/notifications/${type}/read`);
}

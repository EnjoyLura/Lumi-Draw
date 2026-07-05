import { api } from "../../services/api";

export function submitFeedback(payload: {
  type: string;
  content: string;
  imageUrls: string[];
  wechat: string;
}) {
  return api.post<{ id: number; status: string; createdAt: string }>("/feedback", payload);
}

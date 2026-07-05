import { api } from "../../services/api";

export interface ReportResult {
  id: number;
  status: string;
  duplicated: boolean;
  createdAt: string;
}

export function submitWorkReport(workId: number, payload: { reason: string; description?: string }) {
  return api.post<ReportResult>(`/social/works/${workId}/report`, payload);
}

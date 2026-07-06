import { api } from "../../services/api";
import { fetchWorkDetail } from "../work-detail/workDetailService";

export async function fetchEditableWork(id: number) {
  return fetchWorkDetail(id);
}

export function updateEditableWork(
  id: number,
  payload: {
    title: string;
    description: string;
    style?: string;
    tags?: string[];
  }
) {
  return api.patch<unknown>(`/works/${id}`, payload);
}

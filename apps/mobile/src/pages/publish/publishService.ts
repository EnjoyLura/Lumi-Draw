import { api } from "../../services/api";
import { ratioToResolution, type DraftWork } from "./publishData";

interface BackendDraftWork {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  title: string;
  ratio: string;
  width?: number | null;
  height?: number | null;
}

interface BackendWorkDetail {
  id: number;
  imageUrl: string;
  title: string;
  description?: string | null;
  prompt?: string | null;
  ratio: string;
  quality?: string | null;
  modelId?: string | null;
  style?: string | null;
  tags?: string[];
  status?: string;
  isPublic?: boolean;
}

interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface PublishWorkPayload {
  title: string;
  description: string;
  tags: string[];
  draft: DraftWork;
}

function toDraftWork(item: BackendDraftWork): DraftWork {
  return {
    id: item.id,
    image: item.thumbnailUrl || item.imageUrl,
    fullImage: item.imageUrl,
    title: item.title || "未命名作品",
    ratio: item.ratio || "1:1",
    resolution: formatResolution(item.width, item.height, item.ratio),
    source: "backend"
  };
}

function formatResolution(width: number | null | undefined, height: number | null | undefined, ratio: string) {
  if (Number.isInteger(width) && Number.isInteger(height) && width! > 0 && height! > 0) return `${width}x${height}`;
  return ratioToResolution(ratio || "1:1");
}

export async function fetchPublishDrafts() {
  const result = await api.get<PageResult<BackendDraftWork>>("/works/me/drafts?page=1&pageSize=50");
  return result.items.map(toDraftWork);
}

export async function publishWork(payload: PublishWorkPayload) {
  let detail: Partial<BackendWorkDetail> = {};

  if (payload.draft.source === "backend") {
    detail = await api.get<BackendWorkDetail>(`/works/${payload.draft.id}`);
    return api.patch<BackendWorkDetail>(`/works/${payload.draft.id}`, {
      title: payload.title,
      description: payload.description,
      style: payload.tags[0] || detail.style || "",
      tags: payload.tags,
      isPublic: true
    });
  }

  const prompt = detail.prompt || payload.draft.prompt || payload.description || payload.title;
  const style = payload.tags[0] || detail.style || "";

  return api.post<BackendWorkDetail>("/works", {
    title: payload.title,
    description: payload.description,
    prompt,
    imageUrl: detail.imageUrl || payload.draft.fullImage || payload.draft.image,
    ratio: detail.ratio || payload.draft.ratio || "1:1",
    quality: detail.quality || "1K",
    modelId: detail.modelId || "",
    style,
    tags: payload.tags,
    isPublic: true
  });
}

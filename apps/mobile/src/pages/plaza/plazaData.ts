export type PlazaTab = "recommend" | "hot" | "new" | "favorite";

export interface PlazaTabOption {
  key: PlazaTab;
  label: string;
}

export const plazaTabs: PlazaTabOption[] = [
  { key: "recommend", label: "推荐" },
  { key: "hot", label: "热门" },
  { key: "new", label: "最新" },
  { key: "favorite", label: "收藏" }
];

export const plazaCategories = ["全部", "二次元", "风景", "建筑", "表情包", "写实", "国风", "人像", "动物", "抽象"];

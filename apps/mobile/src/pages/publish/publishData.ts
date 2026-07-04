import { galleryWorks } from "../gallery/galleryData";

export interface WorkTag {
  name: string;
  bg: string;
  color: string;
}

export const workTags: WorkTag[] = [
  { name: "二次元", bg: "rgba(255,179,193,0.15)", color: "#E85D75" },
  { name: "国风", bg: "rgba(163,228,204,0.15)", color: "#3BA57A" },
  { name: "风景", bg: "rgba(168,216,240,0.15)", color: "#4A9DC8" },
  { name: "人像", bg: "rgba(255,212,168,0.15)", color: "#D4883A" },
  { name: "赛博朋克", bg: "rgba(184,165,227,0.15)", color: "#7B5FB5" },
  { name: "水彩", bg: "rgba(145,200,240,0.15)", color: "#4A8CC8" },
  { name: "抽象", bg: "rgba(255,210,76,0.15)", color: "#C89520" },
  { name: "梦幻", bg: "rgba(200,181,232,0.15)", color: "#8B6DB8" },
  { name: "暗黑", bg: "rgba(100,100,120,0.15)", color: "#555568" },
  { name: "极简", bg: "rgba(91,159,232,0.15)", color: "#4A8CCE" },
  { name: "动物", bg: "rgba(111,212,176,0.15)", color: "#3BA57A" },
  { name: "插画", bg: "rgba(240,140,160,0.15)", color: "#D4556A" }
];

const resolutionMap: Record<string, string> = {
  "1:1": "1024×1024",
  "3:4": "768×1024",
  "4:3": "1024×768",
  "2:3": "683×1024",
  "3:2": "1024×683",
  "9:16": "576×1024",
  "16:9": "1024×576"
};

export function ratioToResolution(ratio: string) {
  return resolutionMap[ratio] || "1024×1024";
}

export interface DraftWork {
  id: number;
  image: string;
  title: string;
  ratio: string;
  resolution: string;
}

export const draftWorks: DraftWork[] = galleryWorks
  .filter((work) => !work.published)
  .map((work) => ({
    id: work.id,
    image: work.image,
    title: work.title || (work.prompt ? work.prompt.slice(0, 20) : "未命名作品"),
    ratio: work.ratio,
    resolution: ratioToResolution(work.ratio)
  }));

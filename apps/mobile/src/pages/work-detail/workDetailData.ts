import { homeUsers, homeWorks, type HomeUser, type HomeWork } from "../home/homeData";
import { galleryWorks } from "../gallery/galleryData";
import { createModels } from "../create/createData";

export interface DetailWork extends HomeWork {
  previewImage?: string;
  description: string;
  modelId?: string;
  modelName: string;
  quality?: string;
  styleName: string;
  tags: string[];
  editTags?: string[];
  favorites: number;
  remakes: number;
  time: string;
}

const styleMap = ["赛博朋克", "国风", "二次元", "梦幻", "国风", "赛博朋克", "水彩", "极简", "暗黑", "蒸汽波", "油画", "像素"];

const uniqueWorks = [...homeWorks, ...galleryWorks].reduce<HomeWork[]>((result, work) => {
  if (!result.some((item) => item.id === work.id)) result.push(work);
  return result;
}, []);

export const reportReasons = ["垃圾广告", "色情低俗", "违法违规", "侵权盗版", "煽动仇恨", "虚假信息", "其他原因"];

export function getWorkById(id: number): DetailWork | undefined {
  const work = uniqueWorks.find((item) => item.id === id);
  if (!work) return undefined;

  const model = createModels[(id - 1) % createModels.length];
  const styleName = styleMap[(id - 1) % styleMap.length] || "写实";
  const title = work.title || getWorkTitle(work);

  return {
    ...work,
    title,
    description: `${title}，由露米绘画AI生成，画面细节完整，适合继续同款创作。`,
    modelId: model.id,
    modelName: model.name,
    quality: "1K",
    styleName,
    tags: [styleName, work.ratio, work.published ? "已发布" : "草稿"],
    favorites: Math.max(18, Math.round(work.likes * 0.34)),
    remakes: Math.max(6, Math.round(work.likes * 0.16)),
    time: id <= 4 ? `${id + 1}小时前` : `${Math.ceil(id / 4)}天前`
  };
}

export function getWorkTitle(work: HomeWork) {
  return work.title || (work.prompt.length > 20 ? `${work.prompt.slice(0, 20)}...` : work.prompt);
}

export function getWorkUser(work: HomeWork): HomeUser {
  return homeUsers.find((user) => user.id === work.userId) || homeUsers[0];
}

import { useAdminSession } from "../data/adminSession";
import {
  apiGetBanners,
  apiGetCategories,
  apiGetGameplays,
  apiGetHotSearches,
  apiGetModels,
  apiGetQualities,
  apiGetRatios,
  apiGetStyles
} from "../data/api";
import { BANNERS, CATEGORIES, GAMEPLAYS, HOT_SEARCHES, MODELS, QUALITIES, RATIOS, STYLES } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

interface OpsSummary {
  banners: number;
  gameplays: number;
  styles: number;
  categories: number;
  hotSearches: number;
  models: number;
  qualities: number;
  ratios: number;
}

async function loadOpsSummary(): Promise<OpsSummary> {
  const [banners, gameplays, styles, categories, hotSearches, models, qualities, ratios] = await Promise.all([
    apiGetBanners(),
    apiGetGameplays(),
    apiGetStyles(),
    apiGetCategories(),
    apiGetHotSearches(),
    apiGetModels(),
    apiGetQualities(),
    apiGetRatios()
  ]);
  return {
    banners: banners.length,
    gameplays: gameplays.length,
    styles: styles.length,
    categories: categories.length,
    hotSearches: hotSearches.length,
    models: models.length,
    qualities: qualities.length,
    ratios: ratios.length
  };
}

export function Ops() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const summaryState = useAsyncData<OpsSummary>(useMock ? null : loadOpsSummary, [useMock]);
  const summary = useMock
    ? {
        banners: BANNERS.length,
        gameplays: GAMEPLAYS.length,
        styles: STYLES.length,
        categories: CATEGORIES.length,
        hotSearches: HOT_SEARCHES.length,
        models: MODELS.length,
        qualities: QUALITIES.length,
        ratios: RATIOS.length
      }
    : summaryState.data ?? {
        banners: 0,
        gameplays: 0,
        styles: 0,
        categories: 0,
        hotSearches: 0,
        models: 0,
        qualities: 0,
        ratios: 0
      };

  const items: Array<[string, string, string, string, string]> = [
    ["opsBanner", "走马灯管理", "ri-slideshow-line", "#5B9FE8", `${summary.banners} 个轮播`],
    ["opsGameplay", "玩法模板", "ri-magic-line", "#8B7FD6", `${summary.gameplays} 个模板`],
    ["opsStyle", "风格管理", "ri-palette-line", "#6FD4B0", `${summary.styles} 个风格`],
    ["opsCategory", "分类管理", "ri-price-tag-3-line", "#8B7FD6", `${summary.categories} 个分类`],
    ["opsHotSearch", "热搜管理", "ri-fire-line", "#F59E0B", `${summary.hotSearches} 个热词`],
    ["opsModel", "模型管理", "ri-cpu-line", "#EF4444", `${summary.models} 个模型`],
    ["opsQuality", "分辨率配置", "ri-hd-line", "#5B9FE8", `${summary.qualities} 个档位`],
    ["opsRatio", "尺寸比例", "ri-aspect-ratio-line", "#6FD4B0", `${summary.ratios} 种比例`],
    ["opsCreatorTitle", "创作者称号", "ri-medal-line", "#F59E0B", "6 个档位"]
  ];

  return (
    <div className="card">
      {!useMock && summaryState.loading ? <div className="empty" style={{ minHeight: 72 }}>运营配置数据加载中...</div> : null}
      {!useMock && summaryState.error ? (
        <div className="empty" style={{ minHeight: 96 }}>
          <i className="ri-error-warning-line" />
          <div className="et">运营配置数据加载失败</div>
          <button className="btn btn-soft btn-sm" onClick={summaryState.reload}>重新加载</button>
        </div>
      ) : null}
      {items.map(([id, title, icon, color, sub]) => (
        <div key={id} className="lrow" onClick={() => go(id)}>
          <div className="lr-ico" style={{ background: `${color}22`, color }}><i className={icon} /></div>
          <div className="lr-main"><div className="lr-t">{title}</div><div className="lr-s">{sub}</div></div>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
      ))}
    </div>
  );
}

import { BANNERS, CATEGORIES, GAMEPLAYS, HOT_SEARCHES, MODELS, QUALITIES, RATIOS, STYLES } from "../data/mock";
import { useNav } from "../shell/NavContext";

export function Ops() {
  const { go } = useNav();
  const items: Array<[string, string, string, string, string]> = [
    ["opsBanner", "走马灯管理", "ri-slideshow-line", "#5B9FE8", `${BANNERS.length} 个轮播`],
    ["opsGameplay", "玩法模板", "ri-magic-line", "#8B7FD6", `${GAMEPLAYS.length} 个模板`],
    ["opsStyle", "风格管理", "ri-palette-line", "#6FD4B0", `${STYLES.length} 个风格`],
    ["opsCategory", "分类管理", "ri-price-tag-3-line", "#8B7FD6", `${CATEGORIES.length} 个分类`],
    ["opsHotSearch", "热搜管理", "ri-fire-line", "#F59E0B", `${HOT_SEARCHES.length} 个热词`],
    ["opsModel", "模型管理", "ri-cpu-line", "#EF4444", `${MODELS.length} 个模型`],
    ["opsQuality", "分辨率配置", "ri-hd-line", "#5B9FE8", `${QUALITIES.length} 个档位`],
    ["opsRatio", "尺寸比例", "ri-aspect-ratio-line", "#6FD4B0", `${RATIOS.length} 种比例`]
  ];
  return (
    <div className="card">
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

import { ApiOutlined, AppstoreOutlined, BookOutlined, FireOutlined, HighlightOutlined, PictureOutlined, TagsOutlined } from "@ant-design/icons";
import { Alert, Spin } from "antd";
import { AdminFeatureGrid, type AdminFeatureItem } from "../components/AdminFeatureGrid";
import { useAdminSession } from "../data/adminSession";
import { apiGetBanners, apiGetCategories, apiGetGameplays, apiGetHotSearches, apiGetModels, apiGetQualities, apiGetRatios, apiGetStyles } from "../data/api";
import { BANNERS, CATEGORIES, GAMEPLAYS, HOT_SEARCHES, MODELS, QUALITIES, RATIOS, STYLES } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatCard } from "../ui";

interface OpsSummary { banners: number; gameplays: number; styles: number; categories: number; hotSearches: number; models: number; qualities: number; ratios: number; }
async function loadOpsSummary(): Promise<OpsSummary> {
  const [banners, gameplays, styles, categories, hotSearches, models, qualities, ratios] = await Promise.all([apiGetBanners(), apiGetGameplays(), apiGetStyles(), apiGetCategories(), apiGetHotSearches(), apiGetModels(), apiGetQualities(), apiGetRatios()]);
  return { banners: banners.length, gameplays: gameplays.length, styles: styles.length, categories: categories.length, hotSearches: hotSearches.length, models: models.length, qualities: qualities.length, ratios: ratios.length };
}

export function Ops() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const summaryState = useAsyncData<OpsSummary>(useMock ? null : loadOpsSummary, [useMock]);
  const summary = useMock ? { banners: BANNERS.length, gameplays: GAMEPLAYS.length, styles: STYLES.length, categories: CATEGORIES.length, hotSearches: HOT_SEARCHES.length, models: MODELS.length, qualities: QUALITIES.length, ratios: RATIOS.length } : summaryState.data ?? { banners: 0, gameplays: 0, styles: 0, categories: 0, hotSearches: 0, models: 0, qualities: 0, ratios: 0 };
  const items: AdminFeatureItem[] = [
    { id: "opsBanner", title: "走马灯", description: "管理首页运营 banner、跳转页面与展示时段", icon: <PictureOutlined />, color: "#5b9fe8", badge: `${summary.banners} 个轮播` },
    { id: "opsGameplay", title: "玩法模板", description: "维护创作玩法、默认提示词和推荐素材", icon: <HighlightOutlined />, color: "#8b7fd6", badge: `${summary.gameplays} 个模板` },
    { id: "opsStyle", title: "风格管理", description: "设置创作风格、封面和用户端展示顺序", icon: <BookOutlined />, color: "#22a06b", badge: `${summary.styles} 个风格` },
    { id: "opsCategory", title: "分类管理", description: "维护广场作品分类与排序", icon: <TagsOutlined />, color: "#d85c7f", badge: `${summary.categories} 个分类` },
    { id: "opsHotSearch", title: "热搜管理", description: "设置搜索页热门关键词与运营排序", icon: <FireOutlined />, color: "#d88900", badge: `${summary.hotSearches} 个热词` },
    { id: "opsModel", title: "模型管理", description: "管理创作模型、积分成本和可用精度", icon: <AppstoreOutlined />, color: "#d85c7f", badge: `${summary.models} 个模型` },
    { id: "opsApiProvider", title: "API 平台", description: "配置服务分组、优先级、降级路由和统计", icon: <ApiOutlined />, color: "#5b9fe8" },
    { id: "opsQuality", title: "分辨率配置", description: "管理 1K、2K、4K 的展示与价格规则", icon: <AppstoreOutlined />, color: "#5b9fe8", badge: `${summary.qualities} 个档位` },
    { id: "opsRatio", title: "尺寸比例", description: "维护模型可用的图片比例与尺寸映射", icon: <TagsOutlined />, color: "#22a06b", badge: `${summary.ratios} 种比例` },
    { id: "opsCreatorTitle", title: "创作者称号", description: "配置用户作品数量对应的创作者荣誉", icon: <HighlightOutlined />, color: "#d88900" }
  ];
  return (
    <div className="lumi-admin-page">
      {summaryState.error && !useMock ? <Alert showIcon type="error" message="运营配置加载失败" description={summaryState.error} /> : null}
      <Spin spinning={summaryState.loading && !useMock}>
        <div className="lumi-metrics stat-grid">
          <StatCard label="玩法模板" val={summary.gameplays} icon="ri-magic-line" color="#8b7fd6" soft="#f5f0ff" />
          <StatCard label="创作风格" val={summary.styles} icon="ri-palette-line" color="#22a06b" soft="#effbf5" />
          <StatCard label="可用模型" val={summary.models} icon="ri-cpu-line" color="#d85c7f" soft="#fff0f3" />
          <StatCard label="API 平台" val="配置" icon="ri-server-line" color="#5b9fe8" soft="#eff6ff" onClick={() => go("opsApiProvider", undefined, true)} />
        </div>
      </Spin>
      <AdminFeatureGrid items={items} onSelect={(id) => go(id, undefined, true)} />
    </div>
  );
}

import { DRILL } from "../pages/DataDetail";

export interface DrawerItem {
  id: string;
  t: string;
  i: string;
}

export interface DrawerGroup {
  g: string;
  items: DrawerItem[];
}

export const DRAWER_MENU: DrawerGroup[] = [
  { g: "仪表盘", items: [
    { id: "home", t: "工作台", i: "ri-dashboard-line" },
    { id: "dashboard", t: "数据大屏", i: "ri-line-chart-line" }
  ] },
  { g: "用户与内容", items: [
    { id: "users", t: "用户管理", i: "ri-user-3-line" },
    { id: "works", t: "作品管理", i: "ri-image-2-line" },
    { id: "review", t: "内容审核", i: "ri-shield-check-line" }
  ] },
  { g: "运营配置", items: [
    { id: "opsBanner", t: "走马灯", i: "ri-slideshow-line" },
    { id: "opsGameplay", t: "玩法模板", i: "ri-magic-line" },
    { id: "opsStyle", t: "风格管理", i: "ri-palette-line" },
    { id: "opsCategory", t: "分类管理", i: "ri-price-tag-3-line" },
    { id: "opsHotSearch", t: "热搜管理", i: "ri-fire-line" },
    { id: "opsModel", t: "模型管理", i: "ri-cpu-line" },
    { id: "opsApiProvider", t: "API 平台", i: "ri-server-line" },
    { id: "opsQuality", t: "分辨率配置", i: "ri-hd-line" },
    { id: "opsRatio", t: "尺寸比例", i: "ri-aspect-ratio-line" }
  ] },
  { g: "财务管理", items: [
    { id: "finance", t: "财务概览", i: "ri-wallet-3-line" },
    { id: "finRecharge", t: "充值方案", i: "ri-coins-line" },
    { id: "finMember", t: "会员方案", i: "ri-vip-crown-line" },
    { id: "finCheckin", t: "签到配置", i: "ri-calendar-check-line" },
    { id: "finInvite", t: "邀请配置", i: "ri-user-add-line" },
    { id: "finTxn", t: "交易记录", i: "ri-exchange-funds-line" },
    { id: "setBase", t: "积分基础配置", i: "ri-settings-4-line" }
  ] },
  { g: "消息管理", items: [
    { id: "msgAnnounce", t: "弹窗公告", i: "ri-notification-3-line" },
    { id: "msgPush", t: "系统通知", i: "ri-send-plane-line" },
    { id: "msgFeedback", t: "用户反馈", i: "ri-feedback-line" }
  ] },
  { g: "系统", items: [
    { id: "settings", t: "系统设置", i: "ri-settings-3-line" }
  ] }
];

// 页面标题表：抽屉项 + 工作台功能入口/下钻等非抽屉页面
export const PAGE_TITLES: Record<string, string> = {
  ...Object.fromEntries(DRAWER_MENU.flatMap((grp) => grp.items.map((it) => [it.id, it.t]))),
  opsBanner: "走马灯管理",
  dataDetail: "数据详情",
  userDetail: "用户详情",
  workDetail: "作品详情",
  reviewDetail: "审核详情",
  ops: "运营配置",
  finance: "财务管理",
  messages: "消息管理",
  setAudit: "审核设置",
  setSensitive: "敏感词管理",
  setVersion: "版本管理",
  setAgreement: "协议管理"
};

export function pageTitle(id: string, param?: string) {
  if (id === "dataDetail") return (DRILL[param ?? ""] || DRILL.users).name;
  return PAGE_TITLES[id] || id;
}

// 功能入口模块配色（移植自原型 moduleColor）
export const MODULE_COLOR: Record<string, { c: string; s: string }> = {
  users: { c: "#5B9FE8", s: "var(--info-soft)" },
  works: { c: "#6FD4B0", s: "var(--success-soft)" },
  review: { c: "#F59E0B", s: "var(--warning-soft)" },
  finance: { c: "#EF4444", s: "var(--danger-soft)" },
  ops: { c: "#8B7FD6", s: "var(--purple-soft)" },
  messages: { c: "#5B9FE8", s: "var(--info-soft)" },
  settings: { c: "#5B6675", s: "var(--bg-soft)" },
  dashboard: { c: "#6FD4B0", s: "var(--success-soft)" }
};

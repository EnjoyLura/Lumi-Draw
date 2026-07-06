// 统一 mock 数据服务层：readUseMockData() 为真时返回静态 mock。
// 真实后端数据统一走 data/api.ts 适配层，保留非 mock 保护避免旧页面误用。
import { readUseMockData } from "../dataMode";
import { ANNOUNCEMENTS, BANNERS, CATEGORIES, CHECKIN, FEEDBACKS, GAMEPLAYS, HOT_SEARCHES, MEMBER_PLANS, MODELS, PUSHES, QUALITIES, RATIOS, RECHARGE_TIERS, REPORTS, SENSITIVE, STYLES, TRANSACTIONS, TREND, USERS, VERSIONS, WORKS, type AdminAnnounce, type AdminBanner, type AdminCategory, type AdminFeedback, type AdminGameplay, type AdminHotSearch, type AdminModel, type AdminPush, type AdminQuality, type AdminRatio, type AdminRecharge, type AdminReport, type AdminStyle, type AdminTxn, type AdminUser, type AdminVersion, type AdminWork, type CheckinTier, type MemberPlan } from "./mock";

export interface DashboardTodos {
  review: number;
  report: number;
  feedback: number;
}

export interface TodayMetric {
  key: string;
  label: string;
  val: string;
  delta: number;
  icon: string;
  color: string;
  soft: string;
}

function notImplemented(name: string): never {
  throw new Error(`[admin] ${name} 是 mock service，请改用 data/api.ts 真实接口适配层`);
}

export function getDashboardTodos(): DashboardTodos {
  if (!readUseMockData()) return notImplemented("getDashboardTodos");
  return {
    review: WORKS.filter((w) => w.status === "待审核").length,
    report: REPORTS.filter((r) => r.status === "待处理").length,
    feedback: FEEDBACKS.filter((f) => f.status === "待处理").length
  };
}

export function getTodayMetrics(): TodayMetric[] {
  if (!readUseMockData()) return notImplemented("getTodayMetrics");
  return [
    { key: "newUsers", label: "新增用户", val: "245", delta: 12, icon: "ri-user-add-line", color: "#5B9FE8", soft: "var(--info-soft)" },
    { key: "totalUsers", label: "总用户", val: "12,486", delta: 8, icon: "ri-group-line", color: "#6FD4B0", soft: "var(--success-soft)" },
    { key: "newWorks", label: "新增作品", val: "1,380", delta: 15, icon: "ri-image-add-line", color: "#8B7FD6", soft: "var(--purple-soft)" },
    { key: "totalWorks", label: "总作品", val: "48,620", delta: -3, icon: "ri-image-2-line", color: "#EF4444", soft: "var(--danger-soft)" }
  ];
}

export function getUsers(): AdminUser[] {
  if (!readUseMockData()) return notImplemented("getUsers");
  return USERS;
}

export function getUser(id: number): AdminUser {
  if (!readUseMockData()) return notImplemented("getUser");
  return USERS.find((u) => u.id === id) ?? USERS[0];
}

export function getUserWorks(userId: number): AdminWork[] {
  if (!readUseMockData()) return notImplemented("getUserWorks");
  return WORKS.filter((w) => w.userId === userId);
}

export function getWorks(): AdminWork[] {
  if (!readUseMockData()) return notImplemented("getWorks");
  return WORKS;
}

export function getWork(id: number): AdminWork {
  if (!readUseMockData()) return notImplemented("getWork");
  return WORKS.find((w) => w.id === id) ?? WORKS[0];
}

export function getReports(): AdminReport[] {
  if (!readUseMockData()) return notImplemented("getReports");
  return REPORTS;
}

export function getModels(): AdminModel[] {
  if (!readUseMockData()) return notImplemented("getModels");
  return MODELS;
}

export function getStyles(): AdminStyle[] {
  if (!readUseMockData()) return notImplemented("getStyles");
  return STYLES;
}

export function getTrend(): typeof TREND {
  if (!readUseMockData()) return notImplemented("getTrend");
  return TREND;
}

export function getBanners(): AdminBanner[] {
  if (!readUseMockData()) return notImplemented("getBanners");
  return BANNERS;
}

export function getGameplays(): AdminGameplay[] {
  if (!readUseMockData()) return notImplemented("getGameplays");
  return GAMEPLAYS;
}

export function getCategories(): AdminCategory[] {
  if (!readUseMockData()) return notImplemented("getCategories");
  return CATEGORIES;
}

export function getHotSearches(): AdminHotSearch[] {
  if (!readUseMockData()) return notImplemented("getHotSearches");
  return HOT_SEARCHES;
}

export function getQualities(): AdminQuality[] {
  if (!readUseMockData()) return notImplemented("getQualities");
  return QUALITIES;
}

export function getRatios(): AdminRatio[] {
  if (!readUseMockData()) return notImplemented("getRatios");
  return RATIOS;
}

export function getRecharges(): AdminRecharge[] {
  if (!readUseMockData()) return notImplemented("getRecharges");
  return RECHARGE_TIERS;
}

export function getMemberPlans(): MemberPlan[] {
  if (!readUseMockData()) return notImplemented("getMemberPlans");
  return MEMBER_PLANS;
}

export function getCheckin(): { base: number; tiers: CheckinTier[] } {
  if (!readUseMockData()) return notImplemented("getCheckin");
  return CHECKIN;
}

export function getTransactions(): AdminTxn[] {
  if (!readUseMockData()) return notImplemented("getTransactions");
  return TRANSACTIONS;
}

export function getAnnouncements(): AdminAnnounce[] {
  if (!readUseMockData()) return notImplemented("getAnnouncements");
  return ANNOUNCEMENTS;
}

export function getPushes(): AdminPush[] {
  if (!readUseMockData()) return notImplemented("getPushes");
  return PUSHES;
}

export function getFeedbacks(): AdminFeedback[] {
  if (!readUseMockData()) return notImplemented("getFeedbacks");
  return FEEDBACKS;
}

export function getSensitive(): string[] {
  if (!readUseMockData()) return notImplemented("getSensitive");
  return SENSITIVE;
}

export function getVersions(): AdminVersion[] {
  if (!readUseMockData()) return notImplemented("getVersions");
  return VERSIONS;
}

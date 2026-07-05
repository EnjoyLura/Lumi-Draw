// 真实后端适配层：把后端 API 响应映射为页面沿用的 mock 形状，
// 这样开启/关闭模拟数据时页面渲染逻辑保持一致。
import { http, type Paginated } from "./http";
import type { AdminFeedback, AdminReport, AdminUser, AdminWork } from "./mock";
import type { DashboardTodos, TodayMetric } from "./service";

export async function adminLogin(username: string, password: string): Promise<string> {
  const data = await http.post<{ accessToken: string }>("/admin/auth/login", { username, password });
  return data.accessToken;
}

interface ApiUser {
  id: number; nickname: string; avatarText: string; avatarColor: string; bio: string;
  gender: string; credits: number; memberPlan: string; status: string; phone: string;
  worksCount: number; likesCount: number; followers: number; following: number; createdAt: string;
}

export interface AdminUserDetailData extends AdminUser {
  recentWorks: AdminWork[];
}

function genderToCn(gender: string) {
  return gender === "male" ? "男" : gender === "female" ? "女" : "";
}

function genderToApi(gender: string) {
  return gender === "男" ? "male" : gender === "女" ? "female" : "unknown";
}

function mapUser(u: ApiUser): AdminUser {
  return {
    id: u.id,
    name: u.nickname,
    avatar: u.avatarText,
    color: u.avatarColor,
    bio: u.bio,
    gender: genderToCn(u.gender),
    credits: u.credits,
    member: u.memberPlan || "无",
    status: u.status === "banned" ? "封禁" : "正常",
    works: u.worksCount,
    likes: u.likesCount,
    followers: u.followers,
    following: u.following,
    reg: (u.createdAt ?? "").slice(0, 10),
    phone: u.phone,
    active: u.status !== "banned"
  };
}

const WORK_STATUS_CN: Record<string, string> = {
  published: "已发布", pending: "待审核", offline: "已下架", rejected: "已驳回", draft: "草稿"
};

interface ApiWork {
  id: number; userId: number; authorName?: string; title: string; modelId: string;
  ratio: string; quality: string; style: string; status: string; featured: boolean;
  recommend: boolean; likes: number; favorites: number; remakes: number; createdAt: string;
  description?: string; prompt?: string; imageUrl?: string;
  author?: { id: number; nickname: string; avatarText: string; avatarColor: string } | null;
}

export interface AdminWorkDetailData extends AdminWork {
  imageUrl?: string;
  author?: { id: number; name: string; avatar: string; color: string } | null;
}

export interface AdminReportData extends AdminReport {
  workTitle: string;
  reporterName: string;
}

export interface AdminFeedbackData extends AdminFeedback {
  imageUrls: string[];
}

function mapWork(w: ApiWork): AdminWorkDetailData {
  return {
    id: w.id,
    userId: w.userId,
    title: w.title,
    desc: w.description ?? "",
    prompt: w.prompt ?? "",
    model: w.modelId,
    ratio: w.ratio,
    quality: w.quality,
    style: w.style,
    likes: w.likes,
    favorites: w.favorites,
    remakes: w.remakes,
    status: WORK_STATUS_CN[w.status] ?? w.status,
    featured: w.featured,
    recommend: w.recommend,
    time: (w.createdAt ?? "").slice(0, 10),
    imageUrl: w.imageUrl,
    author: w.author
      ? { id: w.author.id, name: w.author.nickname, avatar: w.author.avatarText, color: w.author.avatarColor }
      : w.authorName
        ? { id: w.userId, name: w.authorName, avatar: w.authorName.slice(0, 1), color: "#5B9FE8" }
        : null
  };
}

export async function apiGetUsers(): Promise<AdminUser[]> {
  const page = await http.get<Paginated<ApiUser>>("/admin/users?page=1&pageSize=100");
  return page.items.map(mapUser);
}

export async function apiGetUserDetail(id: number): Promise<AdminUserDetailData> {
  const data = await http.get<ApiUser & { recentWorks: ApiWork[] }>(`/admin/users/${id}`);
  return { ...mapUser(data), recentWorks: (data.recentWorks ?? []).map(mapWork) };
}

export async function apiUpdateUser(id: number, values: { name: string; bio: string; gender: string }) {
  return mapUser(await http.patch<ApiUser>(`/admin/users/${id}`, {
    nickname: values.name,
    bio: values.bio,
    gender: genderToApi(values.gender)
  }));
}

export async function apiBanUser(id: number) {
  return mapUser(await http.post<ApiUser>(`/admin/users/${id}/ban`));
}

export async function apiUnbanUser(id: number) {
  return mapUser(await http.post<ApiUser>(`/admin/users/${id}/unban`));
}

export async function apiAdjustUserCredits(id: number, amount: number, reason: string) {
  return http.post<{ id: number; balance: number; amount: number }>(`/admin/users/${id}/credits/adjust`, { amount, reason });
}

export async function apiGetWorks(): Promise<AdminWork[]> {
  const page = await http.get<Paginated<ApiWork>>("/admin/works?page=1&pageSize=100");
  return page.items.map(mapWork);
}

export async function apiGetWorkDetail(id: number): Promise<AdminWorkDetailData> {
  return mapWork(await http.get<ApiWork>(`/admin/works/${id}`));
}

export async function apiUpdateWork(id: number, values: { title: string; desc: string; style: string }) {
  return mapWork(await http.patch<ApiWork>(`/admin/works/${id}`, {
    title: values.title,
    description: values.desc,
    style: values.style
  }));
}

export async function apiFeatureWork(id: number, featured: boolean) {
  return mapWork(await http.post<ApiWork>(`/admin/works/${id}/feature`, { featured }));
}

export async function apiRecommendWork(id: number, recommend: boolean) {
  return mapWork(await http.post<ApiWork>(`/admin/works/${id}/recommend`, { recommend }));
}

export async function apiOfflineWork(id: number) {
  return mapWork(await http.post<ApiWork>(`/admin/works/${id}/offline`));
}

export async function apiRestoreWork(id: number) {
  return mapWork(await http.post<ApiWork>(`/admin/works/${id}/restore`));
}

interface ApiReviewWork {
  id: number; title: string; imageUrl?: string; prompt: string; style: string;
  status: string; authorName: string; createdAt: string;
}

function mapReviewWork(w: ApiReviewWork): AdminWorkDetailData {
  return {
    id: w.id,
    userId: 0,
    title: w.title,
    desc: "",
    prompt: w.prompt,
    model: "",
    ratio: "",
    quality: "",
    style: w.style,
    likes: 0,
    favorites: 0,
    remakes: 0,
    status: WORK_STATUS_CN[w.status] ?? w.status,
    featured: false,
    recommend: false,
    time: (w.createdAt ?? "").slice(0, 10),
    imageUrl: w.imageUrl,
    author: { id: 0, name: w.authorName, avatar: w.authorName.slice(0, 1), color: "#5B9FE8" }
  };
}

export async function apiGetReviews(status = "pending"): Promise<AdminWorkDetailData[]> {
  const page = await http.get<Paginated<ApiReviewWork>>(`/admin/reviews?status=${encodeURIComponent(status)}&page=1&pageSize=100`);
  return page.items.map(mapReviewWork);
}

export async function apiApproveReview(id: number) {
  return http.post<{ ok: boolean; id: number; status: string }>(`/admin/reviews/${id}/approve`);
}

export async function apiRejectReview(id: number, reason: string) {
  return http.post<{ ok: boolean; id: number; status: string; reason: string }>(`/admin/reviews/${id}/reject`, { reason });
}

const REPORT_STATUS_CN: Record<string, string> = { pending: "待处理", resolved: "已处理", ignored: "已忽略" };

interface ApiReport {
  id: number; workId: number; workTitle: string; reporterId: number; reporterName: string;
  reason: string; description?: string; status: string; createdAt: string;
}

function mapReport(r: ApiReport): AdminReportData {
  return {
    id: r.id,
    reporter: r.reporterId,
    reporterName: r.reporterName,
    workId: r.workId,
    workTitle: r.workTitle,
    reason: r.reason,
    status: REPORT_STATUS_CN[r.status] ?? r.status,
    time: (r.createdAt ?? "").slice(0, 10)
  };
}

export async function apiGetReports(): Promise<AdminReportData[]> {
  const page = await http.get<Paginated<ApiReport>>("/admin/reports?page=1&pageSize=100");
  return page.items.map(mapReport);
}

export async function apiResolveReport(id: number, action: "offline" | "warn" | "ignore") {
  return http.post<{ ok: boolean; id: number; status: string }>(`/admin/reports/${id}/resolve`, {
    action: action === "ignore" ? "ignore" : "resolve",
    offline: action === "offline"
  });
}

const FEEDBACK_STATUS_CN: Record<string, string> = { pending: "待处理", processing: "处理中", resolved: "已解决", ignored: "不采纳" };
const FEEDBACK_STATUS_API: Record<string, string> = { 待处理: "pending", 处理中: "processing", 已解决: "resolved", 不采纳: "ignored" };

interface ApiFeedback {
  id: number; userId: number; type: string; content: string; imageUrls: string[];
  wechat: string; status: string; reply?: string; createdAt: string;
}

function mapFeedback(f: ApiFeedback): AdminFeedbackData {
  return {
    id: f.id,
    userId: f.userId,
    content: f.content,
    type: f.type,
    status: FEEDBACK_STATUS_CN[f.status] ?? f.status,
    time: (f.createdAt ?? "").slice(0, 10),
    imgs: f.imageUrls?.length ?? 0,
    imageUrls: f.imageUrls ?? [],
    wechat: f.wechat,
    reply: f.reply || undefined
  };
}

export async function apiGetFeedbacks(): Promise<AdminFeedbackData[]> {
  const page = await http.get<Paginated<ApiFeedback>>("/admin/feedback?page=1&pageSize=100");
  return page.items.map(mapFeedback);
}

export async function apiUpdateFeedbackStatus(id: number, status: string) {
  return mapFeedback(await http.patch<ApiFeedback>(`/admin/feedback/${id}`, { status: FEEDBACK_STATUS_API[status] ?? status }));
}

export async function apiReplyFeedback(id: number, reply: string) {
  return mapFeedback(await http.post<ApiFeedback>(`/admin/feedback/${id}/reply`, { reply }));
}

interface ApiSummary {
  metrics: { totalUsers: number; totalWorks: number; publishedWorks: number; pendingWorks: number; todayNewUsers: number; todayNewWorks: number };
  todos: { pendingWorks: number; pendingReports: number; pendingFeedback: number };
}

export async function apiGetDashboard(): Promise<{ metrics: TodayMetric[]; todos: DashboardTodos }> {
  const s = await http.get<ApiSummary>("/admin/dashboard/summary");
  const metrics: TodayMetric[] = [
    { key: "users", label: "新增用户", val: String(s.metrics.todayNewUsers), delta: 0, icon: "ri-user-add-line", color: "#5B9FE8", soft: "var(--info-soft)" },
    { key: "active", label: "总用户", val: String(s.metrics.totalUsers), delta: 0, icon: "ri-group-line", color: "#6FD4B0", soft: "var(--success-soft)" },
    { key: "works", label: "新增作品", val: String(s.metrics.todayNewWorks), delta: 0, icon: "ri-image-add-line", color: "#8B7FD6", soft: "var(--purple-soft)" },
    { key: "income", label: "总作品", val: String(s.metrics.totalWorks), delta: 0, icon: "ri-image-2-line", color: "#EF4444", soft: "var(--danger-soft)" }
  ];
  return {
    metrics,
    todos: { review: s.todos.pendingWorks, report: s.todos.pendingReports, feedback: s.todos.pendingFeedback }
  };
}

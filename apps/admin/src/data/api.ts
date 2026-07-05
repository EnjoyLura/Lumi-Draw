// 真实后端适配层：把后端 API 响应映射为页面沿用的 mock 形状，
// 这样开启/关闭模拟数据时页面渲染逻辑保持一致。
import { http, type Paginated } from "./http";
import type { AdminUser, AdminWork } from "./mock";
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

function mapUser(u: ApiUser): AdminUser {
  return {
    id: u.id,
    name: u.nickname,
    avatar: u.avatarText,
    color: u.avatarColor,
    bio: u.bio,
    gender: u.gender === "male" ? "男" : u.gender === "female" ? "女" : "",
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
  description?: string; prompt?: string;
}

function mapWork(w: ApiWork): AdminWork {
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
    time: (w.createdAt ?? "").slice(0, 10)
  };
}

export async function apiGetUsers(): Promise<AdminUser[]> {
  const page = await http.get<Paginated<ApiUser>>("/admin/users?page=1&pageSize=100");
  return page.items.map(mapUser);
}

export async function apiGetWorks(): Promise<AdminWork[]> {
  const page = await http.get<Paginated<ApiWork>>("/admin/works?page=1&pageSize=100");
  return page.items.map(mapWork);
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

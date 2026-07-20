// Real API adapter: maps backend responses into the shapes already used by pages.
import { http, type Paginated } from "./http";
import type { AdminAnnounce, AdminBanner, AdminCategory, AdminFeedback, AdminGameplay, AdminGenerationProvider, AdminHotSearch, AdminModel, AdminPush, AdminQuality, AdminRatio, AdminRecharge, AdminReport, AdminStyle, AdminTxn, AdminUser, AdminVersion, AdminWork, CheckinTier, MemberPlan, VersionItem } from "./mock";
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
  description?: string; prompt?: string; imageUrl?: string; thumbnailUrl?: string;
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
    thumbnailUrl: w.thumbnailUrl,
    authorName: w.author?.nickname ?? w.authorName,
    author: w.author
      ? { id: w.author.id, name: w.author.nickname, avatar: w.author.avatarText, color: w.author.avatarColor }
      : w.authorName
        ? { id: w.userId, name: w.authorName, avatar: w.authorName.slice(0, 1), color: "#5B9FE8" }
        : null
  };
}

export async function apiGetUsers(options: { keyword?: string; status?: "normal" | "banned"; member?: string } = {}): Promise<AdminUser[]> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (options.keyword?.trim()) params.set("keyword", options.keyword.trim());
  if (options.status) params.set("status", options.status);
  if (options.member) params.set("member", options.member);
  const page = await http.get<Paginated<ApiUser>>(`/admin/users?${params.toString()}`);
  return page.items.map(mapUser);
}

export interface AdminUsersSummary {
  total: number;
  todayNew: number;
  members: number;
  banned: number;
}

export async function apiGetUsersSummary(): Promise<AdminUsersSummary> {
  return http.get<AdminUsersSummary>("/admin/users/summary");
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

export async function apiGiftUserMember(id: number, planId: number, reason: string) {
  return mapUser(await http.post<ApiUser>(`/admin/users/${id}/member/gift`, { planId, reason }));
}

export async function apiGetWorks(): Promise<AdminWork[]> {
  const page = await http.get<Paginated<ApiWork>>("/admin/works?page=1&pageSize=100");
  return page.items.map(mapWork);
}

export interface AdminWorksSummary {
  total: number;
  todayNew: number;
  featured: number;
  offline: number;
}

export async function apiGetWorksSummary(): Promise<AdminWorksSummary> {
  return http.get<AdminWorksSummary>("/admin/works/summary");
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

export async function apiDeleteWork(id: number) {
  return http.del<{ ok: boolean; id: number; action: "delete" }>(`/admin/works/${id}`);
}

export interface AdminCreateWorkInput {
  userId: number;
  imageUrl: string;
  title: string;
  description: string;
  prompt: string;
  modelId: string;
  ratio: string;
  quality: string;
  style: string;
  tags: string[];
  featured: boolean;
  recommend: boolean;
}

export async function apiUploadAdminWorkImage(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return http.upload<{ imageUrl: string; ossKey: string; sizeBytes: number; contentType: string }>("/admin/works/upload-image", form);
}

export async function apiCreateAdminWork(input: AdminCreateWorkInput) {
  return mapWork(await http.post<ApiWork>("/admin/works", input));
}

interface ApiReviewWork {
  id: number; title: string; imageUrl?: string; thumbnailUrl?: string; prompt: string; style: string;
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
    thumbnailUrl: w.thumbnailUrl,
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
  const page = await http.get<Paginated<ApiReport>>("/admin/reports?status=pending&page=1&pageSize=100");
  return page.items.map(mapReport);
}

export async function apiResolveReport(id: number, action: "offline" | "warn" | "ignore") {
  return http.post<{ ok: boolean; id: number; status: string; deleted?: boolean }>(`/admin/reports/${id}/resolve`, {
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

interface ApiBanner {
  id: number; title: string; description: string; imageUrl?: string; thumbnailUrl?: string; action: string; sort: number; enabled: boolean;
}

function mapBanner(b: ApiBanner): AdminBanner {
  return { id: b.id, title: b.title, desc: b.description, imageUrl: b.imageUrl, thumbnailUrl: b.thumbnailUrl, action: b.action, sort: b.sort, on: b.enabled };
}

export async function apiGetBanners() {
  return (await http.get<ApiBanner[]>("/admin/banners")).map(mapBanner);
}

export async function apiUploadBannerImage(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return http.upload<{ imageUrl: string; ossKey: string; sizeBytes: number; contentType: string }>("/admin/banners/upload-image", form);
}

export async function apiSaveBanner(id: number, values: Pick<AdminBanner, "title" | "desc" | "action" | "sort"> & { imageUrl?: string; on?: boolean }) {
  const body = { title: values.title, description: values.desc, imageUrl: values.imageUrl, action: values.action, sort: values.sort, enabled: values.on };
  return mapBanner(id ? await http.patch<ApiBanner>(`/admin/banners/${id}`, body) : await http.post<ApiBanner>("/admin/banners", body));
}

export async function apiDeleteBanner(id: number) {
  return http.del<ApiBanner>(`/admin/banners/${id}`);
}

export async function apiSetBannerEnabled(id: number, enabled: boolean) {
  return mapBanner(await http.patch<ApiBanner>(`/admin/banners/${id}`, { enabled }));
}

interface ApiGameplay {
  id: number; name: string; description: string; uses: string | number; hot: boolean; imageUrl?: string; thumbnailUrl?: string; enabled: boolean; sort: number;
}

function mapGameplay(g: ApiGameplay): AdminGameplay {
  return { id: g.id, name: g.name, desc: g.description, uses: String(g.uses), hot: g.hot, imageUrl: g.imageUrl, thumbnailUrl: g.thumbnailUrl, on: g.enabled };
}

export async function apiGetGameplays() {
  return (await http.get<ApiGameplay[]>("/admin/gameplays")).map(mapGameplay);
}

export async function apiSaveGameplay(id: number, values: { name: string; desc: string; uses?: string; hot: boolean; imageUrl?: string; on?: boolean }) {
  const body = { name: values.name, description: values.desc, uses: values.uses, hot: values.hot, imageUrl: values.imageUrl, enabled: values.on };
  return mapGameplay(id ? await http.patch<ApiGameplay>(`/admin/gameplays/${id}`, body) : await http.post<ApiGameplay>("/admin/gameplays", body));
}

export async function apiDeleteGameplay(id: number) {
  return http.del<ApiGameplay>(`/admin/gameplays/${id}`);
}

export async function apiSetGameplayEnabled(id: number, enabled: boolean) {
  return mapGameplay(await http.patch<ApiGameplay>(`/admin/gameplays/${id}`, { enabled }));
}

interface ApiStyle {
  id: number; name: string; prompt: string; uses: number; imageUrl?: string; thumbnailUrl?: string; enabled: boolean; sort: number;
}

function mapStyle(s: ApiStyle): AdminStyle {
  return { id: s.id, n: s.name, prompt: s.prompt, s: s.uses, imageUrl: s.imageUrl, thumbnailUrl: s.thumbnailUrl };
}

export async function apiGetStyles() {
  return (await http.get<ApiStyle[]>("/admin/styles")).map(mapStyle);
}

export async function apiSaveStyle(id: number, values: { n: string; prompt: string; s: number; imageUrl?: string; sort?: number }) {
  const body = { name: values.n, prompt: values.prompt, uses: values.s, imageUrl: values.imageUrl, sort: values.sort };
  return mapStyle(id ? await http.patch<ApiStyle>(`/admin/styles/${id}`, body) : await http.post<ApiStyle>("/admin/styles", body));
}

export async function apiDeleteStyle(id: number) {
  return http.del<ApiStyle>(`/admin/styles/${id}`);
}

export async function apiUploadConfigImage(scene: "gameplay" | "style", file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return http.upload<{ imageUrl: string; ossKey: string; sizeBytes: number; contentType: string }>(`/admin/config-media/${scene}`, form);
}

interface ApiCategory {
  id: number; name: string; count: number; enabled: boolean; sort: number;
}

function mapCategory(c: ApiCategory): AdminCategory {
  return { id: c.id, n: c.name, cnt: c.count };
}

export async function apiGetCategories() {
  return (await http.get<ApiCategory[]>("/admin/categories")).map(mapCategory);
}

export async function apiSaveCategory(id: number, values: { n: string; cnt?: number; sort?: number }) {
  const body = { name: values.n, count: values.cnt, sort: values.sort };
  return mapCategory(id ? await http.patch<ApiCategory>(`/admin/categories/${id}`, body) : await http.post<ApiCategory>("/admin/categories", body));
}

export async function apiDeleteCategory(id: number) {
  return http.del<ApiCategory>(`/admin/categories/${id}`);
}

interface ApiHotSearch {
  id: number; keyword: string; hot: number; top: boolean; enabled: boolean; sort: number;
}

function mapHotSearch(h: ApiHotSearch): AdminHotSearch {
  return { id: h.id, k: h.keyword, hot: h.hot, top: h.top, sort: h.sort };
}

export async function apiGetHotSearches() {
  return (await http.get<ApiHotSearch[]>("/admin/hot-searches")).map(mapHotSearch);
}

export async function apiSaveHotSearch(id: number, values: { k: string; hot?: number; top: boolean; sort?: number }) {
  const body = { keyword: values.k, hot: values.hot, top: values.top, enabled: true, sort: values.sort };
  return mapHotSearch(id ? await http.patch<ApiHotSearch>(`/admin/hot-searches/${id}`, body) : await http.post<ApiHotSearch>("/admin/hot-searches", body));
}

export async function apiDeleteHotSearch(id: number) {
  return http.del<ApiHotSearch>(`/admin/hot-searches/${id}`);
}

interface ApiModelConfig {
  id: string; provider?: string; providerRouting?: Partial<Record<"1K" | "2K" | "4K", string>>; providerModel: string; name: string; description: string;
  tags: string[] | string; costCredits: number; badge: string; enabled: boolean; sort: number;
  supportsTextToImage: boolean; supportsImageToImage: boolean;
}

function modelTags(tags: string[] | string) {
  return Array.isArray(tags) ? tags : tags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean);
}

function mapModelConfig(m: ApiModelConfig): AdminModel {
  return { id: m.id, provider: m.provider, providerRouting: m.providerRouting || {}, providerModel: m.providerModel, name: m.name, desc: m.description, tags: modelTags(m.tags), cost: m.costCredits, badge: m.badge, on: m.enabled };
}

export async function apiGetModels() {
  return (await http.get<ApiModelConfig[]>("/admin/models")).map(mapModelConfig);
}

export async function apiSaveModel(id: string, values: Omit<AdminModel, "id"> & { id?: string }) {
  const modelId = id || values.id || `model-${Date.now()}`;
  const body = {
    id: modelId,
    provider: values.provider || "kie",
    providerRouting: values.providerRouting || {},
    providerModel: values.providerModel || modelId,
    name: values.name,
    description: values.desc,
    tags: values.tags,
    costCredits: values.cost,
    badge: values.badge,
    enabled: values.on,
    supportsTextToImage: true,
    supportsImageToImage: true
  };
  return mapModelConfig(id ? await http.patch<ApiModelConfig>(`/admin/models/${id}`, body) : await http.post<ApiModelConfig>("/admin/models", body));
}

interface ApiGenerationProvider {
  id: string;
  name: string;
  groupName: string;
  adapter: "ainb" | "change2pro" | "kie";
  requestMode: "sync" | "async";
  textResultMode: "auto" | "url" | "base64";
  imageResultMode: "auto" | "url" | "base64";
  baseUrl: string;
  imageEndpoint: string;
  queryEndpoint: string;
  statusEnabled: boolean;
  responseMapping: Record<string, string>;
  textToImageEnabled: boolean;
  imageToImageEnabled: boolean;
  apiKeyConfigured: boolean;
  apiKeyHint: string;
  apiKeySource: "admin" | "environment" | "none";
  requestParams: Record<string, string>;
  imageRequestParams: Record<string, string>;
  modelIds: string[];
  enabled: boolean;
  sort: number;
}

function mapGenerationProvider(provider: ApiGenerationProvider): AdminGenerationProvider {
  return {
    ...provider,
    apiKey: "",
    requestParams: { model: "", ...(provider.requestParams || {}) },
    imageRequestParams: { model: "", ...(provider.imageRequestParams || {}) },
    modelIds: provider.modelIds || [],
    on: provider.enabled
  };
}

export async function apiGetGenerationProviders() {
  return (await http.get<ApiGenerationProvider[]>("/admin/generation-providers")).map(mapGenerationProvider);
}

export async function apiSaveGenerationProvider(id: string, values: AdminGenerationProvider) {
  const body = {
    id: values.id,
    name: values.name,
    groupName: values.groupName,
    adapter: values.adapter,
    requestMode: values.requestMode,
    textResultMode: values.textResultMode || "auto",
    imageResultMode: values.imageResultMode || "auto",
    baseUrl: values.baseUrl,
    imageEndpoint: values.imageEndpoint,
    queryEndpoint: values.queryEndpoint,
    statusEnabled: values.statusEnabled,
    responseMapping: values.responseMapping,
    textToImageEnabled: values.textToImageEnabled,
    imageToImageEnabled: values.imageToImageEnabled,
    apiKey: values.apiKey || undefined,
    requestParams: values.requestParams,
    imageRequestParams: values.imageRequestParams,
    modelIds: values.modelIds,
    enabled: values.on,
    sort: values.sort
  };
  return mapGenerationProvider(id
    ? await http.patch<ApiGenerationProvider>(`/admin/generation-providers/${id}`, body)
    : await http.post<ApiGenerationProvider>("/admin/generation-providers", body));
}

export async function apiDeleteGenerationProvider(id: string) {
  return http.del<ApiGenerationProvider>(`/admin/generation-providers/${id}`);
}

export async function apiDeleteModel(id: string) {
  return http.del<ApiModelConfig>(`/admin/models/${id}`);
}

export async function apiSetModelEnabled(id: string, enabled: boolean) {
  return mapModelConfig(await http.patch<ApiModelConfig>(`/admin/models/${id}`, { enabled }));
}

interface ApiQualityConfig {
  id: number; label: string; pixel: string; multiplier: number; enabled: boolean; sort: number;
}

function mapQuality(q: ApiQualityConfig): AdminQuality {
  return { id: q.id, label: q.label, pixel: q.pixel, mult: q.multiplier, on: q.enabled };
}

export async function apiGetQualities() {
  return (await http.get<ApiQualityConfig[]>("/admin/qualities")).map(mapQuality);
}

export async function apiSaveQuality(id: number, values: AdminQuality & { sort?: number }) {
  const body = { label: values.label, pixel: values.pixel, multiplier: values.mult, enabled: values.on, sort: values.sort };
  return mapQuality(id ? await http.patch<ApiQualityConfig>(`/admin/qualities/${id}`, body) : await http.post<ApiQualityConfig>("/admin/qualities", body));
}

export async function apiDeleteQuality(id: number) {
  return http.del<ApiQualityConfig>(`/admin/qualities/${id}`);
}

export async function apiSetQualityEnabled(id: number, enabled: boolean) {
  return mapQuality(await http.patch<ApiQualityConfig>(`/admin/qualities/${id}`, { enabled }));
}

interface ApiRatioConfig {
  id: number; label: string; description: string; enabled: boolean; sort: number;
}

function mapRatio(r: ApiRatioConfig): AdminRatio {
  return { id: r.id, label: r.label, desc: r.description, on: r.enabled };
}

export async function apiGetRatios() {
  return (await http.get<ApiRatioConfig[]>("/admin/ratios")).map(mapRatio);
}

export async function apiSaveRatio(id: number, values: AdminRatio & { sort?: number }) {
  const body = { label: values.label, description: values.desc, enabled: values.on, sort: values.sort };
  return mapRatio(id ? await http.patch<ApiRatioConfig>(`/admin/ratios/${id}`, body) : await http.post<ApiRatioConfig>("/admin/ratios", body));
}

export async function apiDeleteRatio(id: number) {
  return http.del<ApiRatioConfig>(`/admin/ratios/${id}`);
}

export async function apiSetRatioEnabled(id: number, enabled: boolean) {
  return mapRatio(await http.patch<ApiRatioConfig>(`/admin/ratios/${id}`, { enabled }));
}

interface ApiRechargeTier {
  id: number; price: number; credits: number; bonus: number; enabled: boolean; sort: number;
}

function mapRecharge(t: ApiRechargeTier): AdminRecharge {
  return { id: t.id, price: t.price, credits: t.credits, bonus: t.bonus, on: t.enabled };
}

export async function apiGetRecharges() {
  return (await http.get<ApiRechargeTier[]>("/admin/recharge-tiers")).map(mapRecharge);
}

export async function apiSaveRecharge(id: number, values: AdminRecharge & { sort?: number }) {
  const body = { price: values.price, credits: values.credits, bonus: values.bonus, enabled: values.on, sort: values.sort };
  return mapRecharge(id ? await http.patch<ApiRechargeTier>(`/admin/recharge-tiers/${id}`, body) : await http.post<ApiRechargeTier>("/admin/recharge-tiers", body));
}

export async function apiDeleteRecharge(id: number) {
  return http.del<ApiRechargeTier>(`/admin/recharge-tiers/${id}`);
}

export async function apiSetRechargeEnabled(id: number, enabled: boolean) {
  return mapRecharge(await http.patch<ApiRechargeTier>(`/admin/recharge-tiers/${id}`, { enabled }));
}

interface ApiMemberPlan {
  id: number; name: string; price: number; rights: string; giftCredits: number; checkinBonus: number; milestoneBonus: number; publishBonus: number; enabled: boolean; sort: number;
}

function mapMemberPlan(p: ApiMemberPlan): MemberPlan {
  return { id: p.id, name: p.name, price: p.price, rights: p.rights, gift: p.giftCredits, ckBonus: p.checkinBonus, milestoneBonus: p.milestoneBonus, publishBonus: p.publishBonus };
}

export async function apiGetMemberPlans() {
  return (await http.get<ApiMemberPlan[]>("/admin/member-plans")).map(mapMemberPlan);
}

export async function apiSaveMemberPlan(id: number, values: MemberPlan & { sort?: number }) {
  const body = { name: values.name, price: values.price, rights: values.rights, giftCredits: values.gift, checkinBonus: values.ckBonus, milestoneBonus: values.milestoneBonus, publishBonus: values.publishBonus, enabled: true, sort: values.sort };
  return mapMemberPlan(id ? await http.patch<ApiMemberPlan>(`/admin/member-plans/${id}`, body) : await http.post<ApiMemberPlan>("/admin/member-plans", body));
}

export async function apiDeleteMemberPlan(id: number) {
  return http.del<ApiMemberPlan>(`/admin/member-plans/${id}`);
}

interface ApiCheckinConfig {
  base?: number;
  tiers?: number[] | CheckinTier[];
}

export interface AdminCheckinConfig {
  base: number;
  tiers: CheckinTier[];
}

function mapCheckinConfig(c: ApiCheckinConfig): AdminCheckinConfig {
  const raw = c.tiers ?? [10, 10, 15, 15, 20, 20, 50];
  return {
    base: Number(c.base ?? 10),
    tiers: raw.map((t, i) => typeof t === "number" ? { day: i + 1, c: t } : { day: t.day, c: t.c })
  };
}

export async function apiGetCheckinConfig() {
  return mapCheckinConfig(await http.get<ApiCheckinConfig>("/admin/checkin-config"));
}

export async function apiSaveCheckinConfig(config: AdminCheckinConfig) {
  return mapCheckinConfig(await http.put<ApiCheckinConfig>("/admin/checkin-config", {
    base: config.base,
    tiers: config.tiers
  }));
}

export interface AdminInviteConfig {
  enabled: boolean;
  inviterReward: number;
  inviteeReward: number;
  cap: number;
}

function mapInviteConfig(c: Partial<AdminInviteConfig>): AdminInviteConfig {
  return {
    enabled: c.enabled ?? true,
    inviterReward: Number(c.inviterReward ?? 50),
    inviteeReward: Number(c.inviteeReward ?? 30),
    cap: Number(c.cap ?? 20)
  };
}

export async function apiGetInviteConfig() {
  return mapInviteConfig(await http.get<Partial<AdminInviteConfig>>("/admin/invite-config"));
}

export async function apiSaveInviteConfig(config: AdminInviteConfig) {
  return mapInviteConfig(await http.put<Partial<AdminInviteConfig>>("/admin/invite-config", config));
}

export interface AdminCreditsConfig {
  registerGift: number;
  publishReward: number;
  favoriteReward: number;
  inviteReward: number;
}

function mapCreditsConfig(c: Partial<AdminCreditsConfig>): AdminCreditsConfig {
  return {
    registerGift: Number(c.registerGift ?? 100),
    publishReward: Number(c.publishReward ?? 50),
    favoriteReward: Number(c.favoriteReward ?? 5),
    inviteReward: Number(c.inviteReward ?? 50)
  };
}

export async function apiGetCreditsConfig() {
  return mapCreditsConfig(await http.get<Partial<AdminCreditsConfig>>("/admin/credits/config"));
}

export async function apiSaveCreditsConfig(config: AdminCreditsConfig) {
  return mapCreditsConfig(await http.put<Partial<AdminCreditsConfig>>("/admin/credits/config", config));
}

export interface AdminCreatorTitleTier {
  minWorks: number;
  name: string;
}

const DEFAULT_CREATOR_TITLE_TIERS: AdminCreatorTitleTier[] = [
  { minWorks: 0, name: "画布新星" },
  { minWorks: 1, name: "灵感画师" },
  { minWorks: 10, name: "创意达人" },
  { minWorks: 30, name: "风格主理人" },
  { minWorks: 50, name: "光影大师" },
  { minWorks: 100, name: "星耀艺术家" }
];

export function apiGetCreatorTitles() {
  return http.get<{ tiers?: AdminCreatorTitleTier[] }>("/admin/creator-titles").then((result) => ({
    tiers: result.tiers?.length === 6 ? result.tiers : DEFAULT_CREATOR_TITLE_TIERS
  }));
}

export function apiSaveCreatorTitles(tiers: AdminCreatorTitleTier[]) {
  return http.put<{ tiers: AdminCreatorTitleTier[] }>("/admin/creator-titles", { tiers });
}

const TXN_TYPE_CN: Record<string, string> = {
  recharge: "充值", consume: "消费", refund: "退款", checkin: "签到", invite: "邀请", membership: "会员", adjust: "调整"
};

interface ApiTransaction {
  id: number; userId: number; userName: string; type: string; amount: number; balanceAfter: number; reason: string; createdAt: string;
}

function mapTransaction(t: ApiTransaction): AdminTxn {
  const type = TXN_TYPE_CN[t.type] ?? t.type;
  return {
    id: t.id,
    userId: t.userId,
    userName: t.userName,
    type,
    amount: `${t.amount >= 0 ? "+" : ""}${t.amount}积分`,
    credits: `余额 ${t.balanceAfter}`,
    status: "成功",
    time: formatChinaDateTime(t.createdAt)
  };
}

function formatChinaDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

interface ApiPaymentOrder {
  id: string; orderNo: string; transactionId?: string | null; userId: number; userName: string;
  type: string; status: string; channel: string; amountFen: number; credits: number;
  subject: string; paidAt?: string | null; createdAt: string;
}

const PAYMENT_TYPE_CN: Record<string, string> = { recharge: "充值", membership: "会员" };
const PAYMENT_STATUS_CN: Record<string, string> = { paid: "成功", pending: "待支付", closed: "失败", failed: "失败", refunded: "已退款" };

function mapPaymentOrder(order: ApiPaymentOrder): AdminTxn {
  const yuan = order.amountFen / 100;
  return {
    id: order.id, userId: order.userId, userName: order.userName,
    type: PAYMENT_TYPE_CN[order.type] ?? order.type,
    amount: `¥${yuan.toLocaleString("zh-CN", { minimumFractionDigits: yuan % 1 ? 2 : 0, maximumFractionDigits: 2 })}`,
    credits: order.credits ? `+${order.credits}积分` : "—",
    status: PAYMENT_STATUS_CN[order.status] ?? order.status,
    time: formatChinaDateTime(order.paidAt ?? order.createdAt),
    orderNo: order.orderNo,
    transactionId: order.transactionId ?? undefined,
    channel: order.channel
  };
}

export async function apiGetPaymentOrders() {
  const page = await http.get<Paginated<ApiPaymentOrder>>("/admin/payment-orders?page=1&pageSize=100");
  return page.items.map(mapPaymentOrder);
}

export async function apiGetTransactions(options: { userId?: number; type?: string } = {}) {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (options.userId) params.set("userId", String(options.userId));
  if (options.type) params.set("type", options.type);
  const page = await http.get<Paginated<ApiTransaction>>(`/admin/transactions?${params.toString()}`);
  return page.items.map(mapTransaction);
}

interface ApiAnnouncement {
  id: number; title: string; summary: string; action: string; popup: boolean; rangeText: string; enabled: boolean; createdAt: string;
}

function mapAnnouncement(a: ApiAnnouncement): AdminAnnounce {
  return {
    id: a.id,
    title: a.title,
    summary: a.summary,
    action: a.action || "无",
    popup: a.popup,
    time: (a.createdAt ?? "").slice(0, 10),
    range: a.rangeText || "长期"
  };
}

export async function apiGetAnnouncements() {
  return (await http.get<ApiAnnouncement[]>("/admin/announcements")).map(mapAnnouncement);
}

export async function apiSaveAnnouncement(id: number, values: Pick<AdminAnnounce, "title" | "summary" | "action" | "popup" | "range">) {
  const body = { title: values.title, summary: values.summary, action: values.action, popup: values.popup, rangeText: values.range, enabled: true };
  return mapAnnouncement(id ? await http.patch<ApiAnnouncement>(`/admin/announcements/${id}`, body) : await http.post<ApiAnnouncement>("/admin/announcements", body));
}

export async function apiDeleteAnnouncement(id: number) {
  return http.del<ApiAnnouncement>(`/admin/announcements/${id}`);
}

export async function apiSetAnnouncementPopup(id: number, popup: boolean) {
  return mapAnnouncement(await http.patch<ApiAnnouncement>(`/admin/announcements/${id}`, { popup }));
}

const PUSH_STATUS_CN: Record<string, string> = { draft: "草稿", sent: "已发送", revoked: "已撤回" };

interface ApiPush {
  id: number; title: string; content: string; target: string; status: string; sentAt?: string | null; createdAt: string;
}

function mapPush(p: ApiPush): AdminPush {
  const time = p.sentAt ?? p.createdAt;
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    target: p.target,
    status: PUSH_STATUS_CN[p.status] ?? p.status,
    time: (time ?? "").replace("T", " ").slice(0, 16)
  };
}

export async function apiGetPushes() {
  return (await http.get<ApiPush[]>("/admin/pushes")).map(mapPush);
}

export async function apiCreateAndSendPush(values: Pick<AdminPush, "title" | "content" | "target">) {
  const created = await http.post<ApiPush>("/admin/pushes", { ...values, status: "draft" });
  return mapPush(await http.post<ApiPush>(`/admin/pushes/${created.id}/send`));
}

export async function apiRevokePush(id: number) {
  return mapPush(await http.post<ApiPush>(`/admin/pushes/${id}/revoke`));
}

interface ApiSensitiveWord {
  id: number; word: string; createdAt: string;
}

export interface AdminSensitiveWord {
  id: number;
  word: string;
}

function mapSensitiveWord(w: ApiSensitiveWord): AdminSensitiveWord {
  return { id: w.id, word: w.word };
}

export async function apiGetSensitiveWords() {
  return (await http.get<ApiSensitiveWord[]>("/admin/sensitive-words")).map(mapSensitiveWord);
}

export async function apiAddSensitiveWords(words: string[]) {
  return (await http.post<ApiSensitiveWord[]>("/admin/sensitive-words", { words })).map(mapSensitiveWord);
}

export async function apiDeleteSensitiveWord(id: number) {
  return http.del<ApiSensitiveWord>(`/admin/sensitive-words/${id}`);
}

interface ApiVersion {
  id: number; version: string; releasedAt: string; items: VersionItem[]; sort: number; createdAt: string;
}

function mapVersion(v: ApiVersion): AdminVersion {
  return { id: v.id, ver: v.version, time: v.releasedAt, items: Array.isArray(v.items) ? v.items : [] };
}

export async function apiGetVersions() {
  return (await http.get<ApiVersion[]>("/admin/versions")).map(mapVersion);
}

export async function apiSaveVersion(id: number, values: Pick<AdminVersion, "ver" | "items">) {
  const body = { version: values.ver, releasedAt: new Date().toISOString().slice(0, 10), items: values.items, sort: 0 };
  return mapVersion(id ? await http.patch<ApiVersion>(`/admin/versions/${id}`, body) : await http.post<ApiVersion>("/admin/versions", body));
}

export async function apiDeleteVersion(id: number) {
  return http.del<ApiVersion>(`/admin/versions/${id}`);
}

const AGREEMENT_TYPE_BY_NAME: Record<string, string> = {
  用户协议: "user",
  隐私政策: "privacy",
  充值协议: "recharge",
  社区规范: "community"
};

const AGREEMENT_NAME_BY_TYPE: Record<string, string> = Object.fromEntries(Object.entries(AGREEMENT_TYPE_BY_NAME).map(([k, v]) => [v, k]));

export interface AdminAgreement {
  type: string;
  name: string;
  title: string;
  content: string;
  updatedAt?: string;
}

interface ApiAgreement {
  type: string; title: string; content: string; updatedAt: string;
}

function mapAgreement(a: ApiAgreement): AdminAgreement {
  return { type: a.type, name: AGREEMENT_NAME_BY_TYPE[a.type] ?? a.title, title: a.title, content: a.content, updatedAt: (a.updatedAt ?? "").slice(0, 10) };
}

export async function apiGetAgreements() {
  return (await http.get<ApiAgreement[]>("/admin/agreements")).map(mapAgreement);
}

export async function apiSaveAgreement(name: string, content: string) {
  const type = AGREEMENT_TYPE_BY_NAME[name] ?? name;
  return mapAgreement(await http.put<ApiAgreement>(`/admin/agreements/${type}`, { title: name, content }));
}

export interface AdminReviewSettings {
  wxTextSecCheckEnabled: boolean;
  wxImageSecCheckEnabled: boolean;
  manualReviewEnabled: boolean;
  autoPublishAfterPass: boolean;
}

export async function apiGetReviewSettings() {
  return http.get<AdminReviewSettings>("/admin/review-settings");
}

export async function apiSaveReviewSettings(values: AdminReviewSettings) {
  return http.put<AdminReviewSettings>("/admin/review-settings", values);
}

export interface AdminSystemSettings {
  reviewMode: string;
  manualReviewEnabled: boolean;
}

function boolSetting(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
}

export async function apiGetSystemSettings(): Promise<AdminSystemSettings> {
  const data = await http.get<Record<string, unknown>>("/admin/settings");
  return {
    reviewMode: typeof data.reviewMode === "string" ? data.reviewMode : "auto",
    manualReviewEnabled: boolSetting(data.manualReviewEnabled, true)
  };
}

export async function apiSaveSystemSettings(values: AdminSystemSettings) {
  const data = await http.put<Record<string, unknown>>("/admin/settings", values);
  return {
    reviewMode: typeof data.reviewMode === "string" ? data.reviewMode : values.reviewMode,
    manualReviewEnabled: boolSetting(data.manualReviewEnabled, values.manualReviewEnabled)
  };
}

interface ApiSummary {
  metrics: { totalUsers: number; totalWorks: number; publishedWorks: number; pendingWorks: number; todayNewUsers: number; todayNewWorks: number };
  todos: { pendingWorks: number; pendingReports: number; pendingFeedback: number };
}

export async function apiGetDashboard(): Promise<{ metrics: TodayMetric[]; todos: DashboardTodos }> {
  const s = await http.get<ApiSummary>("/admin/dashboard/summary");
  const metrics: TodayMetric[] = [
    { key: "newUsers", label: "新增用户", val: String(s.metrics.todayNewUsers), delta: 0, icon: "ri-user-add-line", color: "#5B9FE8", soft: "var(--info-soft)" },
    { key: "totalUsers", label: "总用户", val: String(s.metrics.totalUsers), delta: 0, icon: "ri-group-line", color: "#6FD4B0", soft: "var(--success-soft)" },
    { key: "newWorks", label: "新增作品", val: String(s.metrics.todayNewWorks), delta: 0, icon: "ri-image-add-line", color: "#8B7FD6", soft: "var(--purple-soft)" },
    { key: "totalWorks", label: "总作品", val: String(s.metrics.totalWorks), delta: 0, icon: "ri-image-2-line", color: "#EF4444", soft: "var(--danger-soft)" }
  ];
  return {
    metrics,
    todos: { review: s.todos.pendingWorks, report: s.todos.pendingReports, feedback: s.todos.pendingFeedback }
  };
}

export interface AdminDashboardTrends {
  labels: string[];
  users: number[];
  works: number[];
  income: number[];
}

interface ApiDashboardTrends {
  labels: string[];
  newUsers: number[];
  newWorks: number[];
  incomeFen: number[];
}

function shortDateLabels(labels: string[]) {
  return labels.map((label) => label.slice(5));
}

export async function apiGetDashboardTrends(): Promise<AdminDashboardTrends> {
  const t = await http.get<ApiDashboardTrends>("/admin/dashboard/trends?range=7d");
  return {
    labels: shortDateLabels(t.labels),
    users: t.newUsers,
    works: t.newWorks,
    income: (t.incomeFen ?? []).map((value) => value / 100)
  };
}

export interface AdminDashboardDetail {
  labels: string[];
  series: number[];
  total: number;
}

export async function apiGetDashboardDetail(metric: string): Promise<AdminDashboardDetail> {
  const actualMetric = ["newUsers", "totalUsers", "newWorks", "totalWorks"].includes(metric) ? metric : metric === "works" ? "newWorks" : "newUsers";
  const d = await http.get<{ labels: string[]; series: number[]; total: number }>(`/admin/dashboard/detail?metric=${actualMetric}&range=7d`);
  return { labels: shortDateLabels(d.labels), series: d.series, total: d.total };
}

export interface AdminFinanceSummary {
  todayIncomeFen: number;
  monthIncomeFen: number;
  totalIncomeFen: number;
  monthRefundFen: number;
  paidOrders: number;
  pendingOrders: number;
}

export async function apiGetFinanceSummary(): Promise<AdminFinanceSummary> {
  return http.get<AdminFinanceSummary>("/admin/dashboard/finance-summary");
}

export interface AdminGenerationStats {
  models: Array<{ id: string; count: number }>;
  qualities: Array<{ name: string; count: number }>;
  ratios: Array<{ name: string; count: number }>;
  conversionRate: number;
}

export async function apiGetGenerationStats(): Promise<AdminGenerationStats> {
  return http.get<AdminGenerationStats>("/admin/dashboard/generation-stats");
}

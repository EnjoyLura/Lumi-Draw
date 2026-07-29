import type { ReactNode } from "react";
import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  FileTextOutlined,
  FireOutlined,
  GiftOutlined,
  HighlightOutlined,
  HomeOutlined,
  MessageOutlined,
  NotificationOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
  TransactionOutlined,
  UserAddOutlined,
  UserOutlined,
  WalletOutlined
} from "@ant-design/icons";
import type { StackEntry } from "./NavContext";

export interface AdminRouteNode {
  path: string;
  name: string;
  icon?: ReactNode;
  children?: AdminRouteNode[];
  hideInMenu?: boolean;
}

export const ADMIN_ROUTES: AdminRouteNode[] = [
  {
    path: "/dashboard-group",
    name: "仪表盘",
    icon: <DashboardOutlined />,
    children: [
      { path: "/workbench", name: "工作台", icon: <HomeOutlined /> },
      { path: "/dashboard", name: "数据大屏", icon: <BarChartOutlined /> }
    ]
  },
  {
    path: "/content-group",
    name: "用户与内容",
    icon: <TeamOutlined />,
    children: [
      { path: "/users", name: "用户管理", icon: <UserOutlined /> },
      { path: "/works", name: "作品管理", icon: <PictureOutlined /> },
      { path: "/reviews", name: "内容审核", icon: <AuditOutlined /> }
    ]
  },
  {
    path: "/operations-group",
    name: "运营配置",
    icon: <AppstoreOutlined />,
    children: [
      { path: "/operations/banners", name: "走马灯", icon: <PictureOutlined /> },
      { path: "/operations/gameplays", name: "玩法模板", icon: <HighlightOutlined /> },
      { path: "/operations/styles", name: "风格管理", icon: <BookOutlined /> },
      { path: "/operations/categories", name: "分类管理", icon: <TagsOutlined /> },
      { path: "/operations/hot-searches", name: "热搜管理", icon: <FireOutlined /> },
      { path: "/operations/models", name: "模型管理", icon: <AppstoreOutlined /> },
      { path: "/operations/providers", name: "API 平台", icon: <ApiOutlined /> },
      { path: "/operations/qualities", name: "分辨率配置", icon: <SafetyCertificateOutlined /> },
      { path: "/operations/ratios", name: "尺寸比例", icon: <SearchOutlined /> },
      { path: "/operations/creator-titles", name: "创作者称号", icon: <TagsOutlined /> }
    ]
  },
  {
    path: "/finance-group",
    name: "财务管理",
    icon: <WalletOutlined />,
    children: [
      { path: "/finance", name: "财务概览", icon: <DollarOutlined /> },
      { path: "/finance/recharge", name: "充值方案", icon: <GiftOutlined /> },
      { path: "/finance/membership", name: "会员方案", icon: <SafetyCertificateOutlined /> },
      { path: "/finance/checkin", name: "签到配置", icon: <CalendarOutlined /> },
      { path: "/finance/invite", name: "邀请配置", icon: <UserAddOutlined /> },
      { path: "/finance/transactions", name: "交易记录", icon: <TransactionOutlined /> },
      { path: "/finance/credits", name: "积分基础配置", icon: <SettingOutlined /> }
    ]
  },
  {
    path: "/messages-group",
    name: "消息管理",
    icon: <MessageOutlined />,
    children: [
      { path: "/messages/announcements", name: "弹窗公告", icon: <NotificationOutlined /> },
      { path: "/messages/push", name: "系统通知", icon: <BellOutlined /> },
      { path: "/messages/feedback", name: "用户反馈", icon: <MessageOutlined /> }
    ]
  },
  {
    path: "/settings-group",
    name: "系统",
    icon: <SettingOutlined />,
    children: [
      { path: "/settings", name: "系统设置", icon: <SettingOutlined /> },
      { path: "/settings/audit", name: "审核设置", icon: <AuditOutlined /> },
      { path: "/settings/sensitive-words", name: "敏感词管理", icon: <SafetyCertificateOutlined /> },
      { path: "/settings/versions", name: "版本管理", icon: <FileTextOutlined /> },
      { path: "/settings/agreements", name: "协议管理", icon: <FileTextOutlined /> }
    ]
  }
];

const STATIC_PATHS: Record<string, string> = {
  home: "/workbench",
  dashboard: "/dashboard",
  users: "/users",
  works: "/works",
  review: "/reviews",
  ops: "/operations/banners",
  opsBanner: "/operations/banners",
  opsGameplay: "/operations/gameplays",
  opsStyle: "/operations/styles",
  opsCategory: "/operations/categories",
  opsHotSearch: "/operations/hot-searches",
  opsModel: "/operations/models",
  opsApiProvider: "/operations/providers",
  opsQuality: "/operations/qualities",
  opsRatio: "/operations/ratios",
  opsCreatorTitle: "/operations/creator-titles",
  finance: "/finance",
  finRecharge: "/finance/recharge",
  finMember: "/finance/membership",
  finCheckin: "/finance/checkin",
  finInvite: "/finance/invite",
  finTxn: "/finance/transactions",
  setBase: "/finance/credits",
  messages: "/messages/announcements",
  msgAnnounce: "/messages/announcements",
  msgPush: "/messages/push",
  msgFeedback: "/messages/feedback",
  settings: "/settings",
  setAudit: "/settings/audit",
  setSensitive: "/settings/sensitive-words",
  setVersion: "/settings/versions",
  setAgreement: "/settings/agreements"
};

export function entryToPath(id: string, param?: string) {
  if (id === "dataDetail") return `/dashboard/${encodeURIComponent(param || "users")}`;
  if (id === "userDetail") return `/users/${encodeURIComponent(param || "")}`;
  if (id === "workDetail") return `/works/${encodeURIComponent(param || "")}`;
  if (id === "reviewDetail") return `/reviews/${encodeURIComponent(param || "")}`;
  if (id === "review" && param === "report") return "/reviews?tab=report";
  return STATIC_PATHS[id] || "/workbench";
}

export function pathToEntry(pathname: string, search = ""): StackEntry {
  const path = pathname.replace(/\/+$/, "") || "/";
  const query = new URLSearchParams(search);
  if (path === "/" || path === "/workbench") return { id: "home" };
  if (path === "/dashboard") return { id: "dashboard" };
  if (path.startsWith("/dashboard/")) return { id: "dataDetail", param: decodeURIComponent(path.slice(11)) };
  if (path === "/users") return { id: "users" };
  if (path.startsWith("/users/")) return { id: "userDetail", param: decodeURIComponent(path.slice(7)) };
  if (path === "/works") return { id: "works" };
  if (path.startsWith("/works/")) return { id: "workDetail", param: decodeURIComponent(path.slice(7)) };
  if (path === "/reviews") return { id: "review", param: query.get("tab") === "report" ? "report" : undefined };
  if (path.startsWith("/reviews/")) return { id: "reviewDetail", param: decodeURIComponent(path.slice(9)) };

  const matched = Object.entries(STATIC_PATHS).find(([, target]) => target === path);
  return matched ? { id: matched[0] } : { id: "home" };
}

export function findRouteName(pathname: string) {
  const exact = ADMIN_ROUTES
    .flatMap((item) => item.children || [item])
    .find((item) => item.path === pathname);
  if (exact) return exact.name;
  if (pathname.startsWith("/users/")) return "用户详情";
  if (pathname.startsWith("/works/")) return "作品详情";
  if (pathname.startsWith("/reviews/")) return "审核详情";
  if (pathname.startsWith("/dashboard/")) return "数据详情";
  return "工作台";
}

export function findRouteDescription(pathname: string) {
  if (pathname === "/workbench") return "掌握关键指标和待办事项，快速进入高频运营工作";
  if (pathname.startsWith("/dashboard")) return "查看用户、作品、收入和生成服务的业务趋势";
  if (pathname.startsWith("/users")) return "查询用户状态、会员权益、积分余额与内容贡献";
  if (pathname.startsWith("/works")) return "管理作品状态、精选推荐、展示信息与违规下架";
  if (pathname.startsWith("/reviews")) return "集中处理待审核作品、图片审核结果与用户举报";
  if (pathname.startsWith("/operations/providers")) return "配置生成服务、分组优先级、故障降级与运行统计";
  if (pathname.startsWith("/operations/models")) return "管理创作模型、积分成本及不同清晰度的 API 路由";
  if (pathname.startsWith("/operations")) return "维护小程序中的运营内容、创作选项和展示顺序";
  if (pathname.startsWith("/finance")) return "管理积分、充值、会员权益与交易记录";
  if (pathname.startsWith("/messages")) return "处理公告、系统通知和用户反馈";
  if (pathname.startsWith("/settings")) return "维护审核、安全、版本、协议和系统基础设置";
  return "露米绘画AI运营管理后台";
}

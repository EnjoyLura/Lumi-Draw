import { AuditOutlined, BarChartOutlined, BellOutlined, PictureOutlined, SettingOutlined, TeamOutlined, WalletOutlined } from "@ant-design/icons";
import { Alert, Card, Col, List, Row, Spin, Tag, Typography } from "antd";
import { AdminFeatureGrid, type AdminFeatureItem } from "../components/AdminFeatureGrid";
import { apiGetDashboard } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { getDashboardTodos, getTodayMetrics } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { StatCard } from "../ui";

const QUICK_ENTRIES: AdminFeatureItem[] = [
  { id: "users", title: "用户管理", description: "管理用户状态、积分和会员权益", icon: <TeamOutlined />, color: "#5b9fe8" },
  { id: "works", title: "作品管理", description: "管理作品展示、精选和首页推荐", icon: <PictureOutlined />, color: "#22a06b" },
  { id: "review", title: "内容审核", description: "处理待审作品与用户举报", icon: <AuditOutlined />, color: "#d88900" },
  { id: "dashboard", title: "数据大屏", description: "查看用户、作品和收入趋势", icon: <BarChartOutlined />, color: "#8b7fd6" },
  { id: "finance", title: "财务管理", description: "维护充值、会员和积分策略", icon: <WalletOutlined />, color: "#d85c7f" },
  { id: "messages", title: "消息管理", description: "运营公告、系统通知和用户反馈", icon: <BellOutlined />, color: "#5b9fe8" },
  { id: "settings", title: "系统设置", description: "审核、安全、版本与协议配置", icon: <SettingOutlined />, color: "#5b6675" }
];

export function Home() {
  const { go } = useNav();
  const { useMock } = useAdminSession();
  const dashboard = useAsyncData(useMock ? null : apiGetDashboard, [useMock]);
  const metrics = useMock ? getTodayMetrics() : dashboard.data?.metrics ?? [];
  const todos = useMock ? getDashboardTodos() : dashboard.data?.todos ?? { review: 0, report: 0, feedback: 0 };
  const todayNewUsers = metrics.find((item) => item.key === "newUsers")?.val ?? "0";
  const pending = [
    { id: "review", label: "待审核作品", description: "有作品等待审核处理", icon: <AuditOutlined />, color: "#d88900", count: todos.review },
    { id: "review-report", label: "举报待处理", description: "用户举报需要进一步审查", icon: <i className="ri-flag-line" />, color: "#d85c7f", count: todos.report },
    { id: "msgFeedback", label: "用户反馈", description: "待回复的用户反馈", icon: <BellOutlined />, color: "#5b9fe8", count: todos.feedback }
  ];
  return (
    <div className="lumi-admin-page lumi-workbench-page">
      {dashboard.error && !useMock ? <Alert showIcon type="error" message="工作台数据加载失败" description={dashboard.error} /> : null}
      <Card className="lumi-workbench-hero" bordered={false}>
        <Typography.Text>运营工作台</Typography.Text>
        <Typography.Title level={3}>下午好，超级管理员</Typography.Title>
        <Typography.Paragraph>露米绘画 AI 运行正常，今日已有 <strong>{todayNewUsers}</strong> 位新用户加入。</Typography.Paragraph>
      </Card>
      <Spin spinning={dashboard.loading && !useMock}>
        <div className="lumi-metrics stat-grid">
          {metrics.map((metric) => <StatCard key={metric.key} label={metric.label} val={metric.val} delta={metric.delta} icon={metric.icon} color={metric.color} soft={metric.soft} onClick={() => go("dataDetail", metric.key)} />)}
        </div>
      </Spin>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card title="待办事项" className="lumi-workbench-todos">
            <List
              dataSource={pending}
              renderItem={(item) => (
                <List.Item className="lumi-workbench-todo" onClick={() => go(item.id === "review-report" ? "review" : item.id, item.id === "review-report" ? "report" : undefined, true)}>
                  <span className="lumi-workbench-todo__icon" style={{ background: `${item.color}18`, color: item.color }}>{item.icon}</span>
                  <List.Item.Meta title={item.label} description={item.description} />
                  <Tag color={item.count ? "gold" : "default"}>{item.count} 待处理</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={14}>
          <Card title="快捷入口" className="lumi-workbench-quick-card">
            <AdminFeatureGrid items={QUICK_ENTRIES.slice(0, 6)} onSelect={(id) => go(id, undefined, true)} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

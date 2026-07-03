import { DashboardOutlined, SettingOutlined } from "@ant-design/icons";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import { mockAdminMetrics } from "@lumi-draw/shared";
import { App as AntApp, Card, ConfigProvider, Space, Switch, Typography } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useMemo, useState } from "react";
import { readUseMockData, writeUseMockData } from "./dataMode";

type PageKey = "dashboard" | "settings";

const route = {
  path: "/",
  routes: [
    {
      path: "/dashboard",
      name: "工作台",
      icon: <DashboardOutlined />
    },
    {
      path: "/settings",
      name: "系统设置",
      icon: <SettingOutlined />
    }
  ]
};

export default function App() {
  const [pathname, setPathname] = useState("/dashboard");
  const [useMockData, setUseMockDataState] = useState(readUseMockData);

  const pageKey = useMemo<PageKey>(() => {
    return pathname === "/settings" ? "settings" : "dashboard";
  }, [pathname]);

  const setUseMockData = (value: boolean) => {
    setUseMockDataState(value);
    writeUseMockData(value);
  };

  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <ProLayout
          title="露米绘画后台"
          logo={false}
          route={route}
          location={{ pathname }}
          menuItemRender={(item, dom) => (
            <a
              onClick={() => {
                if (item.path) setPathname(item.path);
              }}
            >
              {dom}
            </a>
          )}
        >
          <PageContainer
            title={pageKey === "dashboard" ? "工作台" : "系统设置"}
            extra={
              <Space>
                <Typography.Text type="secondary">模拟数据</Typography.Text>
                <Switch checked={useMockData} onChange={setUseMockData} />
              </Space>
            }
          >
            {pageKey === "dashboard" ? (
              <Space direction="vertical" size={16} className="page-stack">
                <Card>
                  <Typography.Title level={4}>管理后台前端基础框架已就绪</Typography.Title>
                  <Typography.Text type="secondary">
                    当前使用{useMockData ? "模拟数据" : "真实接口"}。后续每次只迁移一个后台界面。
                  </Typography.Text>
                </Card>
                <div className="metric-grid">
                  {mockAdminMetrics.map((metric) => (
                    <Card key={metric.key}>
                      <Typography.Text type="secondary">{metric.label}</Typography.Text>
                      <Typography.Title level={3}>
                        {metric.unit === "CNY" ? "¥" : ""}
                        {metric.value.toLocaleString()}
                      </Typography.Title>
                    </Card>
                  ))}
                </div>
              </Space>
            ) : (
              <Card>
                <Space direction="vertical" size={12}>
                  <Typography.Title level={4}>模拟数据开关</Typography.Title>
                  <Typography.Text type="secondary">
                    开启时管理后台使用本地 mock 数据；关闭后进入真实后端 API 联调模式。
                  </Typography.Text>
                  <Switch
                    checkedChildren="模拟数据"
                    unCheckedChildren="真实接口"
                    checked={useMockData}
                    onChange={setUseMockData}
                  />
                </Space>
              </Card>
            )}
          </PageContainer>
        </ProLayout>
      </AntApp>
    </ConfigProvider>
  );
}

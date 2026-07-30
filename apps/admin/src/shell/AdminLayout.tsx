import { CheckOutlined, ColumnHeightOutlined, LogoutOutlined, SettingOutlined } from "@ant-design/icons";
import { ProLayout, type ProSettings } from "@ant-design/pro-components";
import { Avatar, Drawer, Dropdown, Modal, Space, Tag, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminSession } from "../data/adminSession";
import { MOCK_DATA_AVAILABLE } from "../dataMode";
import { renderPage } from "../pages/registry";
import { PageBoundary } from "./PageBoundary";
import { useNav } from "./NavContext";
import { ADMIN_ROUTES, findRouteDescription, findRouteName } from "./routes";

const DENSITY_KEY = "lumi-admin-density";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { useMock, setUseMock, logout } = useAdminSession();
  const { current, sheet, dialog, closeSheet, closeDialog, toastMsg, toastShow } = useNav();
  const [collapsed, setCollapsed] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    () => (window.localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable")
  );
  const [messageApi, messageHolder] = message.useMessage();
  const title = findRouteName(location.pathname);
  const description = findRouteDescription(location.pathname);

  useEffect(() => {
    document.documentElement.dataset.adminDensity = density;
    window.localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  useEffect(() => {
    if (toastShow && toastMsg) void messageApi.open({ type: "info", content: toastMsg });
  }, [messageApi, toastMsg, toastShow]);

  const settings = useMemo<Partial<ProSettings>>(
    () => ({
      layout: "side",
      navTheme: "light",
      contentWidth: "Fluid",
      fixedHeader: true,
      fixSiderbar: true,
      colorPrimary: "#5B9FE8",
      splitMenus: false,
      siderMenuType: "sub"
    }),
    []
  );

  return (
    <div className="lumi-admin-v2">
      {messageHolder}
      <ProLayout
        {...settings}
        siderWidth={240}
        title="露米绘画AI"
        logo={<div className="lumi-admin-logo">露</div>}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        route={{ path: "/", routes: ADMIN_ROUTES }}
        location={{ pathname: location.pathname }}
        menuItemRender={(item, dom) => (
          <span onClick={() => item.path && !item.path.endsWith("-group") && navigate(item.path)}>{dom}</span>
        )}
        menuHeaderRender={undefined}
        actionsRender={() => [
          <Tag key="env" color={useMock ? "gold" : "green"}>{useMock ? "模拟数据" : "真实数据"}</Tag>
        ]}
        avatarProps={{
          src: undefined,
          icon: <Avatar className="lumi-admin-avatar">管</Avatar>,
          title: "超级管理员",
          render: (_, avatar) => (
            <Dropdown
              menu={{
                items: [
                  ...(MOCK_DATA_AVAILABLE ? [{
                    key: "mock",
                    icon: <SettingOutlined />,
                    label: useMock ? "切换到真实数据" : "切换到模拟数据",
                    onClick: () => setUseMock(!useMock)
                  }] : []),
                  {
                    type: "group",
                    label: "显示密度",
                    children: [
                      {
                        key: "density-comfortable",
                        icon: density === "comfortable" ? <CheckOutlined /> : <ColumnHeightOutlined />,
                        label: "舒适",
                        onClick: () => setDensity("comfortable")
                      },
                      {
                        key: "density-compact",
                        icon: density === "compact" ? <CheckOutlined /> : <ColumnHeightOutlined />,
                        label: "紧凑",
                        onClick: () => setDensity("compact")
                      }
                    ]
                  },
                  { type: "divider" },
                  {
                    key: "logout",
                    danger: true,
                    icon: <LogoutOutlined />,
                    label: "退出登录",
                    onClick: logout
                  }
                ]
              }}
            >
              {avatar}
            </Dropdown>
          )
        }}
      >
        <main className="lumi-admin-content">
          <div className="lumi-page-heading">
            <div>
              <Typography.Title level={3}>{title}</Typography.Title>
              <Typography.Text type="secondary">{description}</Typography.Text>
            </div>
            <Space />
          </div>
          <div className={`lumi-page-body lumi-page-${current.id}`}>
            <PageBoundary resetKey={`${current.id}:${current.param || ""}`}>
              {renderPage(current.id, current.param)}
            </PageBoundary>
          </div>
        </main>
      </ProLayout>

      <Drawer
        title={sheet.title}
        width="min(720px, 100vw)"
        open={sheet.open}
        onClose={closeSheet}
        footer={sheet.foot || undefined}
        destroyOnHidden
      >
        {sheet.body}
      </Drawer>
      <Modal
        title={dialog.title}
        open={dialog.open}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: dialog.danger }}
        onCancel={closeDialog}
        onOk={() => {
          dialog.onOk?.();
          closeDialog();
        }}
      >
        <Typography.Paragraph>{dialog.msg}</Typography.Paragraph>
      </Modal>
    </div>
  );
}

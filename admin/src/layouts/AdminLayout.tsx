import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Drawer, Button } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  PictureOutlined,
  SafetyOutlined,
  SettingOutlined,
  MoneyCollectOutlined,
  MessageOutlined,
  ToolOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'users', icon: <UserOutlined />, label: '用户管理' },
  { key: 'works', icon: <PictureOutlined />, label: '作品管理' },
  { key: 'moderation', icon: <SafetyOutlined />, label: '内容审核' },
  { key: 'operations', icon: <ToolOutlined />, label: '运营配置' },
  { key: 'finance', icon: <MoneyCollectOutlined />, label: '财务管理' },
  { key: 'messages', icon: <MessageOutlined />, label: '消息管理' },
  { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
];

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = location.pathname.split('/').pop() || 'dashboard';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(`/${key}`);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const menuContent = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={240}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 16 : 18,
            fontWeight: 700,
            letterSpacing: collapsed ? 0 : 1,
            transition: 'all 0.2s',
          }}>
            {collapsed ? 'L' : 'Lumi-Draw'}
          </div>
          {menuContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerOpen(false)}
          open={drawerOpen}
          width={240}
          styles={{ body: { padding: 0, background: '#001529' }, header: { display: 'none' } }}
          closable={false}
          zIndex={1000}
        >
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 1,
            background: '#001529',
          }}>
            Lumi-Draw
          </div>
          {menuContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 240), transition: 'margin-left 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: isMobile ? '0 12px' : '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 56,
          lineHeight: '56px',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined style={{ fontSize: 20 }} />}
                onClick={() => setDrawerOpen(true)}
                style={{ padding: 4 }}
              />
            )}
            <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>
              {menuItems.find(m => m.key === selectedKey)?.label || '仪表盘'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#999' }}>Admin</span>
        </Header>
        <Content style={{
          margin: isMobile ? 12 : 24,
          padding: isMobile ? 12 : 24,
          background: '#fff',
          borderRadius: 8,
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

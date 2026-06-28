import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  PictureOutlined,
  SafetyOutlined,
  SettingOutlined,
  MoneyCollectOutlined,
  MessageOutlined,
  ToolOutlined,
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
  const navigate = useNavigate();
  const location = useLocation();
  const selectedKey = location.pathname.split('/').pop() || 'dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: collapsed ? 16 : 18, fontWeight: 700 }}>
          {collapsed ? 'L' : 'Lumi-Draw'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/${key}`)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {menuItems.find(m => m.key === selectedKey)?.label || '仪表盘'}
          </span>
          <span style={{ fontSize: 13, color: '#999' }}>Admin</span>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

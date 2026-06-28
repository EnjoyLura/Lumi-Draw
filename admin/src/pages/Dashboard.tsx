import React from 'react';
import { Card, Table, Tag, Badge, Row, Col } from 'antd';
import {
  UserOutlined, UserAddOutlined, PictureOutlined, ThunderboltOutlined,
  MoneyCollectOutlined, WalletOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';

const statCards = [
  { icon: <UserOutlined />, color: '#5B9FE8', bg: 'rgba(91,159,232,0.12)', value: '12,856', label: '总用户数', trend: '+8.3%', trendUp: true },
  { icon: <UserAddOutlined />, color: '#4ECBA0', bg: 'rgba(78,203,160,0.12)', value: '238', label: '今日新增', trend: '+12.5%', trendUp: true },
  { icon: <PictureOutlined />, color: '#8B6FC0', bg: 'rgba(139,111,192,0.12)', value: '86,432', label: '总作品数', trend: '+15.2%', trendUp: true },
  { icon: <ThunderboltOutlined />, color: '#F0A060', bg: 'rgba(240,160,96,0.12)', value: '1,420', label: '今日生成', trend: '-3.1%', trendUp: false },
  { icon: <MoneyCollectOutlined />, color: '#E85B7A', bg: 'rgba(232,91,122,0.12)', value: '¥328,560', label: '总收入', trend: '+22.8%', trendUp: true },
  { icon: <WalletOutlined />, color: '#D4A520', bg: 'rgba(212,165,32,0.12)', value: '¥4,680', label: '今日收入', trend: '+5.6%', trendUp: true },
];

const compareData = [
  { label: '新增用户', today: 238, diff: '+26', yesterday: 212, up: true },
  { label: '生成作品', today: 1420, diff: '-46', yesterday: 1466, up: false },
  { label: '充值收入', today: '¥4,680', diff: '+¥520', yesterday: '¥4,160', up: true },
  { label: '活跃用户', today: 3260, diff: '+180', yesterday: 3080, up: true },
];

const recentUsers = [
  { name: '云端造梦师', avatar: '梦', color: '#5B9FE8', time: '2小时前', status: '正常' },
  { name: '星辰大海', avatar: '星', color: '#4ECBA0', time: '5小时前', status: '正常' },
  { name: '月光如水', avatar: '月', color: '#F0A060', time: '8小时前', status: '正常' },
  { name: '风之绘师', avatar: '风', color: '#8B6FC0', time: '1天前', status: '正常' },
  { name: '光影魔术', avatar: '光', color: '#D4A520', time: '1天前', status: '正常' },
];

const pendingWorks = [
  { img: 'https://picsum.photos/seed/w13/80/80', title: '花园里的可爱机器人', author: '云端造梦师', time: '30分钟前' },
  { img: 'https://picsum.photos/seed/w14/80/80', title: '发光蘑菇的魔法森林', author: '云端造梦师', time: '1小时前' },
  { img: 'https://picsum.photos/seed/w15/80/80', title: '星空下的灯塔', author: '云端造梦师', time: '2小时前' },
];

const Dashboard: React.FC = () => {
  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((s, i) => (
          <Col xs={12} sm={8} md={4} key={i}>
            <Card hoverable style={{ borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: s.color, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#9CA3B8', marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: s.trendUp ? '#4ECBA0' : '#E85B7A', display: 'flex', alignItems: 'center', gap: 2 }}>
                    {s.trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{s.trend}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 今日 vs 昨日 */}
      <Card style={{ marginBottom: 16, borderRadius: 12 }} title="今日 vs 昨日">
        <Row gutter={[12, 12]}>
          {compareData.map((c, i) => (
            <Col xs={12} sm={6} key={i}>
              <div style={{ padding: 12, background: '#F5F7FA', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#9CA3B8', marginBottom: 4 }}>{c.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{c.today}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.up ? '#4ECBA0' : '#E85B7A' }}>{c.diff}</span>
                </div>
                <div style={{ fontSize: 11, color: '#9CA3B8', marginTop: 2 }}>昨日 {c.yesterday}</div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 最近注册 + 待审核 */}
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 12, marginBottom: 16 }} title="最近注册用户" extra={<a>查看全部</a>}>
            <Table
              dataSource={recentUsers}
              rowKey="name"
              pagination={false}
              size="small"
              columns={[
                { title: '用户', dataIndex: 'name', render: (name: string, r: any) => (
                  <span><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: r.color, color: '#fff', fontSize: 11, fontWeight: 700, marginRight: 8, verticalAlign: 'middle' }}>{r.avatar}</span>{name}</span>
                )},
                { title: '注册时间', dataIndex: 'time' },
                { title: '状态', dataIndex: 'status', render: (s: string) => <Badge status="success" text={s} /> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 12, marginBottom: 16 }} title="待审核作品" extra={<a>查看全部</a>}>
            <Table
              dataSource={pendingWorks}
              rowKey="title"
              pagination={false}
              size="small"
              columns={[
                { title: '作品', dataIndex: 'title', render: (title: string, r: any) => (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img src={r.img} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />{title}</span>
                )},
                { title: '作者', dataIndex: 'author' },
                { title: '提交时间', dataIndex: 'time' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

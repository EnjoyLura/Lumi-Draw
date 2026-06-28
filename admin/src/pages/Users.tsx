import React, { useState } from 'react';
import { Card, Table, Tag, Input, Select, Button, Space, Row, Col, Badge, Modal, message } from 'antd';
import { SearchOutlined, DownloadOutlined, CrownOutlined, CalendarOutlined, CheckCircleOutlined, TrophyOutlined, EyeOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';

const mockUsers = [
  { id: 1, name: '云端造梦师', avatar: '梦', color: '#5B9FE8', works: 48, credits: 2860, recharged: 680, member: '季卡', regTime: '2025-01-15', status: 'active' },
  { id: 2, name: '星辰大海', avatar: '星', color: '#4ECBA0', works: 36, credits: 1580, recharged: 318, member: '月卡', regTime: '2025-02-20', status: 'active' },
  { id: 3, name: '月光如水', avatar: '月', color: '#F0A060', works: 52, credits: 3200, recharged: 896, member: '年卡', regTime: '2025-01-08', status: 'active' },
  { id: 4, name: '风之绘师', avatar: '风', color: '#8B6FC0', works: 29, credits: 890, recharged: 128, member: '', regTime: '2025-03-12', status: 'active' },
  { id: 5, name: '光影魔术', avatar: '光', color: '#D4A520', works: 41, credits: 1950, recharged: 456, member: '季卡', regTime: '2025-02-05', status: 'active' },
  { id: 6, name: '违规用户A', avatar: 'X', color: '#999', works: 3, credits: 0, recharged: 0, member: '', regTime: '2025-04-01', status: 'banned' },
  { id: 7, name: '小白画家', avatar: '白', color: '#E85B7A', works: 5, credits: 120, recharged: 18, member: '', regTime: '2025-05-10', status: 'active' },
  { id: 8, name: 'AI探索者', avatar: '探', color: '#5B9FE8', works: 18, credits: 640, recharged: 198, member: '月卡', regTime: '2025-04-22', status: 'active' },
];

const memberStats = [
  { icon: <CrownOutlined />, color: '#5B9FE8', bg: 'rgba(91,159,232,0.12)', value: '1,286', label: '会员总数' },
  { icon: <CalendarOutlined />, color: '#5B9FE8', bg: 'rgba(91,159,232,0.12)', value: '486', label: '月卡' },
  { icon: <CheckCircleOutlined />, color: '#8B6FC0', bg: 'rgba(139,111,192,0.12)', value: '528', label: '季卡' },
  { icon: <TrophyOutlined />, color: '#F0A060', bg: 'rgba(240,160,96,0.12)', value: '272', label: '年卡' },
];

const memberTagMap: Record<string, { color: string; label: string }> = {
  '月卡': { color: 'blue', label: '月卡' },
  '季卡': { color: 'purple', label: '季卡' },
  '年卡': { color: 'orange', label: '年卡' },
};

const Users: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = mockUsers.filter(u => {
    if (searchText && !u.name.includes(searchText) && !String(u.id).includes(searchText)) return false;
    if (statusFilter === 'active' && u.status !== 'active') return false;
    if (statusFilter === 'banned' && u.status !== 'banned') return false;
    return true;
  });

  const columns = [
    {
      title: '用户', dataIndex: 'name', render: (name: string, r: any) => (
        <span><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: r.color, color: '#fff', fontSize: 11, fontWeight: 700, marginRight: 8, verticalAlign: 'middle' }}>{r.avatar}</span>{name}</span>
      ),
    },
    { title: 'ID', dataIndex: 'id', render: (id: number) => <span style={{ color: '#9CA3B8' }}>LUMI{id}</span>, sorter: (a: any, b: any) => a.id - b.id },
    { title: '作品', dataIndex: 'works', sorter: (a: any, b: any) => a.works - b.works },
    { title: '积分', dataIndex: 'credits', sorter: (a: any, b: any) => a.credits - b.credits },
    { title: '充值(元)', dataIndex: 'recharged', render: (v: number) => v > 0 ? <span style={{ color: '#4ECBA0', fontWeight: 600 }}>¥{v}</span> : <span style={{ color: '#9CA3B8' }}>—</span>, sorter: (a: any, b: any) => a.recharged - b.recharged },
    { title: '会员', dataIndex: 'member', render: (m: string) => m ? <Tag color={memberTagMap[m]?.color}>{memberTagMap[m]?.label}</Tag> : <span style={{ color: '#9CA3B8' }}>—</span> },
    { title: '注册时间', dataIndex: 'regTime', sorter: (a: any, b: any) => a.regTime.localeCompare(b.regTime) },
    {
      title: '状态', dataIndex: 'status', render: (s: string) => s === 'active'
        ? <Badge status="success" text="正常" />
        : <Badge status="error" text="封禁" />,
    },
    {
      title: '操作', render: (_: any, r: any) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => message.info(`查看用户 ${r.name}`)} />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => message.info(`积分调整 ${r.name}`)} />
          {r.status === 'active'
            ? <Button type="text" size="small" danger icon={<StopOutlined />} onClick={() => message.warning(`已封禁 ${r.name}`)} />
            : <Button type="text" size="small" icon={<CheckCircleOutlined />} onClick={() => message.success(`已解封 ${r.name}`)} />
          }
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 搜索栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Space>
          <Input placeholder="搜索用户名/ID..." prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ maxWidth: 240 }} allowClear />
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }} options={[{ value: 'all', label: '全部状态' }, { value: 'active', label: '正常' }, { value: 'banned', label: '封禁' }]} />
        </Space>
        <Space>
          <span style={{ fontSize: 13, color: '#9CA3B8' }}>共 {filteredUsers.length} 位用户</span>
          <Button type="text" icon={<DownloadOutlined />} onClick={() => message.success('用户数据已导出')}>导出</Button>
        </Space>
      </div>

      {/* 会员统计 */}
      <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
        {memberStats.map((s, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: '12px 16px' } }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: s.color }}>{s.icon}</div>
                <div><div style={{ fontSize: 18, fontWeight: 700 }}>{s.value}</div><div style={{ fontSize: 11, color: '#9CA3B8' }}>{s.label}</div></div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 用户表格 */}
      <Card style={{ borderRadius: 12 }}>
        <Table dataSource={filteredUsers} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 5, showSizeChanger: true, pageSizeOptions: ['5', '10', '20'] }} />
      </Card>
    </div>
  );
};

export default Users;

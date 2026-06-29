import React, { useState } from 'react';
import { Card, Table, Tag, Badge, Button, Space, message } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';

const reports = [
  { id: 1, reporter: '光影魔术', content: '作品「违规图片」', reason: '色情低俗', time: '1小时前', status: 'pending' },
  { id: 2, reporter: '星辰大海', content: '作品「广告推销」', reason: '垃圾广告', time: '3小时前', status: 'pending' },
  { id: 3, reporter: '月光如水', content: '用户「违规用户A」', reason: '侵权盗版', time: '5小时前', status: 'pending' },
  { id: 4, reporter: '风之绘师', content: '作品「抄袭作品」', reason: '侵权盗版', time: '1天前', status: 'handled' },
  { id: 5, reporter: '云端造梦师', content: '评论内容', reason: '煽动仇恨', time: '2天前', status: 'handled' },
];

const pendingWorks = [
  { id: 1004, img: 'https://picsum.photos/seed/w13/80/80', title: '花园里的可爱机器人', author: '云端造梦师', model: 'GPT Image 2', time: '30分钟前' },
  { id: 1005, img: 'https://picsum.photos/seed/w14/80/80', title: '发光蘑菇的魔法森林', author: '云端造梦师', model: 'Nano Banana 2', time: '1小时前' },
  { id: 1006, img: 'https://picsum.photos/seed/w15/80/80', title: '星空下的灯塔', author: '云端造梦师', model: 'Flux Pro', time: '2小时前' },
];

const reasonColors: Record<string, string> = {
  '色情低俗': 'red', '垃圾广告': 'orange', '侵权盗版': 'purple',
  '煽动仇恨': 'red', '虚假信息': 'gold', '违法违规': 'red', '其他原因': 'default',
};

const tabs = [
  { key: 'reports', label: '举报管理' },
  { key: 'queue', label: '审核队列' },
];

const Moderation: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reports');

  const reportColumns = [
    { title: '举报人', dataIndex: 'reporter', width: 120 },
    { title: '举报内容', dataIndex: 'content' },
    { title: '原因', dataIndex: 'reason', render: (r: string) => <Tag color={reasonColors[r]}>{r}</Tag>, width: 110 },
    { title: '时间', dataIndex: 'time', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => s === 'pending' ? <Badge status="warning" text="待处理" /> : <Badge status="success" text="已处理" />,
    },
    {
      title: '操作', width: 140,
      render: (_: any, r: any) => r.status === 'pending' ? (
        <Space size={4}>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => message.success('已处理')}>处理</Button>
          <Button size="small" icon={<CloseOutlined />} onClick={() => message.info('已忽略')}>忽略</Button>
        </Space>
      ) : <Tag>已处理</Tag>,
    },
  ];

  const queueColumns = [
    {
      title: '作品', dataIndex: 'title',
      render: (title: string, r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={r.img} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
          <span>{title}</span>
        </div>
      ),
    },
    { title: '作者', dataIndex: 'author', width: 120 },
    { title: '模型', dataIndex: 'model', render: (m: string) => <Tag color="blue">{m}</Tag>, width: 140 },
    { title: '提交时间', dataIndex: 'time', width: 120 },
    {
      title: '操作', width: 160,
      render: () => (
        <Space size={4}>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => message.success('已通过审核')}>通过</Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => message.warning('已拒绝')}>拒绝</Button>
          <Button size="small" type="text" icon={<EyeOutlined />} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F7FA', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: activeTab === t.key ? 600 : 500,
            color: activeTab === t.key ? '#4A85C8' : '#5A6175',
            background: activeTab === t.key ? '#fff' : 'transparent',
            boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{t.label}</div>
        ))}
      </div>

      <Card style={{ borderRadius: 12 }}>
        {activeTab === 'reports' ? (
          <Table dataSource={reports} columns={reportColumns} rowKey="id" size="small" pagination={{ pageSize: 5 }} />
        ) : (
          <Table dataSource={pendingWorks} columns={queueColumns} rowKey="id" size="small" pagination={false} />
        )}
      </Card>
    </div>
  );
};

export default Moderation;

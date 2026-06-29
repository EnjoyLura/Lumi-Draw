import React, { useState } from 'react';
import { Card, Table, Tag, Badge, Button, Switch, Space, Modal, Input, Select, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';

const notifications = [
  { id: 4001, title: '夏日创作季活动', scope: '全部用户', status: 'published', popup: true, time: '2025-06-25 10:00' },
  { id: 4002, title: '新模型上线', scope: '全部用户', status: 'published', popup: false, time: '2025-06-20 09:00' },
  { id: 4003, title: '积分充值优惠', scope: '活跃用户', status: 'published', popup: false, time: '2025-06-15 14:00' },
  { id: 4004, title: '七月活动预告', scope: '全部用户', status: 'scheduled', popup: false, time: '' },
  { id: 4005, title: '系统维护通知', scope: '全部用户', status: 'draft', popup: false, time: '' },
];

const feedbacks = [
  { id: 2001, user: '云端造梦师', type: '功能建议', content: '建议增加批量下载功能', time: '2小时前', status: 'pending' },
  { id: 2002, user: '星辰大海', type: 'Bug反馈', content: '生成速度偏慢，希望优化', time: '5小时前', status: 'pending' },
  { id: 2003, user: '月光如水', type: '功能建议', content: '新风格很好看，希望多出一些', time: '1天前', status: 'adopted' },
  { id: 2004, user: '风之绘师', type: '体验问题', content: '移动端页面偶尔卡顿', time: '1天前', status: 'done' },
  { id: 2005, user: '光影魔术', type: '功能建议', content: '希望增加AI自动配色功能', time: '2天前', status: 'ignored' },
  { id: 2006, user: '小白画家', type: 'Bug反馈', content: '上传图片偶尔失败', time: '3天前', status: 'done' },
];

const statusMap: Record<string, { color: string; text: string }> = {
  published: { color: 'success', text: '已发布' },
  scheduled: { color: 'warning', text: '定时发布' },
  draft: { color: 'default', text: '草稿' },
};

const fbStatusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'warning', text: '待处理' },
  adopted: { color: 'processing', text: '已采纳' },
  done: { color: 'success', text: '已完成' },
  ignored: { color: 'default', text: '已忽略' },
};

const fbTypeColor: Record<string, string> = {
  'Bug反馈': 'red', '功能建议': 'blue', '体验问题': 'orange',
};

const Messages: React.FC = () => {
  const [activeTab, setActiveTab] = useState('notifications');
  const [modalOpen, setModalOpen] = useState(false);

  const notifColumns = [
    { title: '标题', dataIndex: 'title', render: (t: string) => <span style={{ fontWeight: 600 }}>{t}</span> },
    { title: '推送范围', dataIndex: 'scope', render: (s: string) => <Tag>{s}</Tag>, width: 110 },
    {
      title: '状态', dataIndex: 'status', width: 110,
      render: (s: string) => <Badge status={statusMap[s]?.color as any} text={statusMap[s]?.text} />,
    },
    { title: '弹窗', dataIndex: 'popup', render: (v: boolean) => <Switch checked={v} size="small" disabled />, width: 70 },
    { title: '时间', dataIndex: 'time', width: 150, render: (t: string) => t || <span style={{ color: '#9CA3B8' }}>—</span> },
    {
      title: '操作', width: 120,
      render: () => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setModalOpen(true); }} />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => message.warning('已删除')} />
        </Space>
      ),
    },
  ];

  const fbColumns = [
    { title: '用户', dataIndex: 'user', width: 120 },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag color={fbTypeColor[t]}>{t}</Tag>, width: 100 },
    {
      title: '描述', dataIndex: 'content',
      render: (c: string) => <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c}</span>,
    },
    { title: '时间', dataIndex: 'time', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Badge status={fbStatusMap[s]?.color as any} text={fbStatusMap[s]?.text} />,
    },
    {
      title: '操作', width: 160,
      render: (_: any, r: any) => r.status === 'pending' ? (
        <Space size={4}>
          <Button size="small" icon={<CheckOutlined />} onClick={() => message.success('已采纳')}>采纳</Button>
          <Button size="small" icon={<CloseOutlined />} onClick={() => message.info('已忽略')}>忽略</Button>
        </Space>
      ) : <Tag>{fbStatusMap[r.status]?.text}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F7FA', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {[{ key: 'notifications', label: '公告管理' }, { key: 'feedback', label: '用户反馈' }].map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: activeTab === t.key ? 600 : 500,
            color: activeTab === t.key ? '#4A85C8' : '#5A6175',
            background: activeTab === t.key ? '#fff' : 'transparent',
            boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{t.label}</div>
        ))}
      </div>

      {activeTab === 'notifications' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>发布公告</Button>
          </div>
          <Card style={{ borderRadius: 12 }}>
            <Table dataSource={notifications} columns={notifColumns} rowKey="id" size="small" pagination={false} />
          </Card>
        </div>
      )}

      {activeTab === 'feedback' && (
        <Card style={{ borderRadius: 12 }}>
          <Table dataSource={feedbacks} columns={fbColumns} rowKey="id" size="small" pagination={{ pageSize: 5 }} />
        </Card>
      )}

      {/* 公告编辑 Modal */}
      <Modal title="发布/编辑公告" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => { setModalOpen(false); message.success('公告已保存'); }} okText="保存" cancelText="取消" width={560}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="公告标题"><Input placeholder="例如: 夏日创作季活动" /></Form.Item>
          <Form.Item label="公告内容"><Input.TextArea placeholder="请输入公告正文..." rows={3} /></Form.Item>
          <Form.Item label="封面图"><div style={{ width: '100%', height: 80, border: '1.5px dashed #D0D5DD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F5F7FA', color: '#9CA3B8' }}>上传公告封面图</div></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="按钮文案"><Input placeholder="例如: 立即参与" /></Form.Item>
            <Form.Item label="跳转页面"><Select defaultValue="创作页" options={[{ value: '创作页', label: '创作页' }, { value: '充值页', label: '充值页' }, { value: '会员中心', label: '会员中心' }, { value: '广场', label: '广场' }, { value: '无跳转', label: '无跳转' }]} /></Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item label="推送范围"><Select defaultValue="全部用户" options={[{ value: '全部用户', label: '全部用户' }, { value: '会员用户', label: '会员用户' }, { value: '活跃用户', label: '活跃用户（7天内）' }]} /></Form.Item>
            <Form.Item label="弹窗展示"><div style={{ paddingTop: 6 }}><Switch /></div></Form.Item>
          </div>
          <Form.Item label="发布方式">
            <Select defaultValue="published" options={[{ value: 'published', label: '立即发布' }, { value: 'scheduled', label: '定时发布' }, { value: 'draft', label: '保存草稿' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Messages;

import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Row, Col, Input, Select, InputNumber, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, SaveOutlined, FireOutlined } from '@ant-design/icons';

const rechargeTiers = [
  { id: 1, price: 6, credits: 60, bonus: 0, popular: false },
  { id: 2, price: 18, credits: 180, bonus: 10, popular: false },
  { id: 3, price: 30, credits: 300, bonus: 30, popular: false },
  { id: 4, price: 68, credits: 680, bonus: 100, popular: true },
  { id: 5, price: 128, credits: 1280, bonus: 280, popular: false },
];

const memberPlans = [
  { id: 1, name: '月卡', price: 18, benefits: '每日签到双倍积分、专属风格解锁' },
  { id: 2, name: '季卡', price: 48, benefits: '月卡权益 + 每月赠100积分' },
  { id: 3, name: '年卡', price: 168, benefits: '季卡权益 + 专属模型 + 4K画质' },
];

const milestones = [
  { id: 1, days: 3, reward: 20 },
  { id: 2, days: 7, reward: 50 },
  { id: 3, days: 14, reward: 100 },
  { id: 4, days: 30, reward: 300 },
];

const transactions = [
  { id: 3001, user: '云端造梦师', type: '收入', channel: '充值', amount: '+680', money: '¥68', time: '06-18 14:30' },
  { id: 3002, user: '星辰大海', type: '支出', channel: '创作', amount: '-15', money: '', time: '06-18 16:20' },
  { id: 3003, user: '月光如水', type: '收入', channel: '充值', amount: '+180', money: '¥18', time: '06-17 20:15' },
  { id: 3004, user: '风之绘师', type: '支出', channel: '创作', amount: '-8', money: '', time: '06-17 15:30' },
  { id: 3005, user: '光影魔术', type: '收入', channel: '充值', amount: '+1280', money: '¥128', time: '06-16 09:40' },
  { id: 3006, user: '云端造梦师', type: '支出', channel: '创作', amount: '-20', money: '', time: '06-15 14:30' },
  { id: 3007, user: '云端造梦师', type: '收入', channel: '签到', amount: '+10', money: '', time: '06-15 09:12' },
  { id: 3008, user: '星辰大海', type: '收入', channel: '会员每日积分', amount: '+5', money: '', time: '06-15 00:00' },
  { id: 3009, user: '月光如水', type: '支出', channel: '反推提示词', amount: '-5', money: '', time: '06-14 18:40' },
  { id: 3010, user: '风之绘师', type: '收入', channel: '签到', amount: '+10', money: '', time: '06-14 08:55' },
];

const tabs = [
  { key: 'recharge', label: '充值方案' },
  { key: 'member', label: '会员方案' },
  { key: 'checkin', label: '签到配置' },
  { key: 'invite', label: '邀请奖励' },
  { key: 'transactions', label: '交易记录' },
];

const Finance: React.FC = () => {
  const [activeTab, setActiveTab] = useState('recharge');
  const [txSearch, setTxSearch] = useState('');
  const [txType, setTxType] = useState('all');

  const filteredTx = transactions.filter(t => {
    if (txSearch && !t.user.includes(txSearch)) return false;
    if (txType !== 'all' && t.type !== txType) return false;
    return true;
  });

  const txColumns = [
    { title: '用户', dataIndex: 'user' },
    { title: '类型', dataIndex: 'type', render: (t: string) => <Tag color={t === '收入' ? 'green' : 'red'}>{t}</Tag>, width: 80 },
    { title: '渠道', dataIndex: 'channel', width: 120 },
    { title: '积分变动', dataIndex: 'amount', render: (a: string) => <span style={{ fontWeight: 600, color: a.startsWith('+') ? '#4ECBA0' : '#E85B7A' }}>{a}</span>, width: 100 },
    { title: '金额', dataIndex: 'money', render: (m: string) => m || <span style={{ color: '#9CA3B8' }}>—</span>, width: 80 },
    { title: '时间', dataIndex: 'time', width: 120 },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F7FA', borderRadius: 8, padding: 3, width: 'fit-content', flexWrap: 'wrap' } as any}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: activeTab === t.key ? 600 : 500,
            color: activeTab === t.key ? '#4A85C8' : '#5A6175', whiteSpace: 'nowrap',
            background: activeTab === t.key ? '#fff' : 'transparent',
            boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{t.label}</div>
        ))}
      </div>

      {/* 充值方案 */}
      {activeTab === 'recharge' && (
        <div>
          <div style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />}>新增方案</Button></div>
          <Row gutter={[12, 12]}>
            {rechargeTiers.map(t => (
              <Col xs={12} sm={8} key={t.id}>
                <Card hoverable style={{ borderRadius: 12, textAlign: 'center', position: 'relative', overflow: 'hidden' }}
                  styles={{ body: { padding: '20px 16px' } }}>
                  {t.popular && <div style={{ position: 'absolute', top: 0, right: 0, background: '#5B9FE8', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: '0 0 0 10px' }}>热门</div>}
                  <div style={{ fontSize: 24, fontWeight: 700 }}>¥{t.price}</div>
                  <div style={{ fontSize: 14, color: '#5A6175', margin: '8px 0' }}>{t.credits} 积分</div>
                  {t.bonus > 0 && <Tag color="green">+{t.bonus} 赠送</Tag>}
                  <div style={{ marginTop: 12 }}><Button size="small" icon={<EditOutlined />}>编辑</Button></div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* 会员方案 */}
      {activeTab === 'member' && (
        <div>
          <div style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />}>新增方案</Button></div>
          <Row gutter={[12, 12]}>
            {memberPlans.map(p => (
              <Col xs={24} sm={8} key={p.id}>
                <Card hoverable style={{ borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#5B9FE8' }}>¥{p.price}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#5A6175', marginBottom: 12 }}>{p.benefits}</div>
                  <Button size="small" icon={<EditOutlined />}>编辑</Button>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* 签到配置 */}
      {activeTab === 'checkin' && (
        <div>
          <div style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />}>新增里程碑</Button></div>
          <Card style={{ borderRadius: 12 }}>
            <Table dataSource={milestones} rowKey="id" size="small" pagination={false}
              columns={[
                { title: '连续天数', dataIndex: 'days', render: (d: number) => <span style={{ fontWeight: 600 }}>{d} 天</span> },
                { title: '奖励积分', dataIndex: 'reward', render: (r: number) => <span style={{ color: '#4ECBA0', fontWeight: 600 }}>+{r}</span> },
                { title: '操作', render: () => <Button size="small" icon={<EditOutlined />}>编辑</Button>, width: 100 },
              ]} />
          </Card>
        </div>
      )}

      {/* 邀请奖励 */}
      {activeTab === 'invite' && (
        <Card style={{ borderRadius: 12, maxWidth: 500 }}>
          <Form layout="vertical">
            <Form.Item label="邀请者奖励（积分）"><InputNumber defaultValue={50} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="被邀请者奖励（积分）"><InputNumber defaultValue={30} style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="最大邀请人数"><InputNumber defaultValue={50} style={{ width: '100%' }} /></Form.Item>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('邀请奖励配置已保存')}>保存</Button>
          </Form>
        </Card>
      )}

      {/* 交易记录 */}
      {activeTab === 'transactions' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input placeholder="搜索用户..." value={txSearch} onChange={e => setTxSearch(e.target.value)} style={{ maxWidth: 200 }} allowClear />
            <Select value={txType} onChange={setTxType} style={{ width: 120 }}
              options={[{ value: 'all', label: '全部类型' }, { value: '收入', label: '收入' }, { value: '支出', label: '支出' }]} />
          </div>
          <Card style={{ borderRadius: 12 }}>
            <Table dataSource={filteredTx} columns={txColumns} rowKey="id" size="small" pagination={{ pageSize: 5 }} />
          </Card>
        </div>
      )}
    </div>
  );
};

export default Finance;

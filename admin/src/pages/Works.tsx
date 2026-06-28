import React, { useState } from 'react';
import { Card, Table, Tag, Input, Select, Button, Space, Badge, Checkbox, message } from 'antd';
import { SearchOutlined, CheckOutlined, StarOutlined, StopOutlined, EyeOutlined } from '@ant-design/icons';

const mockWorks = [
  { id: 1001, img: 'https://picsum.photos/seed/w1/80/80', title: '霓虹都市', author: '星辰大海', model: 'GPT Image 2', style: '赛博朋克', resolution: '2K', likes: 328, status: 'published', time: '2小时前' },
  { id: 1002, img: 'https://picsum.photos/seed/w2/80/80', title: '山水之间', author: '月光如水', model: 'Flux Pro', style: '国风', resolution: '4K', likes: 512, status: 'published', time: '3小时前' },
  { id: 1003, img: 'https://picsum.photos/seed/w3/80/80', title: '少女与猫', author: '云端造梦师', model: 'Nano Banana 2', style: '二次元', resolution: '1K', likes: 680, status: 'published', time: '5小时前' },
  { id: 1004, img: 'https://picsum.photos/seed/w13/80/80', title: '花园里的可爱机器人', author: '云端造梦师', model: 'GPT Image 2', style: '梦幻', resolution: '2K', likes: 0, status: 'pending', time: '30分钟前' },
  { id: 1005, img: 'https://picsum.photos/seed/w14/80/80', title: '发光蘑菇的魔法森林', author: '云端造梦师', model: 'Nano Banana 2', style: '梦幻', resolution: '1K', likes: 0, status: 'pending', time: '1小时前' },
  { id: 1006, img: 'https://picsum.photos/seed/w15/80/80', title: '星空下的灯塔', author: '云端造梦师', model: 'Flux Pro', style: '写实', resolution: '4K', likes: 0, status: 'pending', time: '2小时前' },
  { id: 1007, img: 'https://picsum.photos/seed/w5/80/80', title: '古风少女', author: '云端造梦师', model: 'Midjourney', style: '国风', resolution: '2K', likes: 892, status: 'published', time: '8小时前' },
  { id: 1008, img: 'https://picsum.photos/seed/w9/80/80', title: '暗黑天使', author: '星辰大海', model: 'Midjourney', style: '暗黑', resolution: '4K', likes: 723, status: 'published', time: '1天前' },
  { id: 1009, img: 'https://picsum.photos/seed/w10/80/80', title: '蒸汽城市', author: '月光如水', model: 'GPT Image 2', style: '蒸汽波', resolution: '2K', likes: 356, status: 'removed', time: '2天前' },
];

const statusMap: Record<string, { color: string; text: string }> = {
  published: { color: 'success', text: '已发布' },
  pending: { color: 'warning', text: '待审核' },
  removed: { color: 'default', text: '已下架' },
};

const resTagColor: Record<string, string> = { '1K': 'orange', '2K': 'blue', '4K': 'purple' };

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核 (3)' },
  { key: 'published', label: '已发布' },
  { key: 'removed', label: '已下架' },
];

const Works: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [styleFilter, setStyleFilter] = useState('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const filteredWorks = mockWorks.filter(w => {
    if (activeTab !== 'all' && w.status !== activeTab) return false;
    if (searchText && !w.title.includes(searchText)) return false;
    if (modelFilter !== 'all' && w.model !== modelFilter) return false;
    if (styleFilter !== 'all' && w.style !== styleFilter) return false;
    return true;
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', render: (id: number) => <span style={{ color: '#9CA3B8', fontSize: 12 }}>#{id}</span>, sorter: (a: any, b: any) => a.id - b.id, width: 80 },
    {
      title: '作品', dataIndex: 'title', render: (title: string, r: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={r.img} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
          <span>{title}</span>
        </div>
      ),
    },
    { title: '作者', dataIndex: 'author', width: 120 },
    { title: '模型', dataIndex: 'model', render: (m: string) => <Tag color="blue">{m}</Tag>, width: 140 },
    { title: '风格', dataIndex: 'style', width: 90 },
    { title: '分辨率', dataIndex: 'resolution', render: (r: string) => <Tag color={resTagColor[r]}>{r}</Tag>, width: 90 },
    { title: '点赞', dataIndex: 'likes', sorter: (a: any, b: any) => a.likes - b.likes, align: 'right' as const, width: 80 },
    {
      title: '状态', dataIndex: 'status', render: (s: string) => <Badge status={statusMap[s]?.color as any} text={statusMap[s]?.text} />, width: 90,
    },
    { title: '时间', dataIndex: 'time', width: 100 },
    {
      title: '操作', render: (_: any, r: any) => {
        if (r.status === 'pending') return (
          <Space size={4}>
            <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => message.success('已通过')} style={{ color: '#5B9FE8' }} />
            <Button type="text" size="small" danger icon={<StopOutlined />} onClick={() => message.warning('已拒绝')} />
          </Space>
        );
        if (r.status === 'published') return (
          <Space size={4}>
            <Button type="text" size="small" icon={<StarOutlined />} onClick={() => message.success('已精选')} style={{ color: '#D4A520' }} />
            <Button type="text" size="small" danger icon={<StopOutlined />} onClick={() => message.warning('已下架')} />
          </Space>
        );
        return <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => message.success('已恢复')}>恢复</Button>;
      }, width: 100,
    },
  ];

  return (
    <div>
      {/* Tab切换 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F7FA', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {tabs.map(t => (
          <div
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSelectedRowKeys([]); }}
            style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: activeTab === t.key ? 600 : 500,
              color: activeTab === t.key ? '#4A85C8' : '#5A6175',
              background: activeTab === t.key ? '#fff' : 'transparent',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >{t.label}</div>
        ))}
      </div>

      {/* 搜索栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input placeholder="搜索作品标题..." prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} style={{ maxWidth: 200 }} allowClear />
        <Select value={modelFilter} onChange={setModelFilter} style={{ width: 140 }} options={[{ value: 'all', label: '全部模型' }, { value: 'GPT Image 2', label: 'GPT Image 2' }, { value: 'Nano Banana 2', label: 'Nano Banana 2' }, { value: 'Flux Pro', label: 'Flux Pro' }, { value: 'SDXL', label: 'SDXL' }, { value: 'DALL-E 3', label: 'DALL-E 3' }, { value: 'Midjourney', label: 'Midjourney' }]} />
        <Select value={styleFilter} onChange={setStyleFilter} style={{ width: 120 }} options={[{ value: 'all', label: '全部风格' }, { value: '赛博朋克', label: '赛博朋克' }, { value: '国风', label: '国风' }, { value: '二次元', label: '二次元' }, { value: '写实', label: '写实' }, { value: '水彩', label: '水彩' }]} />
      </div>

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ padding: '10px 16px', background: 'rgba(91,159,232,0.12)', borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#4A85C8' }}>已选 {selectedRowKeys.length} 项</span>
          <div style={{ flex: 1 }} />
          <Button size="small" icon={<CheckOutlined />} onClick={() => message.success('已批量通过')}>批量通过</Button>
          <Button size="small" type="primary" icon={<StarOutlined />} onClick={() => message.success('已批量精选')}>批量精选</Button>
          <Button size="small" danger icon={<StopOutlined />} onClick={() => message.warning('已批量下架')}>批量下架</Button>
          <Button size="small" type="text" onClick={() => setSelectedRowKeys([])}>取消</Button>
        </div>
      )}

      {/* 作品表格 */}
      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={filteredWorks}
          columns={columns}
          rowKey="id"
          size="small"
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          pagination={{ pageSize: 5, showSizeChanger: true, pageSizeOptions: ['5', '10', '20'] }}
        />
      </Card>
    </div>
  );
};

export default Works;

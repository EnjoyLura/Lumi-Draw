import React, { useState } from 'react';
import { Card, Table, Tag, Switch, Button, Space, Modal, Input, InputNumber, Form, Row, Col, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FireOutlined } from '@ant-design/icons';

const bannersData = [
  { id: 1, img: 'https://picsum.photos/seed/b1/400/160', title: '夏日创作季', url: '/summer', enabled: true },
  { id: 2, img: 'https://picsum.photos/seed/b2/400/160', title: '新模型上线', url: '/models', enabled: true },
  { id: 3, img: 'https://picsum.photos/seed/b3/400/160', title: '会员特惠', url: '/member', enabled: true },
  { id: 4, img: 'https://picsum.photos/seed/b4/400/160', title: '社区精选', url: '/featured', enabled: false },
];

const gameplaysData = [
  { id: 1, name: '人物美颜', img: 'https://picsum.photos/seed/gp1/300/300', uses: '12.6w', hot: true },
  { id: 2, name: '证件照', img: 'https://picsum.photos/seed/gp2/300/300', uses: '8.3w', hot: true },
  { id: 3, name: '宠物头像', img: 'https://picsum.photos/seed/gp3/300/300', uses: '5.1w', hot: false },
  { id: 4, name: '古风国潮', img: 'https://picsum.photos/seed/gp4/300/300', uses: '4.8w', hot: false },
  { id: 5, name: 'Q版头像', img: 'https://picsum.photos/seed/gp5/300/300', uses: '6.2w', hot: true },
  { id: 6, name: 'Logo设计', img: 'https://picsum.photos/seed/gp6/300/300', uses: '3.9w', hot: false },
  { id: 7, name: '壁纸', img: 'https://picsum.photos/seed/gp7/300/300', uses: '7.5w', hot: false },
  { id: 8, name: '表情包', img: 'https://picsum.photos/seed/gp8/300/300', uses: '9.0w', hot: true },
];

const stylesData = ['赛博朋克','赛璐碌','黑白','国风','油画','水彩','二次元','写实','3D','像素','蒸汽波','极简','梦幻','暗黑','复古'];

const hotSearchData = [
  { id: 1, keyword: '赛博朋克', volume: 12860, enabled: true },
  { id: 2, keyword: '古风少女', volume: 9420, enabled: true },
  { id: 3, keyword: '证件照', volume: 8350, enabled: true },
  { id: 4, keyword: '宠物头像', volume: 6780, enabled: true },
  { id: 5, keyword: '二次元', volume: 5930, enabled: true },
  { id: 6, keyword: '国风山水', volume: 4510, enabled: true },
  { id: 7, keyword: 'Logo设计', volume: 3280, enabled: true },
  { id: 8, keyword: '表情包', volume: 2960, enabled: false },
];

const tabs = [
  { key: 'banners', label: 'Banner' },
  { key: 'gameplays', label: '玩法模板' },
  { key: 'styles', label: '风格' },
  { key: 'hotSearch', label: '热搜词' },
];

const SubTabBar: React.FC<{ active: string; onChange: (k: string) => void }> = ({ active, onChange }) => (
  <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F5F7FA', borderRadius: 8, padding: 3, width: 'fit-content' }}>
    {tabs.map(t => (
      <div key={t.key} onClick={() => onChange(t.key)} style={{
        padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: active === t.key ? 600 : 500,
        color: active === t.key ? '#4A85C8' : '#5A6175',
        background: active === t.key ? '#fff' : 'transparent',
        boxShadow: active === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
        cursor: 'pointer', transition: 'all 0.2s',
      }}>{t.label}</div>
    ))}
  </div>
);

const Operations: React.FC = () => {
  const [activeTab, setActiveTab] = useState('banners');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');

  const openAddModal = (title: string) => { setModalTitle(title); setModalOpen(true); };

  const bannerColumns = [
    {
      title: '图片', dataIndex: 'img', width: 140,
      render: (img: string) => <img src={img} style={{ width: 120, height: 50, borderRadius: 8, objectFit: 'cover' }} />,
    },
    { title: '标题', dataIndex: 'title' },
    { title: '链接', dataIndex: 'url', render: (u: string) => <span style={{ color: '#9CA3B8', fontSize: 12 }}>{u}</span> },
    { title: '状态', dataIndex: 'enabled', render: (v: boolean) => <Switch checked={v} size="small" onChange={() => message.success(v ? '已禁用' : '已启用')} /> },
    {
      title: '操作', width: 120,
      render: () => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openAddModal('编辑 Banner')} />
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => message.warning('已删除')} />
        </Space>
      ),
    },
  ];

  const hotSearchColumns = [
    { title: '关键词', dataIndex: 'keyword', render: (k: string) => <span style={{ fontWeight: 600 }}>{k}</span> },
    { title: '搜索量', dataIndex: 'volume', render: (v: number) => v.toLocaleString(), sorter: (a: any, b: any) => a.volume - b.volume },
    { title: '启用', dataIndex: 'enabled', render: (v: boolean) => <Switch checked={v} size="small" onChange={() => message.success(v ? '已禁用' : '已启用')} /> },
    {
      title: '操作', width: 80,
      render: () => <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openAddModal('编辑热搜词')} />,
    },
  ];

  return (
    <div>
      <SubTabBar active={activeTab} onChange={setActiveTab} />

      {/* Banner Tab */}
      {activeTab === 'banners' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal('新增 Banner')}>新增 Banner</Button>
          </div>
          <Card style={{ borderRadius: 12 }}>
            <Table dataSource={bannersData} columns={bannerColumns} rowKey="id" size="small" pagination={false} />
          </Card>
        </div>
      )}

      {/* Gameplays Tab */}
      {activeTab === 'gameplays' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal('新增玩法模板')}>新增玩法</Button>
          </div>
          <Row gutter={[12, 12]}>
            {gameplaysData.map(g => (
              <Col xs={12} sm={8} md={6} key={g.id}>
                <Card hoverable style={{ borderRadius: 12, overflow: 'hidden' }} styles={{ body: { padding: 10 } }}
                  actions={[
                    <EditOutlined key="edit" onClick={() => openAddModal('编辑玩法模板')} />,
                    <DeleteOutlined key="del" onClick={() => message.warning('已删除')} />,
                  ]}>
                  <div style={{ position: 'relative' }}>
                    <img src={g.img} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                    {g.hot && <div style={{ position: 'absolute', top: 6, right: 6, background: 'linear-gradient(135deg,#ff6b6b,#ee5a24)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}><FireOutlined /> HOT</div>}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3B8' }}><FireOutlined /> {g.uses}人用过</div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* Styles Tab */}
      {activeTab === 'styles' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal('新增风格')}>新增风格</Button>
          </div>
          <Card style={{ borderRadius: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {stylesData.map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: '#F5F7FA', border: '1px solid #E8ECF1', fontSize: 13, fontWeight: 500 }}>
                  {s}
                  <span onClick={() => message.warning(`已删除「${s}」`)} style={{ width: 16, height: 16, borderRadius: '50%', background: '#9CA3B8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer', opacity: 0.6 }}>x</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Hot Search Tab */}
      {activeTab === 'hotSearch' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAddModal('新增热搜词')}>新增热搜词</Button>
          </div>
          <Card style={{ borderRadius: 12 }}>
            <Table dataSource={hotSearchData} columns={hotSearchColumns} rowKey="id" size="small" pagination={false} />
          </Card>
        </div>
      )}

      {/* Generic Add/Edit Modal */}
      <Modal title={modalTitle} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => { setModalOpen(false); message.success('已保存'); }} okText="保存" cancelText="取消" width={520}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          {activeTab === 'banners' && (
            <>
              <Form.Item label="Banner 标题"><Input placeholder="例如: 夏日创作季" /></Form.Item>
              <Form.Item label="跳转链接"><Input placeholder="例如: /summer" /></Form.Item>
              <Form.Item label="Banner 图片"><div style={{ width: '100%', height: 100, border: '1.5px dashed #D0D5DD', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F5F7FA', color: '#9CA3B8' }}>点击上传 Banner 图片<br /><span style={{ fontSize: 11 }}>建议尺寸 700x300</span></div></Form.Item>
            </>
          )}
          {activeTab === 'gameplays' && (
            <>
              <Form.Item label="模板名称"><Input placeholder="例如: 人物美颜" /></Form.Item>
              <Form.Item label="封面图"><div style={{ width: 120, height: 120, border: '1.5px dashed #D0D5DD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F5F7FA', color: '#9CA3B8' }}>上传封面</div></Form.Item>
              <Form.Item label="使用人数（万）"><InputNumber placeholder="例如: 12.6" step={0.1} style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="标记为热门"><Switch /></Form.Item>
            </>
          )}
          {activeTab === 'styles' && (
            <>
              <Form.Item label="风格名称"><Input placeholder="例如: 赛博朋克" /></Form.Item>
              <Form.Item label="风格示例图"><div style={{ width: 120, height: 120, border: '1.5px dashed #D0D5DD', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#F5F7FA', color: '#9CA3B8' }}>上传示例图</div></Form.Item>
              <Form.Item label="排序权重"><InputNumber defaultValue={0} style={{ width: 100 }} /></Form.Item>
            </>
          )}
          {activeTab === 'hotSearch' && (
            <>
              <Form.Item label="关键词"><Input placeholder="例如: 赛博朋克" /></Form.Item>
              <Form.Item label="搜索量"><InputNumber placeholder="例如: 12860" style={{ width: '100%' }} /></Form.Item>
              <Form.Item label="启用状态"><Switch defaultChecked /></Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default Operations;

import React, { useState } from 'react';
import { Card, Table, Badge, Button, Switch, Input, Modal, Form, Row, Col, message } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';

const agreements = [
  { id: 1, name: '用户协议', updated: '2025-06-01', status: 'published' },
  { id: 2, name: '隐私政策', updated: '2025-06-01', status: 'published' },
  { id: 3, name: '充值协议', updated: '2025-05-15', status: 'published' },
];

const defaultAgreementContent = `第一条 总则

本协议是用户（以下简称"您"）与 Lumi-Draw 平台（以下简称"平台"）之间关于使用平台服务所订立的协议。

第二条 服务内容

平台为您提供 AI 图像生成服务，包括但不限于文本转图像、风格迁移等功能。

第三条 用户行为规范

您在使用平台服务时，应遵守相关法律法规，不得利用平台服务从事违法违规活动。`;

const SettingsPage: React.FC = () => {
  const [manualReview, setManualReview] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [version, setVersion] = useState('v1.0.0');
  const [changelog, setChangelog] = useState('- 新增玩法模板功能\n- 优化创作页布局\n- 修复若干已知问题');
  const [agreementModal, setAgreementModal] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState('');
  const [agreementContent, setAgreementContent] = useState(defaultAgreementContent);

  const openAgreementEdit = (name: string) => {
    setEditingAgreement(name);
    setAgreementContent(defaultAgreementContent);
    setAgreementModal(true);
  };

  const agreementColumns = [
    { title: '协议名称', dataIndex: 'name', render: (n: string) => <span style={{ fontWeight: 600 }}>{n}</span> },
    { title: '最后更新', dataIndex: 'updated' },
    {
      title: '状态', dataIndex: 'status',
      render: (s: string) => <Badge status="success" text="已发布" />,
    },
    {
      title: '操作', width: 100,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} type="text" onClick={() => openAgreementEdit(r.name)} style={{ color: '#5B9FE8' }}>编辑</Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* 审核设置 */}
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 24 } }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>审核设置</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>作品人工审核</div>
                <div style={{ fontSize: 12, color: '#9CA3B8', marginTop: 2 }}>开启后，用户发布的作品需管理员审核后才会公开显示</div>
              </div>
              <Switch checked={manualReview} onChange={(v) => { setManualReview(v); message.success(v ? '已开启人工审核' : '已关闭人工审核'); }} />
            </div>
          </Card>
        </Col>

        {/* 版本管理 */}
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 24 } }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>版本管理</div>
            <Form layout="vertical">
              <Form.Item label="当前版本号" style={{ marginBottom: 12 }}>
                <Input value={version} onChange={e => setVersion(e.target.value)} />
              </Form.Item>
              <Form.Item label="更新日志" style={{ marginBottom: 12 }}>
                <Input.TextArea value={changelog} onChange={e => setChangelog(e.target.value)} rows={3} />
              </Form.Item>
              <Form.Item label="强制更新" style={{ marginBottom: 12 }}>
                <div style={{ paddingTop: 4 }}>
                  <Switch checked={forceUpdate} onChange={(v) => { setForceUpdate(v); message.success(v ? '已开启强制更新' : '已关闭强制更新'); }} />
                </div>
              </Form.Item>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('版本信息已保存')}>保存</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 协议管理 */}
      <Card style={{ borderRadius: 12 }} title="协议管理">
        <Table dataSource={agreements} columns={agreementColumns} rowKey="id" size="small" pagination={false} />
      </Card>

      {/* 协议编辑 Modal */}
      <Modal title={`编辑 - ${editingAgreement}`} open={agreementModal} onCancel={() => setAgreementModal(false)}
        onOk={() => { setAgreementModal(false); message.success('协议已保存'); }} okText="保存" cancelText="取消" width={640}>
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="协议内容">
            <Input.TextArea value={agreementContent} onChange={e => setAgreementContent(e.target.value)} rows={12} style={{ fontSize: 13, lineHeight: 1.8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;

import { DeleteOutlined, PlusOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Popconfirm, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiAddSensitiveWords, apiDeleteSensitiveWord, apiGetSensitiveWords, type AdminSensitiveWord } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { SENSITIVE } from "../data/mock";
import { getSensitive } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { useRefresh } from "./opsShared";

function SensitiveWordForm({ useMock, onSaved }: { useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<{ words: string }>();
  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      const values = await form.validateFields();
      const words = values.words.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
      if (!words.length) return;
      setSaving(true);
      if (useMock) words.forEach((word) => SENSITIVE.push(word));
      else await apiAddSensitiveWords(words);
      closeSheet();
      onSaved();
      toast(`已添加 ${words.length} 个敏感词`);
    } catch (cause) {
      if (cause instanceof Error) toast(cause.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Form form={form} layout="vertical">
      <Form.Item label="敏感词" name="words" rules={[{ required: true, whitespace: true, message: "请输入至少一个敏感词" }]}>
        <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="多个词请用逗号或换行分隔" />
      </Form.Item>
      <Typography.Text type="secondary">新增内容会自动去重，并立即参与内容审核。</Typography.Text>
      <div className="lumi-drawer-form-actions">
        <Button onClick={closeSheet} disabled={saving}>取消</Button>
        <Button type="primary" loading={saving} onClick={() => void save()}>保存</Button>
      </div>
    </Form>
  );
}

export function SetSensitive() {
  const { openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminSensitiveWord[]>(useMock ? null : apiGetSensitiveWords, [useMock]);
  const rows = useMock ? getSensitive().map((word, id) => ({ id, word })) : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload();
  const remove = async (row: AdminSensitiveWord) => {
    try {
      if (useMock) {
        const index = rows.findIndex((item) => item.id === row.id);
        if (index >= 0) SENSITIVE.splice(index, 1);
        refresh();
      } else {
        await apiDeleteSensitiveWord(row.id);
        await reload();
      }
      toast("敏感词已删除");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试");
    }
  };
  return (
    <div className="lumi-admin-page">
      {error ? <Alert showIcon type="error" message="敏感词加载失败" description={error} /> : null}
      <Card
        className="lumi-table-card"
        title={<Space><SafetyCertificateOutlined />敏感词管理</Space>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openSheet("新增敏感词", <SensitiveWordForm useMock={useMock} onSaved={afterSaved} />)}>新增敏感词</Button>}
      >
        <Table<AdminSensitiveWord>
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 30, showSizeChanger: false, showTotal: (total) => `共 ${total} 个` }}
          columns={[
            { title: "敏感词", dataIndex: "word", render: (word) => <Tag color="red">{word}</Tag> },
            { title: "操作", width: 110, render: (_, row) => <Popconfirm title="确认删除该敏感词？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void remove(row)}><Button danger type="link" icon={<DeleteOutlined />}>删除</Button></Popconfirm> }
          ]}
        />
      </Card>
    </div>
  );
}

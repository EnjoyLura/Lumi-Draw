import { DeleteOutlined, EditOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { apiDeleteVersion, apiGetVersions, apiSaveVersion } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { nextId, VER_TYPE_COLOR, VER_TYPES, VERSIONS, type AdminVersion, type VersionItem } from "../data/mock";
import { getVersions } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { useRefresh } from "./opsShared";

type VersionFormValues = { ver: string; items: VersionItem[] };

function VersionForm({ item, useMock, onSaved }: { item?: AdminVersion; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<VersionFormValues>();
  const [saving, setSaving] = useState(false);
  const initialValues: VersionFormValues = {
    ver: item?.ver ?? "",
    items: item?.items?.length ? item.items.map((row) => ({ ...row })) : [{ type: "新增", text: "" }]
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      const items = values.items.map((row) => ({ type: row.type, text: row.text.trim() })).filter((row) => row.text);
      if (!items.length) {
        toast("请至少填写一条更新内容");
        return;
      }
      setSaving(true);
      if (useMock) {
        if (item) {
          item.ver = values.ver.trim();
          item.items = items;
        } else {
          VERSIONS.unshift({ id: nextId(VERSIONS), ver: values.ver.trim(), time: new Date().toISOString().slice(0, 10), items });
        }
      } else {
        await apiSaveVersion(item?.id ?? 0, { ver: values.ver.trim(), items });
      }
      closeSheet();
      onSaved();
      toast(item ? "版本已保存" : "新版本已发布");
    } catch (cause) {
      if (cause instanceof Error) toast(cause.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Form form={form} initialValues={initialValues} layout="vertical">
      <Form.Item label="版本号" name="ver" rules={[{ required: true, whitespace: true, message: "请输入版本号" }]}>
        <Input placeholder="例如：v1.3.0" />
      </Form.Item>
      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            <Typography.Text strong>更新条目</Typography.Text>
            {fields.map((field) => (
              <Space key={field.key} align="start" style={{ display: "flex", marginTop: 10 }}>
                <Form.Item name={[field.name, "type"]} rules={[{ required: true }]} style={{ width: 104 }}>
                  <Select options={VER_TYPES.map((type) => ({ value: type, label: type }))} />
                </Form.Item>
                <Form.Item name={[field.name, "text"]} rules={[{ required: true, whitespace: true, message: "请输入更新内容" }]} style={{ flex: 1 }}>
                  <Input placeholder="更新内容" />
                </Form.Item>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
              </Space>
            ))}
            <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add({ type: "新增", text: "" })}>添加一条</Button>
          </>
        )}
      </Form.List>
      <div className="lumi-drawer-form-actions">
        <Button onClick={closeSheet} disabled={saving}>取消</Button>
        <Button type="primary" loading={saving} onClick={() => void save()}>{item ? "保存" : "发布版本"}</Button>
      </div>
    </Form>
  );
}

export function SetVersion() {
  const { openSheet, toast } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminVersion[]>(useMock ? null : apiGetVersions, [useMock]);
  const rows = useMock ? getVersions() : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload();
  const remove = async (row: AdminVersion) => {
    try {
      if (useMock) {
        const index = VERSIONS.findIndex((item) => item.id === row.id);
        if (index >= 0) VERSIONS.splice(index, 1);
        refresh();
      } else {
        await apiDeleteVersion(row.id);
        await reload();
      }
      toast("版本已删除");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试");
    }
  };
  return (
    <div className="lumi-admin-page">
      {error ? <Alert showIcon type="error" message="版本列表加载失败" description={error} /> : null}
      <Card
        className="lumi-table-card"
        title="版本管理"
        extra={<Button type="primary" icon={<SendOutlined />} onClick={() => openSheet("发布新版本", <VersionForm useMock={useMock} onSaved={afterSaved} />)}>发布新版本</Button>}
      >
        <Table<AdminVersion>
          rowKey="id"
          loading={loading}
          dataSource={rows}
          expandable={{ expandedRowRender: (row) => <Space direction="vertical" size={8}>{row.items.map((item, index) => <Space key={`${row.id}-${index}`} align="start"><Tag color={VER_TYPE_COLOR[item.type] === "danger" ? "red" : VER_TYPE_COLOR[item.type] === "success" ? "green" : "blue"}>{item.type}</Tag><Typography.Text>{item.text}</Typography.Text></Space>)}</Space> }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
          columns={[
            { title: "版本", dataIndex: "ver", render: (value, row, index) => <Space><Typography.Text strong>{value}</Typography.Text>{index === 0 ? <Tag color="blue">最新</Tag> : null}</Space> },
            { title: "发布日期", dataIndex: "time", width: 150 },
            { title: "更新条目", dataIndex: "items", width: 120, render: (items: VersionItem[]) => `${items.length} 条` },
            { title: "操作", width: 170, render: (_, row) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openSheet("编辑版本", <VersionForm item={row} useMock={useMock} onSaved={afterSaved} />)}>编辑</Button><Popconfirm title="确认删除该版本？" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => void remove(row)}><Button type="link" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm></Space> }
          ]}
        />
      </Card>
    </div>
  );
}

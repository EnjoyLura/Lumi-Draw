import { EditOutlined, PlusOutlined, TagsOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Space, Table, Typography } from "antd";
import { useState } from "react";
import { apiDeleteCategory, apiGetCategories, apiSaveCategory } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { CATEGORIES, nextId, type AdminCategory } from "../data/mock";
import { getCategories } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { SortCtrl } from "../ui";
import { moveItem, useRefresh } from "./opsShared";

function CategoryForm({ item, useMock, onSaved }: { item?: AdminCategory; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<{ n: string }>();
  const [saving, setSaving] = useState(false);
  const save = async ({ n }: { n: string }) => {
    setSaving(true);
    try {
      if (useMock) {
        if (item) item.n = n.trim();
        else CATEGORIES.push({ id: nextId(CATEGORIES), n: n.trim(), cnt: 0 });
      } else {
        await apiSaveCategory(item?.id || 0, { n: n.trim(), cnt: item?.cnt ?? 0 });
      }
      closeSheet();
      onSaved();
      toast(item ? "分类已保存" : "分类已新增");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Form form={form} layout="vertical" initialValues={{ n: item?.n }} onFinish={save} requiredMark={false}>
      <Form.Item label="分类名称" name="n" rules={[{ required: true, whitespace: true, message: "请输入分类名称" }]}>
        <Input autoFocus placeholder="例如：二次元、风景" maxLength={20} />
      </Form.Item>
      <div className="lumi-drawer-form-actions"><Button onClick={closeSheet}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>保存</Button></div>
    </Form>
  );
}

export function OpsCategory() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminCategory[]>(useMock ? null : apiGetCategories, [useMock]);
  const categories = useMock ? getCategories() : data ?? [];
  const afterSaved = () => useMock ? refresh() : void reload();
  const openForm = (item?: AdminCategory) => openSheet(item ? "编辑分类" : "新增分类", <CategoryForm item={item} useMock={useMock} onSaved={afterSaved} />);
  const remove = (item: AdminCategory) => confirmDlg("删除分类", `确认删除「${item.n}」吗？`, () => {
    void (async () => {
      try {
        if (useMock) {
          const index = categories.findIndex((category) => category.id === item.id);
          if (index >= 0) categories.splice(index, 1);
          refresh();
        } else {
          await apiDeleteCategory(item.id);
          await reload();
        }
        toast("分类已删除");
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : "删除失败，请稍后重试");
      }
    })();
  }, true);
  const move = async (index: number, direction: number) => {
    moveItem(categories, index, direction);
    if (useMock) refresh();
    else {
      try {
        await Promise.all(categories.map((category, sort) => apiSaveCategory(category.id, { ...category, sort: sort + 1 })));
        await reload();
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : "排序保存失败，请稍后重试");
        await reload();
      }
    }
  };
  return (
    <div className="lumi-admin-page">
      <Card className="lumi-table-card" title="作品分类" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm()}>新增分类</Button>}>
        <Table<AdminCategory>
          rowKey="id"
          loading={loading}
          dataSource={categories}
          pagination={false}
          locale={{ emptyText: error || "暂无分类" }}
          columns={[
            { title: "分类", dataIndex: "n", render: (name) => <Space><span className="lumi-table-icon"><TagsOutlined /></span><Typography.Text strong>{name}</Typography.Text></Space> },
            { title: "作品数量", dataIndex: "cnt", width: 160, render: (count) => `${count} 个作品` },
            { title: "排序", width: 180, render: (_, __, index) => <Space><Typography.Text type="secondary">{index + 1}</Typography.Text><SortCtrl index={index} len={categories.length} onMove={(direction) => void move(index, direction)} /></Space> },
            { title: "操作", width: 160, render: (_, item) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(item)}>编辑</Button><Button type="link" danger onClick={() => remove(item)}>删除</Button></Space> }
          ]}
        />
      </Card>
    </div>
  );
}

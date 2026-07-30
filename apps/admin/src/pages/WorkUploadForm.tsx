import { PictureOutlined, SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Image, Input, Select, Space, Spin, Switch, Typography, Upload, type UploadProps } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  apiCreateAdminWork,
  apiGetCategories,
  apiGetModels,
  apiGetQualities,
  apiGetRatios,
  apiGetStyles,
  apiGetUsersPage,
  apiUploadAdminWorkImage
} from "../data/api";
import {
  CATEGORIES,
  MODELS,
  QUALITIES,
  RATIOS,
  STYLES,
  USERS,
  WORKS,
  nextId,
  type AdminCategory,
  type AdminModel,
  type AdminQuality,
  type AdminRatio,
  type AdminStyle,
  type AdminUser
} from "../data/mock";
import { useNav } from "../shell/NavContext";

const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
type UploadWorkValues = { userId: number; title: string; description?: string; prompt: string; modelId: string; ratio: string; quality: string; style?: string; tags?: string[]; featured?: boolean; recommend?: boolean };

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function WorkUploadForm({ useMock, onPublished }: { useMock: boolean; onPublished: () => void }) {
  const { closeSheet, toast } = useNav();
  const [form] = Form.useForm<UploadWorkValues>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [qualities, setQualities] = useState<AdminQuality[]>([]);
  const [ratios, setRatios] = useState<AdminRatio[]>([]);
  const [styles, setStyles] = useState<AdminStyle[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [authorQuery, setAuthorQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const enabledModels = useMemo(() => models.filter((item) => item.on), [models]);
  const enabledQualities = useMemo(() => qualities.filter((item) => item.on), [qualities]);
  const enabledRatios = useMemo(() => ratios.filter((item) => item.on), [ratios]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = useMock ? [USERS, MODELS, QUALITIES, RATIOS, STYLES, CATEGORIES] as const : await Promise.all([apiGetModels(), apiGetQualities(), apiGetRatios(), apiGetStyles(), apiGetCategories()]);
        if (!active) return;
        const [nextUsers, nextModels, nextQualities, nextRatios, nextStyles, nextCategories] = useMock
          ? data as [AdminUser[], AdminModel[], AdminQuality[], AdminRatio[], AdminStyle[], AdminCategory[]]
          : [[], ...(data as [AdminModel[], AdminQuality[], AdminRatio[], AdminStyle[], AdminCategory[]])];
        setUsers(nextUsers); setModels(nextModels); setQualities(nextQualities); setRatios(nextRatios); setStyles(nextStyles); setCategories(nextCategories);
        form.setFieldsValue({
          userId: useMock ? nextUsers[0]?.id : undefined,
          modelId: nextModels.find((item) => item.on)?.id ?? nextModels[0]?.id,
          quality: nextQualities.find((item) => item.on)?.label ?? nextQualities[0]?.label,
          ratio: nextRatios.find((item) => item.on)?.label ?? nextRatios[0]?.label,
          style: nextStyles[0]?.n,
          tags: [], featured: false, recommend: false
        });
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : "发布选项加载失败");
      } finally { if (active) setLoadingOptions(false); }
    })();
    return () => { active = false; };
  }, [form, toast, useMock]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const beforeUpload: UploadProps["beforeUpload"] = (nextFile) => {
    if (!nextFile.type.startsWith("image/")) { toast("请选择图片文件"); return Upload.LIST_IGNORE; }
    if (nextFile.size > MAX_IMAGE_BYTES) { toast("图片不能超过 30MB"); return Upload.LIST_IGNORE; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    return false;
  };
  const searchUsers = async () => {
    setSearchingUsers(true);
    try {
      const keyword = authorQuery.trim();
      const matches = useMock
        ? USERS.filter((user) => !keyword || user.name.includes(keyword) || String(user.id).includes(keyword))
        : (await apiGetUsersPage({ keyword, page: 1, pageSize: 20 })).items;
      setUsers(matches);
      form.setFieldValue("userId", matches[0]?.id);
      if (!matches.length) toast("没有找到匹配用户");
    } catch (cause) { toast(cause instanceof Error ? cause.message : "用户搜索失败，请稍后重试"); }
    finally { setSearchingUsers(false); }
  };
  const publish = async (values: UploadWorkValues) => {
    if (!file) { toast("请上传作品图片"); return; }
    try {
      setSaving(true);
      const imageUrl = useMock ? await fileAsDataUrl(file) : (await apiUploadAdminWorkImage(file)).imageUrl;
      const tags = values.tags?.slice(0, 5) ?? [];
      if (useMock) {
        const author = USERS.find((user) => user.id === values.userId);
        WORKS.unshift({ id: nextId(WORKS), userId: values.userId, authorName: author?.name, imageUrl, title: values.title.trim(), desc: values.description?.trim() ?? "", prompt: values.prompt.trim(), model: values.modelId, ratio: values.ratio, quality: values.quality, style: values.style ?? "", tags, likes: 0, favorites: 0, remakes: 0, status: "已发布", featured: Boolean(values.featured), recommend: Boolean(values.recommend), time: new Date().toISOString() });
        if (author) author.works += 1;
      } else {
        await apiCreateAdminWork({ userId: values.userId, imageUrl, title: values.title.trim(), description: values.description?.trim() ?? "", prompt: values.prompt.trim(), modelId: values.modelId, ratio: values.ratio, quality: values.quality, style: values.style ?? "", tags, featured: Boolean(values.featured), recommend: Boolean(values.recommend) });
      }
      closeSheet(); onPublished(); toast("作品已发布");
    } catch (cause) { toast(cause instanceof Error ? cause.message : "作品发布失败，请稍后重试"); }
    finally { setSaving(false); }
  };
  return <Spin spinning={loadingOptions} tip="正在加载发布选项"><Form form={form} layout="vertical" onFinish={(values) => void publish(values)}>
    <Form.Item label="作品图片" required><Upload accept="image/png,image/jpeg,image/webp,image/gif" maxCount={1} showUploadList={false} beforeUpload={beforeUpload}><Button icon={<UploadOutlined />}>选择本地图片</Button></Upload><Typography.Text type="secondary" style={{ marginLeft: 10 }}>支持 JPG、PNG、WebP、GIF，最大 30MB</Typography.Text>{preview ? <Card size="small" className="lumi-upload-preview"><Image src={preview} alt="作品预览" /></Card> : <Card size="small" className="lumi-upload-placeholder"><PictureOutlined /><Typography.Text type="secondary">请选择需要发布的作品图片</Typography.Text></Card>}</Form.Item>
    <Form.Item label="选择作者" required><Space.Compact style={{ width: "100%" }}><Input value={authorQuery} onChange={(event) => setAuthorQuery(event.target.value)} onPressEnter={() => void searchUsers()} placeholder="按昵称或用户 ID 搜索" /><Button icon={<SearchOutlined />} loading={searchingUsers} onClick={() => void searchUsers()}>搜索</Button></Space.Compact></Form.Item>
    <Form.Item name="userId" rules={[{ required: true, message: "请选择作品作者" }]}><Select showSearch optionFilterProp="label" options={users.map((user) => ({ value: user.id, label: `ID ${user.id} · ${user.name}` }))} placeholder="选择作者" /></Form.Item>
    <Form.Item label="作品标题" name="title" rules={[{ required: true, whitespace: true, message: "请输入作品标题" }]}><Input maxLength={60} showCount /></Form.Item>
    <Form.Item label="作品描述" name="description"><Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} maxLength={500} showCount /></Form.Item>
    <Form.Item label="提示词" name="prompt" rules={[{ required: true, whitespace: true, message: "请输入完整提示词" }]}><Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} maxLength={1200} showCount /></Form.Item>
    <Space size={12} style={{ display: "flex" }} align="start"><Form.Item label="模型" name="modelId" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={enabledModels.map((item) => ({ value: item.id, label: item.name }))} /></Form.Item><Form.Item label="画面比例" name="ratio" rules={[{ required: true }]} style={{ width: 150 }}><Select options={enabledRatios.map((item) => ({ value: item.label, label: item.label }))} /></Form.Item><Form.Item label="图片精度" name="quality" rules={[{ required: true }]} style={{ width: 150 }}><Select options={enabledQualities.map((item) => ({ value: item.label, label: item.label }))} /></Form.Item></Space>
    <Form.Item label="作品风格" name="style"><Select allowClear options={styles.map((item) => ({ value: item.n, label: item.n }))} /></Form.Item>
    <Form.Item label="作品标签" name="tags"><Select mode="multiple" maxCount={5} options={categories.map((item) => ({ value: item.n, label: item.n }))} placeholder="可选择最多 5 个标签" /></Form.Item>
    <Card size="small" className="lumi-switch-card"><Space direction="vertical" style={{ width: "100%" }}><Space style={{ justifyContent: "space-between", width: "100%" }}><span>设为精选</span><Form.Item name="featured" valuePropName="checked" noStyle><Switch /></Form.Item></Space><Space style={{ justifyContent: "space-between", width: "100%" }}><span>首页推荐</span><Form.Item name="recommend" valuePropName="checked" noStyle><Switch /></Form.Item></Space></Space></Card>
    <Alert showIcon type="info" message="后台发布会以所选作者身份直接公开展示，请确认作品版权、内容与作者归属无误。" style={{ marginTop: 16 }} />
    <div className="lumi-drawer-form-actions"><Button onClick={closeSheet} disabled={saving}>取消</Button><Button type="primary" htmlType="submit" loading={saving}>立即发布</Button></div>
  </Form></Spin>;
}

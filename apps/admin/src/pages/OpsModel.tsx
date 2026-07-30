import { AppstoreOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Space, Switch as AntSwitch, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { AdminImage } from "../components/AdminImage";
import { apiDeleteModel, apiGetGenerationProviders, apiGetModels, apiSaveModel, apiSetModelEnabled } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { GENERATION_PROVIDERS, IMG, MODEL_BADGES, MODELS, type AdminGenerationProvider, type AdminModel } from "../data/mock";
import { getModels } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Badge, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const ICON_STYLE: React.CSSProperties = { height: 88, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--fg-muted)", borderStyle: "dashed" };
const QUALITY_TIERS = ["1K", "2K", "4K"] as const;
type QualityTier = (typeof QUALITY_TIERS)[number];
type ProviderRouting = Partial<Record<QualityTier, string[]>>;

function ProviderRouteEditor({
  tier,
  value,
  providers,
  onChange
}: {
  tier: QualityTier;
  value: string[];
  providers: AdminGenerationProvider[];
  onChange: (next: string[]) => void;
}) {
  const available = providers.filter((provider) => !value.includes(provider.id));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="card" style={{ padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 750 }}>{tier} 线路优先级</div>
        <Badge text={`${value.length} 条线路`} type={value.length ? "info" : "muted"} />
      </div>
      {value.length ? value.map((providerId, index) => {
        const provider = providers.find((item) => item.id === providerId);
        return (
          <div key={providerId} className="lrow" style={{ padding: "8px 0" }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              color: index === 0 ? "#fff" : "var(--fg-2)",
              background: index === 0 ? "var(--primary)" : "var(--bg-soft)",
              fontSize: 12,
              fontWeight: 750
            }}>{index + 1}</div>
            <div className="lr-main">
              <div className="lr-t">{provider?.name || providerId}</div>
              <div className="lr-s">{index === 0 ? "主线路" : `备用线路 ${index}`}{provider?.on === false ? " · 已停用，将自动跳过" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <button className="nav-btn" type="button" aria-label="提高优先级" disabled={index === 0} onClick={() => move(index, -1)}><i className="ri-arrow-up-line" /></button>
              <button className="nav-btn" type="button" aria-label="降低优先级" disabled={index === value.length - 1} onClick={() => move(index, 1)}><i className="ri-arrow-down-line" /></button>
              <button className="nav-btn" type="button" aria-label="移除线路" onClick={() => onChange(value.filter((id) => id !== providerId))}><i className="ri-close-line" /></button>
            </div>
          </div>
        );
      }) : <div className="lr-s" style={{ padding: "6px 0 10px" }}>尚未配置，将沿用模型默认线路</div>}
      {available.length ? (
        <select className="input" value="" onChange={(event) => event.target.value && onChange([...value, event.target.value])}>
          <option value="">＋ 添加 API 线路</option>
          {available.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}{provider.on ? "" : "（已停用）"}</option>)}
        </select>
      ) : null}
    </div>
  );
}

function ModelForm({ id, item, providers, useMock, onSaved }: { id: string; item?: AdminModel; providers: AdminGenerationProvider[]; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const m = item ?? (id ? MODELS.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(m?.name ?? "");
  const [desc, setDesc] = useState(m?.desc ?? "");
  const [tags, setTags] = useState((m?.tags ?? []).join("、"));
  const [cost, setCost] = useState(String(m?.cost ?? 10));
  const [badge, setBadge] = useState(m?.badge ?? "");
  const [providerModel, setProviderModel] = useState(m?.providerModel ?? id);
  const [providerRouting, setProviderRouting] = useState<ProviderRouting>(() => Object.fromEntries(
    QUALITY_TIERS.flatMap((tier) => {
      const configured = m?.providerRouting?.[tier] || [];
      const route = configured.length ? configured : m?.provider ? [m.provider] : [];
      return route.length ? [[tier, [...route]]] : [];
    })
  ));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    const firstProvider = QUALITY_TIERS.flatMap((tier) => providerRouting[tier] || [])[0] || m?.provider || providers.find((provider) => provider.on)?.id;
    if (!firstProvider) { toast("请至少配置一条可用 API 线路"); return; }
    if (QUALITY_TIERS.some((tier) => !(providerRouting[tier] || []).length)) {
      toast("请为 1K、2K、4K 分别配置至少一条线路");
      return;
    }
    const data = {
      name: name.trim(),
      desc,
      tags: tags.split(/[、,，]/).map((s) => s.trim()).filter(Boolean),
      cost: parseInt(cost) || 0,
      badge: badge === "无" ? "" : badge,
      provider: firstProvider,
      providerRouting,
      providerModel: providerModel.trim() || id || firstProvider
    };
    setSaving(true);
    try {
      if (useMock) {
        if (m) Object.assign(m, data);
        else MODELS.push({ id: "m" + (MODELS.length + 1), on: true, ...data });
      } else {
        await apiSaveModel(id, { ...data, on: m?.on ?? true });
      }
      closeSheet();
      onSaved();
      toast(id ? "已保存" : "已新增");
    } catch (error) {
      toast(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (tier: QualityTier, next: string[]) => setProviderRouting((current) => ({ ...current, [tier]: next }));

  return (
    <>
      <label className="field-label">模型图标</label>
      <div className="card" style={ICON_STYLE}>
        {id ? <AdminImage eager className="thumb" src={IMG("model" + id)} style={{ width: 56, height: 56 }} alt="" /> : null}
        <div style={{ textAlign: "center" }}><i className="ri-upload-cloud-line" style={{ fontSize: 22 }} /><div style={{ fontSize: 12 }}>点击上传</div></div>
      </div>
      <label className="field-label" style={{ marginTop: 12 }}>模型名称</label>
      <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="如：GPT Image 2" />
      <label className="field-label" style={{ marginTop: 12 }}>上游模型名称</label>
      <input className="input" value={providerModel} onChange={(event) => setProviderModel(event.target.value)} placeholder="未在 API 参数中配置 model 时使用" />
      <label className="field-label" style={{ marginTop: 12 }}>模型描述</label>
      <input className="input" value={desc} onChange={(event) => setDesc(event.target.value)} placeholder="如：画质细腻·理解力强" />
      <label className="field-label" style={{ marginTop: 12 }}>优势标签</label>
      <input className="input" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="多个用、分隔，如：写实、高清" />
      <label className="field-label" style={{ marginTop: 12 }}>消耗积分</label>
      <input className="input" type="number" value={cost} onChange={(event) => setCost(event.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>徽标</label>
      <select className="input" value={badge || "无"} onChange={(event) => setBadge(event.target.value)}>
        {MODEL_BADGES.map((option) => <option key={option}>{option}</option>)}
      </select>
      <div className="field-label" style={{ marginTop: 16, color: "var(--text)" }}>分辨率 API 降级链</div>
      <div className="lr-s" style={{ margin: "4px 0 10px", lineHeight: 1.55 }}>
        按 1 → 2 → 3 顺序调用。同一线路仅在 8 秒内快速失败时重试一次；连续两次快速失败后切换下一线路。
      </div>
      {QUALITY_TIERS.map((tier) => (
        <ProviderRouteEditor key={tier} tier={tier} value={providerRouting[tier] || []} providers={providers} onChange={(next) => updateTier(tier, next)} />
      ))}
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsModel() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<AdminModel[]>(useMock ? null : () => apiGetModels(), [useMock]);
  const { data: providerData, loading: providersLoading, error: providersError } = useAsyncData<AdminGenerationProvider[]>(useMock ? null : () => apiGetGenerationProviders(), [useMock]);
  const models = useMock ? getModels() : data ?? [];
  const providers = useMock ? GENERATION_PROVIDERS : providerData ?? [];
  const providerName = (providerId?: string) => providers.find((provider) => provider.id === providerId)?.name || providerId || "未配置";
  const afterSaved = () => useMock ? refresh() : reload();
  const routeFor = (model: AdminModel, tier: QualityTier) => {
    const route = model.providerRouting?.[tier] || (model.provider ? [model.provider] : []);
    return route.map(providerName).join(" → ") || "未配置";
  };

  const openForm = (id: string) => openSheet(id ? "编辑模型" : "新增模型", <ModelForm id={id} item={models.find((model) => model.id === id)} providers={providers} useMock={useMock} onSaved={afterSaved} />);
  const toggle = async (model: AdminModel) => {
    const next = !model.on;
    try {
      if (useMock) {
        model.on = next;
        refresh();
      } else {
        await apiSetModelEnabled(model.id, next);
        reload();
      }
      toast(next ? "模型已上线" : "模型已下线");
    } catch (error) {
      toast(error instanceof Error ? error.message : "操作失败");
    }
  };
  const del = (model: AdminModel) => confirmDlg("删除模型", "确定删除该模型吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const index = models.findIndex((item) => item.id === model.id);
          if (index > -1) models.splice(index, 1);
          refresh();
        } else {
          await apiDeleteModel(model.id);
          reload();
        }
        toast("已删除");
      } catch (error) {
        toast(error instanceof Error ? error.message : "删除失败");
      }
    })();
  }, true);

  const loadError = error || providersError;
  return (
    <div className="lumi-admin-page">
      <Card className="lumi-table-card" title="创作模型" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openForm("")}>新增模型</Button>}>
        <Table<AdminModel>
          rowKey="id"
          loading={loading || providersLoading}
          dataSource={models}
          pagination={false}
          scroll={{ x: 1160 }}
          locale={{ emptyText: loadError || "暂无创作模型" }}
          columns={[
            {
              title: "模型",
              width: 320,
              render: (_, model) => <Space align="start"><AdminImage className="lumi-table-image" src={IMG("model" + model.id)} style={{ width: 46, height: 46 }} alt="" /><div><Space size={4} wrap><Typography.Text strong>{model.name}</Typography.Text>{model.badge ? <Tag color="blue">{model.badge}</Tag> : null}</Space><Typography.Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ margin: "3px 0 0", maxWidth: 250 }}>{model.desc}</Typography.Paragraph></div></Space>
            },
            { title: "能力标签", width: 230, render: (_, model) => <Space size={[4, 4]} wrap>{model.tags?.length ? model.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <Typography.Text type="secondary">—</Typography.Text>}</Space> },
            { title: "单次成本", dataIndex: "cost", width: 130, render: (cost) => <Typography.Text strong>{cost} 积分</Typography.Text> },
            {
              title: "分辨率降级线路",
              width: 320,
              render: (_, model) => <div className="lumi-model-routes">{QUALITY_TIERS.map((tier) => <span key={tier}><Tag color={tier === "4K" ? "purple" : tier === "2K" ? "blue" : "default"}>{tier}</Tag>{routeFor(model, tier)}</span>)}</div>
            },
            { title: "启用", dataIndex: "on", width: 90, fixed: "right", render: (_, model) => <AntSwitch checked={model.on} onChange={() => void toggle(model)} /> },
            { title: "操作", width: 150, fixed: "right", render: (_, model) => <Space><Button type="link" icon={<EditOutlined />} onClick={() => openForm(model.id)}>编辑</Button><Button type="link" danger onClick={() => del(model)}>删除</Button></Space> }
          ]}
        />
      </Card>
    </div>
  );
}

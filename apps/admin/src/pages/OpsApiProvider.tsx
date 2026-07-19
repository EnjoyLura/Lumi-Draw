import { useState } from "react";
import { apiDeleteGenerationProvider, apiGetGenerationProviders, apiGetModels, apiSaveGenerationProvider } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { GENERATION_PROVIDERS, MODELS, type AdminGenerationProvider, type AdminModel } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const ADAPTERS = [
  { value: "ainb", label: "Ainb 异步任务接口" },
  { value: "change2pro", label: "Images 兼容接口" },
  { value: "kie", label: "KIE 任务接口" }
] as const;
const PARAM_FIELDS = [
  ["quality", "质量参数", "如 high；留空不发送"],
  ["input_fidelity", "参考图保真", "如 high；留空不发送"],
  ["output_format", "输出格式", "如 png、webp"],
  ["response_format", "返回格式", "如 url"],
  ["moderation", "内容审核", "如 auto、low"],
  ["output_compression", "压缩质量", "如 90；留空不发送"]
] as const;
const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function emptyProvider(): AdminGenerationProvider {
  return {
    id: "",
    name: "",
    adapter: "ainb",
    baseUrl: "",
    apiKeyEnv: "",
    apiKeyConfigured: false,
    requestParams: {},
    modelIds: [],
    sort: GENERATION_PROVIDERS.length + 1,
    on: true
  };
}

function ProviderForm({ item, models, useMock, onSaved }: { item?: AdminGenerationProvider; models: AdminModel[]; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const originalId = item?.id || "";
  const [value, setValue] = useState<AdminGenerationProvider>(() => item ? { ...item, requestParams: { ...item.requestParams }, modelIds: [...item.modelIds] } : emptyProvider());
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof AdminGenerationProvider>(key: K, next: AdminGenerationProvider[K]) => setValue((current) => ({ ...current, [key]: next }));
  const updateParam = (key: string, next: string) => update("requestParams", { ...value.requestParams, [key]: next });
  const toggleModel = (modelId: string) => update("modelIds", value.modelIds.includes(modelId) ? value.modelIds.filter((id) => id !== modelId) : [...value.modelIds, modelId]);

  const save = async () => {
    if (!value.id.trim() || !value.name.trim() || !value.baseUrl.trim() || !value.apiKeyEnv.trim()) {
      toast("请填写平台标识、名称、地址和密钥变量名");
      return;
    }
    setSaving(true);
    try {
      if (useMock) {
        const existing = GENERATION_PROVIDERS.find((provider) => provider.id === originalId);
        if (existing) Object.assign(existing, value);
        else GENERATION_PROVIDERS.push({ ...value });
      } else {
        await apiSaveGenerationProvider(originalId, value);
      }
      closeSheet();
      onSaved();
      toast(originalId ? "已保存" : "已新增");
    } catch (error) {
      toast(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">平台标识</label>
      <input className="input" value={value.id} disabled={Boolean(originalId)} onChange={(event) => update("id", event.target.value.toLowerCase())} placeholder="如 ainb-backup" />
      <label className="field-label" style={{ marginTop: 12 }}>平台名称</label>
      <input className="input" value={value.name} onChange={(event) => update("name", event.target.value)} placeholder="如 Ainb 备用线路" />
      <label className="field-label" style={{ marginTop: 12 }}>接口类型</label>
      <select className="input" value={value.adapter} onChange={(event) => update("adapter", event.target.value as AdminGenerationProvider["adapter"])}>
        {ADAPTERS.map((adapter) => <option key={adapter.value} value={adapter.value}>{adapter.label}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>Base URL</label>
      <input className="input" value={value.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} placeholder="https://api.example.com" />
      <label className="field-label" style={{ marginTop: 12 }}>密钥变量名</label>
      <input className="input" value={value.apiKeyEnv} onChange={(event) => update("apiKeyEnv", event.target.value.toUpperCase())} placeholder="IMAGE_API_KEY" />

      <label className="field-label" style={{ marginTop: 12 }}>生效的创作模型</label>
      <div className="card" style={{ padding: "4px 12px" }}>
        {models.map((model) => (
          <label key={model.id} className="lrow" style={{ cursor: "pointer", padding: "10px 0" }}>
            <input type="checkbox" checked={value.modelIds.includes(model.id)} onChange={() => toggleModel(model.id)} />
            <div className="lr-main"><div className="lr-t">{model.name}</div><div className="lr-s">{model.id}</div></div>
          </label>
        ))}
      </div>

      <label className="field-label" style={{ marginTop: 12 }}>可选请求参数</label>
      {PARAM_FIELDS.map(([key, label, placeholder]) => (
        <div key={key} style={{ marginTop: 8 }}>
          <div className="field-label">{label}</div>
          <input className="input" value={value.requestParams[key] || ""} onChange={(event) => updateParam(key, event.target.value)} placeholder={placeholder} />
        </div>
      ))}
      <label className="field-label" style={{ marginTop: 12 }}>排序</label>
      <input className="input" type="number" value={value.sort} onChange={(event) => update("sort", Number(event.target.value) || 0)} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function OpsApiProvider() {
  const { useMock } = useAdminSession();
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const state = useAsyncData(useMock ? null : async () => {
    const [providers, models] = await Promise.all([apiGetGenerationProviders(), apiGetModels()]);
    return { providers, models };
  }, [useMock]);
  const providers = useMock ? GENERATION_PROVIDERS : state.data?.providers ?? [];
  const models = useMock ? MODELS : state.data?.models ?? [];
  const reload = () => useMock ? refresh() : state.reload();
  const openForm = (provider?: AdminGenerationProvider) => openSheet(provider ? "编辑 API 平台" : "新增 API 平台", <ProviderForm item={provider} models={models} useMock={useMock} onSaved={reload} />);

  const toggle = async (provider: AdminGenerationProvider) => {
    try {
      const next = { ...provider, on: !provider.on };
      if (useMock) Object.assign(provider, next);
      else await apiSaveGenerationProvider(provider.id, next);
      reload();
      toast(next.on ? "平台已启用" : "平台已停用");
    } catch (error) {
      toast(error instanceof Error ? error.message : "操作失败");
    }
  };

  const remove = (provider: AdminGenerationProvider) => confirmDlg("删除 API 平台", "确定删除该平台吗？", () => {
    void (async () => {
      try {
        if (useMock) GENERATION_PROVIDERS.splice(GENERATION_PROVIDERS.indexOf(provider), 1);
        else await apiDeleteGenerationProvider(provider.id);
        reload();
        toast("已删除");
      } catch (error) {
        toast(error instanceof Error ? error.message : "删除失败");
      }
    })();
  }, true);

  return (
    <>
      <AddBtn text="新增 API 平台" onClick={() => openForm()} />
      {state.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载 API 平台中</div></div> : null}
      {state.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{state.error}</div></div> : null}
      {providers.map((provider) => (
        <div key={provider.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div className="lr-ico" style={{ color: "#5B9FE8", background: "var(--info-soft)", flexShrink: 0 }}><i className="ri-server-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{provider.name} <Badge text={provider.apiKeyConfigured ? "密钥已配置" : "密钥未配置"} type={provider.apiKeyConfigured ? "success" : "danger"} /></div>
              <div className="lr-s" style={{ wordBreak: "break-all" }}>{provider.baseUrl}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {provider.modelIds.length ? provider.modelIds.map((modelId) => <Badge key={modelId} text={models.find((model) => model.id === modelId)?.name || modelId} type="info" />) : <Badge text="未关联模型" type="muted" />}
              </div>
            </div>
            <Switch on={provider.on} onToggle={() => toggle(provider)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{ADAPTERS.find((item) => item.value === provider.adapter)?.label} · 排序 {provider.sort}</span>
            <CtrlIcons onEdit={() => openForm(provider)} onDelete={() => remove(provider)} />
          </div>
        </div>
      ))}
    </>
  );
}

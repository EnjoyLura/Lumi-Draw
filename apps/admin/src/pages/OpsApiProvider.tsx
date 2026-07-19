import { useState } from "react";
import { apiDeleteGenerationProvider, apiGetGenerationProviders, apiGetModels, apiSaveGenerationProvider } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { GENERATION_PROVIDERS, MODELS, type AdminGenerationProvider, type AdminModel } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, Chips, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const ADAPTERS = [
  { value: "ainb", label: "Ainb 异步任务接口" },
  { value: "change2pro", label: "Images 兼容接口" },
  { value: "kie", label: "KIE 任务接口" }
] as const;
const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function ParamEditor({ value, onChange }: { value: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  const [rows, setRows] = useState(() => Object.entries(value).map(([key, item], index) => ({ id: `${index}-${key}`, key, value: item })));
  const commit = (next: typeof rows) => {
    setRows(next);
    onChange(Object.fromEntries(next.filter((row) => row.key.trim()).map((row) => [row.key.trim(), row.value])));
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row, index) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, .9fr) minmax(0, 1.1fr) 32px", gap: 6, alignItems: "center" }}>
          <input className="input" value={row.key} onChange={(event) => commit(rows.map((item, rowIndex) => rowIndex === index ? { ...item, key: event.target.value } : item))} placeholder="参数名" />
          <input className="input" value={row.value} onChange={(event) => commit(rows.map((item, rowIndex) => rowIndex === index ? { ...item, value: event.target.value } : item))} placeholder="参数值" />
          <button className="nav-btn" type="button" aria-label="删除参数" onClick={() => commit(rows.filter((_, rowIndex) => rowIndex !== index))}><i className="ri-close-line" /></button>
        </div>
      ))}
      <button className="btn btn-ghost" type="button" onClick={() => setRows((current) => [...current, { id: `${Date.now()}-${current.length}`, key: "", value: "" }])}>
        <i className="ri-add-line" /> 添加请求参数
      </button>
    </div>
  );
}

function emptyProvider(): AdminGenerationProvider {
  return {
    id: "",
    name: "",
    groupName: "",
    adapter: "ainb",
    baseUrl: "",
    imageEndpoint: "",
    textToImageEnabled: true,
    imageToImageEnabled: false,
    apiKey: "",
    apiKeyConfigured: false,
    apiKeyHint: "",
    apiKeySource: "none",
    requestParams: { model: "" },
    imageRequestParams: { model: "" },
    modelIds: [],
    sort: GENERATION_PROVIDERS.length + 1,
    on: true
  };
}

function ProviderForm({ item, providers, models, useMock, onSaved }: { item?: AdminGenerationProvider; providers: AdminGenerationProvider[]; models: AdminModel[]; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const originalId = item?.id || "";
  const [value, setValue] = useState<AdminGenerationProvider>(() => item ? {
    ...item,
    apiKey: "",
    requestParams: { model: "", ...item.requestParams },
    imageRequestParams: { model: "", ...item.imageRequestParams },
    modelIds: [...item.modelIds]
  } : emptyProvider());
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof AdminGenerationProvider>(key: K, next: AdminGenerationProvider[K]) => setValue((current) => ({ ...current, [key]: next }));
  const toggleModel = (modelId: string) => update("modelIds", value.modelIds.includes(modelId) ? value.modelIds.filter((id) => id !== modelId) : [...value.modelIds, modelId]);

  const save = async () => {
    if (!value.id.trim() || !value.name.trim() || (!value.apiKeyConfigured && !value.apiKey.trim())) {
      toast("请填写平台标识、名称和 API Key");
      return;
    }
    if (!originalId && providers.some((provider) => provider.id === value.id.trim().toLowerCase())) {
      toast("平台标识已存在，请更换一个标识");
      return;
    }
    if (!value.textToImageEnabled && !value.imageToImageEnabled) {
      toast("请至少启用文生图或图生图能力");
      return;
    }
    if ((value.textToImageEnabled && !value.baseUrl.trim()) || (value.imageToImageEnabled && !value.imageEndpoint.trim())) {
      toast("请填写已启用能力的完整接口 URL");
      return;
    }
    setSaving(true);
    try {
      if (useMock) {
        const nextValue = {
          ...value,
          apiKey: "",
          apiKeyConfigured: value.apiKeyConfigured || Boolean(value.apiKey),
          apiKeyHint: value.apiKey ? `••••${value.apiKey.slice(-4)}` : value.apiKeyHint,
          apiKeySource: value.apiKey ? "admin" as const : value.apiKeySource
        };
        const existing = GENERATION_PROVIDERS.find((provider) => provider.id === originalId);
        if (existing) Object.assign(existing, nextValue);
        else GENERATION_PROVIDERS.push(nextValue);
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
      <label className="field-label" style={{ marginTop: 12 }}>所属分组</label>
      <input
        className="input"
        list="generation-provider-groups"
        maxLength={30}
        value={value.groupName}
        onChange={(event) => update("groupName", event.target.value)}
        placeholder="输入新分组，或选择已有分组"
      />
      <datalist id="generation-provider-groups">
        {[...new Set(providers.map((provider) => provider.groupName).filter(Boolean))].map((group) => <option key={group} value={group} />)}
      </datalist>
      <label className="field-label" style={{ marginTop: 12 }}>接口类型</label>
      <select className="input" value={value.adapter} onChange={(event) => update("adapter", event.target.value as AdminGenerationProvider["adapter"])}>
        {ADAPTERS.map((adapter) => <option key={adapter.value} value={adapter.value}>{adapter.label}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>API Key</label>
      <input
        className="input"
        type="password"
        autoComplete="new-password"
        value={value.apiKey}
        onChange={(event) => update("apiKey", event.target.value)}
        placeholder={value.apiKeyConfigured ? `已配置 ${value.apiKeyHint}，留空则保持不变` : "请输入平台 API Key"}
      />

      <label className="lrow" style={{ cursor: "pointer", marginTop: 12, padding: "8px 0" }}>
        <input type="checkbox" checked={value.textToImageEnabled} onChange={(event) => update("textToImageEnabled", event.target.checked)} />
        <div className="lr-main"><div className="lr-t">启用文生图</div><div className="lr-s">关闭后该平台不接受文生图任务</div></div>
      </label>
      {value.textToImageEnabled ? <>
        <label className="field-label">文生图完整接口 URL</label>
        <input className="input" value={value.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} placeholder="https://api.example.com/v1/images/generations" />
        <label className="field-label" style={{ marginTop: 10 }}>文生图请求参数</label>
        <ParamEditor value={value.requestParams} onChange={(params) => update("requestParams", params)} />
      </> : null}

      <label className="lrow" style={{ cursor: "pointer", marginTop: 12, padding: "8px 0" }}>
        <input type="checkbox" checked={value.imageToImageEnabled} onChange={(event) => update("imageToImageEnabled", event.target.checked)} />
        <div className="lr-main"><div className="lr-t">启用图生图</div><div className="lr-s">接口不支持图生图时保持关闭</div></div>
      </label>
      {value.imageToImageEnabled ? <>
        <label className="field-label">图生图完整接口 URL</label>
        <input className="input" value={value.imageEndpoint} onChange={(event) => update("imageEndpoint", event.target.value)} placeholder="https://api.example.com/v1/images/edits" />
        <label className="field-label" style={{ marginTop: 10 }}>图生图请求参数</label>
        <ParamEditor value={value.imageRequestParams} onChange={(params) => update("imageRequestParams", params)} />
      </> : null}

      <label className="field-label" style={{ marginTop: 12 }}>生效的创作模型</label>
      <div className="card" style={{ padding: "4px 12px" }}>
        {models.map((model) => (
          <label key={model.id} className="lrow" style={{ cursor: "pointer", padding: "10px 0" }}>
            <input type="checkbox" checked={value.modelIds.includes(model.id)} onChange={() => toggleModel(model.id)} />
            <div className="lr-main"><div className="lr-t">{model.name}</div><div className="lr-s">{model.id}</div></div>
          </label>
        ))}
      </div>

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
  const [groupFilter, setGroupFilter] = useState("全部");
  const state = useAsyncData(useMock ? null : async () => {
    const [providers, models] = await Promise.all([apiGetGenerationProviders(), apiGetModels()]);
    return { providers, models };
  }, [useMock]);
  const providers = useMock ? GENERATION_PROVIDERS : state.data?.providers ?? [];
  const models = useMock ? MODELS : state.data?.models ?? [];
  const groups = [...new Set(providers.map((provider) => provider.groupName).filter(Boolean))];
  const hasUngrouped = providers.some((provider) => !provider.groupName);
  const groupFilters = ["全部", ...groups, ...(hasUngrouped ? ["未分组"] : [])];
  const activeGroupFilter = groupFilters.includes(groupFilter) ? groupFilter : "全部";
  const visibleProviders = providers.filter((provider) => activeGroupFilter === "全部"
    || (activeGroupFilter === "未分组" ? !provider.groupName : provider.groupName === activeGroupFilter));
  const reload = () => useMock ? refresh() : state.reload();
  const openForm = (provider?: AdminGenerationProvider) => openSheet(provider ? "编辑 API 平台" : "新增 API 平台", <ProviderForm item={provider} providers={providers} models={models} useMock={useMock} onSaved={reload} />);

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
      {providers.length ? <Chips items={groupFilters} active={activeGroupFilter} onPick={setGroupFilter} /> : null}
      {state.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载 API 平台中</div></div> : null}
      {state.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{state.error}</div></div> : null}
      {!state.loading && !state.error && providers.length > 0 && visibleProviders.length === 0 ? <div className="empty"><i className="ri-inbox-2-line" /><div className="et">该分组暂无 API 平台</div></div> : null}
      {visibleProviders.map((provider) => (
        <div key={provider.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div className="lr-ico" style={{ color: "#5B9FE8", background: "var(--info-soft)", flexShrink: 0 }}><i className="ri-server-line" /></div>
            <div className="lr-main">
              <div className="lr-t">{provider.name} <Badge text={provider.apiKeyConfigured ? `密钥已配置 ${provider.apiKeyHint}` : "密钥未配置"} type={provider.apiKeyConfigured ? "success" : "danger"} /></div>
              <div style={{ marginTop: 4 }}><Badge text={provider.groupName || "未分组"} type={provider.groupName ? "info" : "muted"} /></div>
              <div className="lr-s" style={{ wordBreak: "break-all" }}>{provider.baseUrl}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {provider.textToImageEnabled ? <Badge text="文生图" type="success" /> : null}
                {provider.imageToImageEnabled ? <Badge text="图生图" type="info" /> : null}
              </div>
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

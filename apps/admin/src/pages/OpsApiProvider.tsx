import { useState } from "react";
import {
  apiDeleteGenerationProvider,
  apiDuplicateGenerationProvider,
  apiGetGenerationProviders,
  apiGetModels,
  apiMoveGenerationProvider,
  apiSaveGenerationProvider
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { GENERATION_PROVIDERS, MODELS, type AdminGenerationProvider, type AdminModel } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, Chips, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const ADAPTERS = [
  { value: "ainb", label: "OpenAI Images 异步协议" },
  { value: "change2pro", label: "OpenAI Images / Gemini 普通协议" },
  { value: "kie", label: "KIE 任务协议" }
] as const;
const REQUEST_MODES = [
  { value: "sync", label: "普通接口" },
  { value: "async", label: "异步接口" }
] as const;
const RESULT_MODES = [
  { value: "auto", label: "自动识别" },
  { value: "url", label: "URL（业务服务器处理）" },
  { value: "base64", label: "Base64（FC 生成并直存 OSS）" }
] as const;
const DEFAULT_ASYNC_MAPPING = {
  taskIdPath: "task_id",
  statusPath: "data.status",
  progressPath: "data.progress",
  resultUrlPath: "data.data.data[].url",
  errorPath: "data.fail_reason",
  successValue: "SUCCESS",
  failureValue: "FAILURE",
  pendingValue: "IN_PROGRESS"
};
const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function formatDuration(value: number | null) {
  if (!value) return "暂无";
  const seconds = Math.round(value / 1000);
  return seconds < 60 ? `${seconds} 秒` : `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, "0")}秒`;
}

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

function MappingField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "block" }}>
      <span className="field-label">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function emptyProvider(): AdminGenerationProvider {
  return {
    id: "",
    name: "",
    groupName: "",
    adapter: "ainb",
    requestMode: "async",
    textResultMode: "auto",
    imageResultMode: "auto",
    baseUrl: "",
    imageEndpoint: "",
    queryEndpoint: "",
    statusEnabled: false,
    responseMapping: { ...DEFAULT_ASYNC_MAPPING },
    textToImageEnabled: true,
    imageToImageEnabled: false,
    apiKey: "",
    apiKeyConfigured: false,
    apiKeyHint: "",
    apiKeySource: "none",
    requestParams: { model: "" },
    imageRequestParams: { model: "" },
    modelIds: [],
    metrics: { windowDays: 30, attempts: 0, successes: 0, failures: 0, successRate: null, avgDurationMs: null, lastUsedAt: null, lastError: "" },
    sort: GENERATION_PROVIDERS.length + 1,
    on: true
  };
}

function nextCopyId(sourceId: string, providers: AdminGenerationProvider[]) {
  const existingIds = new Set(providers.map((provider) => provider.id));
  for (let index = 1; index <= 999; index += 1) {
    const suffix = index === 1 ? "-copy" : `-copy-${index}`;
    const candidate = `${sourceId.slice(0, 40 - suffix.length)}${suffix}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return "";
}

function DuplicateProviderForm({
  source,
  providers,
  useMock,
  onSaved
}: {
  source: AdminGenerationProvider;
  providers: AdminGenerationProvider[];
  useMock: boolean;
  onSaved: () => void;
}) {
  const { closeSheet, toast } = useNav();
  const [id, setId] = useState(nextCopyId(source.id, providers));
  const [name, setName] = useState(`${source.name} 副本`);
  const [groupName, setGroupName] = useState(source.groupName);
  const [copyApiKey, setCopyApiKey] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!id.trim() || !name.trim()) { toast("请填写平台标识和名称"); return; }
    if (providers.some((provider) => provider.id === id.trim())) { toast("平台标识已存在"); return; }
    setSaving(true);
    try {
      if (useMock) {
        GENERATION_PROVIDERS.push({
          ...source,
          id: id.trim(),
          name: name.trim(),
          groupName: groupName.trim(),
          apiKey: "",
          apiKeyConfigured: copyApiKey && source.apiKeyConfigured,
          apiKeyHint: copyApiKey ? source.apiKeyHint : "",
          apiKeySource: copyApiKey ? source.apiKeySource : "none",
          requestParams: { ...source.requestParams },
          imageRequestParams: { ...source.imageRequestParams },
          responseMapping: { ...source.responseMapping },
          modelIds: [],
          metrics: { windowDays: 30, attempts: 0, successes: 0, failures: 0, successRate: null, avgDurationMs: null, lastUsedAt: null, lastError: "" },
          sort: source.sort + 1,
          on: enabled
        });
      } else {
        await apiDuplicateGenerationProvider(source.id, {
          id: id.trim(),
          name: name.trim(),
          groupName: groupName.trim(),
          copyApiKey,
          enabled,
          sort: source.sort + 1
        });
      }
      closeSheet();
      onSaved();
      toast("副本已创建");
    } catch (error) {
      toast(error instanceof Error ? error.message : "复制失败");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="card" style={{ padding: 10, marginBottom: 12, background: "var(--info-soft)" }}>
        <div className="lr-t">从“{source.name}”创建副本</div>
        <div className="lr-s" style={{ marginTop: 3 }}>接口、协议、请求参数和结果映射会完整复制，模型线路不会自动变更。</div>
      </div>
      <label className="field-label">新平台标识</label>
      <input className="input" value={id} onChange={(event) => setId(event.target.value.toLowerCase())} />
      <label className="field-label" style={{ marginTop: 12 }}>新平台名称</label>
      <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>所属分组</label>
      <input className="input" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
      <label className="lrow" style={{ cursor: "pointer", marginTop: 12 }}>
        <input type="checkbox" checked={copyApiKey} onChange={(event) => setCopyApiKey(event.target.checked)} />
        <div className="lr-main"><div className="lr-t">复制已保存的 API Key</div><div className="lr-s">密钥只在服务器内部复制，不会返回浏览器</div></div>
      </label>
      <label className="lrow" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <div className="lr-main"><div className="lr-t">创建后立即启用</div><div className="lr-s">建议先测试无误，再加入模型降级链</div></div>
      </label>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "复制中" : "创建副本"}</button>
      </div>
    </>
  );
}

function ProviderForm({ item, providers, models, useMock, onSaved }: { item?: AdminGenerationProvider; providers: AdminGenerationProvider[]; models: AdminModel[]; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const originalId = item?.id || "";
  const [value, setValue] = useState<AdminGenerationProvider>(() => item ? {
    ...item,
    textResultMode: item.textResultMode || "auto",
    imageResultMode: item.imageResultMode || "auto",
    apiKey: "",
    requestParams: { model: "", ...item.requestParams },
    imageRequestParams: { model: "", ...item.imageRequestParams },
    responseMapping: { ...(item.requestMode === "async" ? DEFAULT_ASYNC_MAPPING : {}), ...item.responseMapping },
    modelIds: [...item.modelIds]
  } : emptyProvider());
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof AdminGenerationProvider>(key: K, next: AdminGenerationProvider[K]) => setValue((current) => ({ ...current, [key]: next }));
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
    if (value.requestMode === "async" && (!value.queryEndpoint.trim() || (!value.queryEndpoint.includes("{task_id}") && !value.queryEndpoint.includes("{taskId}")))) {
      toast("异步接口的查询 URL 必须包含 {task_id}");
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
      <select className="input" value={value.requestMode} onChange={(event) => {
        const requestMode = event.target.value as AdminGenerationProvider["requestMode"];
        setValue((current) => ({
          ...current,
          requestMode,
          adapter: requestMode === "sync" ? "change2pro" : current.adapter === "change2pro" ? "ainb" : current.adapter,
          statusEnabled: requestMode === "async" && current.statusEnabled,
          responseMapping: requestMode === "async" ? { ...DEFAULT_ASYNC_MAPPING, ...current.responseMapping } : current.responseMapping
        }));
      }}>
        {REQUEST_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
      </select>
      <div className="field-label" style={{ marginTop: 16, color: "var(--text)" }}>结果处理方式（是否使用 FC）</div>
      <div className="lr-s" style={{ marginTop: 4 }}>返回 URL：不使用 FC；返回 Base64：由 FC 直接写入 OSS。建议按平台实际返回格式选择。</div>
      <label className="field-label" style={{ marginTop: 10 }}>文生图返回格式</label>
      <select className="input" value={value.textResultMode || "auto"} onChange={(event) => update("textResultMode", event.target.value as NonNullable<AdminGenerationProvider["textResultMode"]>)}>
        {RESULT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 10 }}>图生图返回格式</label>
      <select className="input" value={value.imageResultMode || "auto"} onChange={(event) => update("imageResultMode", event.target.value as NonNullable<AdminGenerationProvider["imageResultMode"]>)}>
        {RESULT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>请求协议</label>
      <select className="input" value={value.adapter} onChange={(event) => update("adapter", event.target.value as AdminGenerationProvider["adapter"])}>
        {ADAPTERS.filter((adapter) => value.requestMode === "sync" ? adapter.value === "change2pro" : adapter.value !== "change2pro")
          .map((adapter) => <option key={adapter.value} value={adapter.value}>{adapter.label}</option>)}
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

      {value.requestMode === "async" ? <>
        <label className="field-label" style={{ marginTop: 12 }}>查询任务结果完整 URL</label>
        <input
          className="input"
          value={value.queryEndpoint}
          onChange={(event) => update("queryEndpoint", event.target.value)}
          placeholder="https://api.example.com/v1/tasks/{task_id}"
        />
        <div className="lr-s" style={{ marginTop: 5 }}>使用 <code>{"{task_id}"}</code> 标记任务 ID 所在位置</div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <MappingField label="任务 ID 数据路径" value={value.responseMapping.taskIdPath || ""} placeholder="task_id" onChange={(next) => update("responseMapping", { ...value.responseMapping, taskIdPath: next })} />
          <MappingField label="任务状态数据路径" value={value.responseMapping.statusPath || ""} placeholder="data.status" onChange={(next) => update("responseMapping", { ...value.responseMapping, statusPath: next })} />
          <MappingField label="结果图片 URL 数据路径" value={value.responseMapping.resultUrlPath || ""} placeholder="data.data[].url" onChange={(next) => update("responseMapping", { ...value.responseMapping, resultUrlPath: next })} />
          <MappingField label="失败原因数据路径" value={value.responseMapping.errorPath || ""} placeholder="data.fail_reason" onChange={(next) => update("responseMapping", { ...value.responseMapping, errorPath: next })} />
          <div style={{ display: "grid", gap: 10 }}>
            <MappingField label="成功状态值" value={value.responseMapping.successValue || ""} placeholder="SUCCESS" onChange={(next) => update("responseMapping", { ...value.responseMapping, successValue: next })} />
            <MappingField label="失败状态值" value={value.responseMapping.failureValue || ""} placeholder="FAILURE" onChange={(next) => update("responseMapping", { ...value.responseMapping, failureValue: next })} />
            <MappingField label="处理中状态值" value={value.responseMapping.pendingValue || ""} placeholder="IN_PROGRESS" onChange={(next) => update("responseMapping", { ...value.responseMapping, pendingValue: next })} />
          </div>
        </div>
        <label className="lrow" style={{ cursor: "pointer", marginTop: 12, padding: "8px 0" }}>
          <input type="checkbox" checked={value.statusEnabled} onChange={(event) => update("statusEnabled", event.target.checked)} />
          <div className="lr-main"><div className="lr-t">读取真实处理进度</div><div className="lr-s">状态接口返回进度时，用于小程序生成进度条</div></div>
        </label>
        {value.statusEnabled ? <MappingField label="任务进度数据路径" value={value.responseMapping.progressPath || ""} placeholder="data.progress" onChange={(next) => update("responseMapping", { ...value.responseMapping, progressPath: next })} /> : null}
      </> : null}

      {value.requestMode === "sync" ? <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <MappingField label="结果图片 URL 数据路径" value={value.responseMapping.resultUrlPath || ""} placeholder="data[].url" onChange={(next) => update("responseMapping", { ...value.responseMapping, resultUrlPath: next })} />
        <MappingField label="结果 Base64 数据路径" value={value.responseMapping.resultBase64Path || ""} placeholder="data[].b64_json" onChange={(next) => update("responseMapping", { ...value.responseMapping, resultBase64Path: next })} />
        {(value.textResultMode === "base64" || value.imageResultMode === "base64") ? <label className="lrow" style={{ cursor: "pointer", padding: "8px 0" }}>
          <input type="checkbox" checked={value.responseMapping.allowHttpResultUrl === "true"} onChange={(event) => update("responseMapping", { ...value.responseMapping, allowHttpResultUrl: event.target.checked ? "true" : "" })} />
          <div className="lr-main"><div className="lr-t">允许平台返回 HTTP 图片地址</div><div className="lr-s">仅在平台确实返回 HTTP 原图 URL 时开启；仍会拦截内网地址。</div></div>
        </label> : null}
      </div> : null}
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

      <label className="field-label" style={{ marginTop: 12 }}>当前使用模型</label>
      <div className="card" style={{ padding: 10 }}>
        <div className="lr-s" style={{ marginBottom: value.modelIds.length ? 6 : 0 }}>模型与分辨率线路统一在“模型管理”中配置，避免两处设置互相覆盖。</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {value.modelIds.length
            ? value.modelIds.map((modelId) => <Badge key={modelId} text={models.find((model) => model.id === modelId)?.name || modelId} type="info" />)
            : <Badge text="暂未加入线路" type="muted" />}
        </div>
      </div>
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
  const [keyword, setKeyword] = useState("");
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
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleProviders = providers.filter((provider) => (
    activeGroupFilter === "全部"
    || (activeGroupFilter === "未分组" ? !provider.groupName : provider.groupName === activeGroupFilter)
  ) && (!normalizedKeyword || [provider.name, provider.id, provider.groupName, provider.baseUrl]
    .some((value) => value.toLowerCase().includes(normalizedKeyword))));
  const reload = () => useMock ? refresh() : state.reload();
  const openForm = (provider?: AdminGenerationProvider) => openSheet(provider ? "编辑 API 平台" : "新增 API 平台", <ProviderForm item={provider} providers={providers} models={models} useMock={useMock} onSaved={reload} />);
  const copyProvider = (provider: AdminGenerationProvider) => openSheet("快速创建 API 副本", <DuplicateProviderForm source={provider} providers={providers} useMock={useMock} onSaved={reload} />);

  const moveProvider = async (provider: AdminGenerationProvider, direction: "up" | "down") => {
    try {
      if (useMock) {
        const peers = providers.filter((item) => item.groupName === provider.groupName).sort((a, b) => a.sort - b.sort);
        const index = peers.findIndex((item) => item.id === provider.id);
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= peers.length) return;
        [peers[index].sort, peers[target].sort] = [peers[target].sort, peers[index].sort];
      } else {
        await apiMoveGenerationProvider(provider.id, direction);
      }
      reload();
      toast(direction === "up" ? "优先级已提高" : "优先级已降低");
    } catch (error) {
      toast(error instanceof Error ? error.message : "调整失败");
    }
  };

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
      <div className="card" style={{ padding: 12, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, textAlign: "center" }}>
          <div><div className="lr-t">{providers.length}</div><div className="lr-s">平台总数</div></div>
          <div><div className="lr-t">{providers.filter((provider) => provider.on).length}</div><div className="lr-s">已启用</div></div>
          <div><div className="lr-t">{groups.length + (hasUngrouped ? 1 : 0)}</div><div className="lr-s">分组</div></div>
        </div>
      </div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <i className="ri-search-line" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
        <input className="input" style={{ paddingLeft: 36 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索平台名称、标识、分组或接口地址" />
      </div>
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
              <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                <Badge text={`文 ${(provider.textResultMode || "auto") === "base64" ? "Base64 / FC" : (provider.textResultMode || "auto") === "url" ? "URL / 本地" : "自动"}`} type={(provider.textResultMode || "auto") === "base64" ? "purple" : "muted"} />
                <Badge text={`图 ${(provider.imageResultMode || "auto") === "base64" ? "Base64 / FC" : (provider.imageResultMode || "auto") === "url" ? "URL / 本地" : "自动"}`} type={(provider.imageResultMode || "auto") === "base64" ? "purple" : "muted"} />
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {provider.textToImageEnabled ? <Badge text="文生图" type="success" /> : null}
                {provider.imageToImageEnabled ? <Badge text="图生图" type="info" /> : null}
                <Badge text={provider.requestMode === "async" ? "异步" : "普通"} type={provider.requestMode === "async" ? "info" : "muted"} />
                {provider.statusEnabled ? <Badge text="真实进度" type="success" /> : null}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {provider.modelIds.length ? provider.modelIds.map((modelId) => <Badge key={modelId} text={models.find((model) => model.id === modelId)?.name || modelId} type="info" />) : <Badge text="未关联模型" type="muted" />}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 9 }}>
                <div style={{ padding: "7px 8px", borderRadius: 9, background: "var(--bg-soft)" }}>
                  <div style={{ fontSize: 14, fontWeight: 750 }}>{provider.metrics.successRate === null ? "暂无" : `${provider.metrics.successRate}%`}</div>
                  <div className="lr-s">近30天成功率</div>
                </div>
                <div style={{ padding: "7px 8px", borderRadius: 9, background: "var(--bg-soft)" }}>
                  <div style={{ fontSize: 14, fontWeight: 750 }}>{formatDuration(provider.metrics.avgDurationMs)}</div>
                  <div className="lr-s">平均成功耗时</div>
                </div>
                <div style={{ padding: "7px 8px", borderRadius: 9, background: "var(--bg-soft)" }}>
                  <div style={{ fontSize: 14, fontWeight: 750 }}>{provider.metrics.attempts}</div>
                  <div className="lr-s">请求次数</div>
                </div>
              </div>
              {provider.metrics.lastError ? <div className="lr-s" style={{ marginTop: 6, color: "var(--danger)" }}>最近故障：{provider.metrics.lastError}</div> : null}
            </div>
            <Switch on={provider.on} onToggle={() => toggle(provider)} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{ADAPTERS.find((item) => item.value === provider.adapter)?.label} · 组内优先级</span>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button className="nav-btn" type="button" aria-label="提高优先级" onClick={() => moveProvider(provider, "up")}><i className="ri-arrow-up-line" /></button>
              <button className="nav-btn" type="button" aria-label="降低优先级" onClick={() => moveProvider(provider, "down")}><i className="ri-arrow-down-line" /></button>
              <CtrlIcons onCopy={() => copyProvider(provider)} onEdit={() => openForm(provider)} onDelete={() => remove(provider)} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

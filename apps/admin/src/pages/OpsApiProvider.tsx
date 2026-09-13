import { useState } from "react";
import {
  createEnginePlatform,
  deleteEnginePlatform,
  duplicateEnginePlatform,
  fetchEngineHealth,
  fetchEngineMeta,
  fetchEnginePlatforms,
  moveEnginePlatform,
  testEnginePlatform,
  updateEnginePlatform,
  type EngineAdapterKind,
  type EngineAdapterMeta,
  type EnginePlatform,
  type EnginePlatformMeta,
  type EngineTestResult
} from "../data/engineApi";
import { useAdminSession } from "../data/adminSession";
import { ENGINE_PLATFORMS } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, Chips, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

// mock 模式下的适配器元数据（与后端 adapterMetadata() 保持同构，仅离线演示用）
const MOCK_META: EnginePlatformMeta = {
  adapters: [
    { kind: "openai-images", label: "OpenAI Images 协议", requestMode: "sync", description: "OpenAI /v1/images/generations、/v1/images/edits 同步协议及兼容聚合平台", requiredFields: ["baseUrl"], optionalFields: ["imageEndpoint", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "textResultMode", "imageResultMode"], defaults: { requestMode: "sync", textResultMode: "url", imageResultMode: "auto", authMode: "bearer", imageInputMode: "multipart", imageInputField: "image", sizeMode: "pixels", pixelSizeField: "size" } },
    { kind: "gemini", label: "Gemini generateContent 协议", requestMode: "sync", description: "Google Gemini :generateContent 图像协议，参考图以内联 base64 传递", requiredFields: ["baseUrl"], optionalFields: ["requestParams", "sizeMode", "resolutionField", "ratioField", "textResultMode", "imageResultMode"], defaults: { requestMode: "sync", textResultMode: "base64", imageResultMode: "base64", authMode: "raw", authHeaderName: "x-goog-api-key", sizeMode: "ratio-resolution", ratioField: "aspectRatio", resolutionField: "imageSize" } },
    { kind: "kie", label: "KIE 任务协议", requestMode: "async", description: "KIE createTask/recordInfo 异步任务协议，支持回调", requiredFields: ["baseUrl"], optionalFields: ["queryEndpoint", "responseMapping", "requestParams", "imageRequestParams", "statusEnabled"], defaults: { requestMode: "async", textResultMode: "url", imageResultMode: "url", authMode: "bearer", queryEndpoint: "{baseUrl}/api/v1/jobs/recordInfo" } },
    { kind: "async-http", label: "通用 HTTP（模板 + 轮询）", requestMode: "sync", description: "请求模板 + 响应映射驱动，接入新的提交/轮询型平台无需写代码", requiredFields: ["baseUrl"], optionalFields: ["imageEndpoint", "queryEndpoint", "requestTemplate", "imageRequestTemplate", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "ratioField", "resolutionField", "statusEnabled", "authMode", "authHeaderName", "authQueryName", "requestHeaders", "queryHeaders", "injectModel", "injectCount"], defaults: { requestMode: "async", textResultMode: "url", imageResultMode: "url", authMode: "bearer", imageInputMode: "url-array", imageInputField: "image_urls", sizeMode: "pixels", pixelSizeField: "size", injectModel: true, injectCount: true } }
  ],
  resultModes: ["url", "base64", "auto"],
  requestModes: ["sync", "async"],
  authModes: ["bearer", "raw", "query", "none"],
  imageInputModes: ["multipart", "url", "url-array"]
};

const BASE_URL_HELP: Record<EngineAdapterKind, { placeholder: string; help: string }> = {
  "openai-images": { placeholder: "https://api.example.com/v1/images/generations", help: "文生图完整接口 URL；图生图接口留空时按 /generations→/edits 自动推导" },
  gemini: { placeholder: "https://generativelanguage.googleapis.com/v1beta", help: "接口根地址，或包含 {model} 占位符的完整 generateContent URL" },
  kie: { placeholder: "https://api.kie.ai/api/v1/jobs/createTask", help: "创建任务完整 URL；填站点根地址时自动补 /api/v1/jobs/createTask" },
  "async-http": { placeholder: "https://api.example.com/v1/tasks", help: "提交任务或生成图片的完整接口 URL" }
};

const RESULT_MODE_LABELS: Record<string, string> = { url: "URL（转存原图）", base64: "Base64（FC 直存）", auto: "自动识别" };
const AUTH_MODE_LABELS: Record<string, string> = { bearer: "Bearer Token", raw: "自定义请求头（原值）", query: "URL 参数", none: "不携带密钥" };
const IMAGE_INPUT_LABELS: Record<string, string> = { multipart: "Multipart 文件上传", url: "单个 URL 字段", "url-array": "JSON URL 数组" };

type EditorType = "text" | "select" | "switch" | "kv" | "json" | "rules" | "mapping";

interface FieldDef {
  label: string;
  group: string;
  type: EditorType;
  options?: Array<[string, string]>;
  enumLabels?: Record<string, string>;
  placeholder?: string;
  help?: string;
}

const GROUPS: Array<[string, string]> = [
  ["endpoint", "端点与协议"],
  ["auth", "鉴权"],
  ["capability", "能力与结果"],
  ["reference", "参考图输入"],
  ["size", "尺寸参数映射"],
  ["params", "请求参数与请求头"],
  ["template", "请求体模板"],
  ["mapping", "响应字段映射"]
];

const FIELD_DEFS: Record<string, FieldDef> = {
  requestMode: { label: "请求模式", group: "endpoint", type: "select", options: [["sync", "同步（提交即返回结果）"], ["async", "异步（轮询任务结果）"]] },
  baseUrl: { label: "提交接口 URL", group: "endpoint", type: "text" },
  imageEndpoint: { label: "图生图接口 URL", group: "endpoint", type: "text", placeholder: "https://api.example.com/v1/images/edits" },
  queryEndpoint: { label: "查询任务 URL", group: "endpoint", type: "text", placeholder: "https://api.example.com/v1/tasks/{task_id}", help: "使用 {task_id} 标记任务 ID 所在位置" },
  statusEnabled: { label: "读取真实处理进度", group: "endpoint", type: "switch", help: "状态接口返回进度时，用于小程序生成进度条" },
  authMode: { label: "鉴权方式", group: "auth", type: "select", enumLabels: AUTH_MODE_LABELS },
  authHeaderName: { label: "鉴权请求头名称", group: "auth", type: "text", placeholder: "x-goog-api-key" },
  authQueryName: { label: "鉴权 URL 参数名", group: "auth", type: "text", placeholder: "api_key" },
  textToImageEnabled: { label: "启用文生图", group: "capability", type: "switch", help: "关闭后该平台不接受文生图任务" },
  imageToImageEnabled: { label: "启用图生图", group: "capability", type: "switch", help: "接口不支持图生图时保持关闭" },
  textResultMode: { label: "文生图返回格式", group: "capability", type: "select", enumLabels: RESULT_MODE_LABELS },
  imageResultMode: { label: "图生图返回格式", group: "capability", type: "select", enumLabels: RESULT_MODE_LABELS },
  resultUrlRewriteRules: { label: "结果图片域名加速", group: "capability", type: "rules" },
  imageInputMode: { label: "参考图传输方式", group: "reference", type: "select", enumLabels: IMAGE_INPUT_LABELS },
  imageInputField: { label: "参考图字段名", group: "reference", type: "text", placeholder: "image / image[] / image_urls" },
  sizeMode: { label: "尺寸参数方式", group: "size", type: "select", options: [["pixels", "像素尺寸映射"], ["ratio-resolution", "比例 + 精度分字段"]] },
  pixelSizeField: { label: "像素尺寸字段名", group: "size", type: "text", placeholder: "size" },
  ratioField: { label: "比例字段名", group: "size", type: "text", placeholder: "size / aspectRatio" },
  resolutionField: { label: "精度字段名", group: "size", type: "text", placeholder: "resolution / imageSize" },
  injectModel: { label: "自动注入 model 参数", group: "params", type: "switch" },
  injectCount: { label: "自动注入数量参数（n）", group: "params", type: "switch" },
  requestParams: { label: "文生图请求参数", group: "params", type: "kv" },
  imageRequestParams: { label: "图生图请求参数", group: "params", type: "kv" },
  requestHeaders: { label: "提交请求头", group: "params", type: "kv" },
  queryHeaders: { label: "查询请求头", group: "params", type: "kv" },
  requestTemplate: { label: "文生图请求体模板", group: "template", type: "json" },
  imageRequestTemplate: { label: "图生图请求体模板", group: "template", type: "json" },
  responseMapping: { label: "响应字段映射", group: "mapping", type: "mapping" }
};

const MAPPING_FIELDS: Array<[string, string, string]> = [
  ["taskIdPath", "任务 ID 数据路径", "task_id"],
  ["statusPath", "任务状态数据路径", "data.status"],
  ["progressPath", "任务进度数据路径", "data.progress"],
  ["resultUrlPath", "结果图片 URL 数据路径", "data.data.data[].url"],
  ["resultBase64Path", "结果 Base64 数据路径", "data[].b64_json"],
  ["errorPath", "失败原因数据路径", "data.fail_reason"],
  ["successValue", "成功状态值", "SUCCESS"],
  ["failureValue", "失败状态值", "FAILURE"],
  ["pendingValue", "处理中状态值（多个用逗号分隔）", "IN_PROGRESS"]
];

const TEMPLATE_TOKENS_HELP = "JSON 对象；占位符：{{model}}、{{prompt}}、{{count}}、{{n}}、{{ratio}}、{{size}}、{{resolution}}、{{image_url}}、{{image_urls}}";

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
        <i className="ri-add-line" /> 添加
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

function ResultUrlRewriteEditor({
  value,
  onChange
}: {
  value: Array<{ sourceHost: string; targetHost: string }>;
  onChange: (value: Array<{ sourceHost: string; targetHost: string }>) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {value.map((rule, index) => (
        <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 20px minmax(0, 1fr) 32px", gap: 6, alignItems: "center" }}>
          <input
            className="input"
            value={rule.sourceHost}
            onChange={(event) => onChange(value.map((item, rowIndex) => rowIndex === index ? { ...item, sourceHost: event.target.value } : item))}
            placeholder="files.example.com"
          />
          <i className="ri-arrow-right-line" style={{ textAlign: "center", color: "var(--muted)" }} />
          <input
            className="input"
            value={rule.targetHost}
            onChange={(event) => onChange(value.map((item, rowIndex) => rowIndex === index ? { ...item, targetHost: event.target.value } : item))}
            placeholder="files.example.cn"
          />
          <button className="nav-btn" type="button" aria-label="删除域名映射" onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}>
            <i className="ri-close-line" />
          </button>
        </div>
      ))}
      <button className="btn btn-ghost" type="button" disabled={value.length >= 10} onClick={() => onChange([...value, { sourceHost: "", targetHost: "" }])}>
        <i className="ri-add-line" /> 添加结果图片域名映射
      </button>
    </div>
  );
}

function TemplateEditor({ label, value, onChange }: { label: string; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  const [raw, setRaw] = useState(() => Object.keys(value).length ? JSON.stringify(value, null, 2) : "");
  const [invalid, setInvalid] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <span className="field-label">{label}</span>
      <textarea
        className="input"
        rows={5}
        style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
        value={raw}
        placeholder={'{\n  "prompt": "{{prompt}}",\n  "n": {{count}}\n}'}
        onChange={(event) => {
          const next = event.target.value;
          setRaw(next);
          const text = next.trim();
          if (!text) { setInvalid(false); onChange({}); return; }
          try {
            const parsed = JSON.parse(text) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) { setInvalid(false); onChange(parsed as Record<string, unknown>); return; }
            setInvalid(true);
          } catch {
            setInvalid(true);
          }
        }}
      />
      <div className="lr-s" style={{ marginTop: 4, color: invalid ? "var(--danger)" : undefined }}>
        {invalid ? "JSON 格式错误" : TEMPLATE_TOKENS_HELP}
      </div>
    </label>
  );
}

function MappingEditor({ value, onChange }: { value: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {MAPPING_FIELDS.map(([key, label, placeholder]) => (
        <MappingField key={key} label={label} value={value[key] || ""} placeholder={placeholder} onChange={(next) => {
          const record = { ...value };
          if (next) record[key] = next;
          else delete record[key];
          onChange(record);
        }} />
      ))}
      <label className="lrow" style={{ cursor: "pointer", padding: "6px 0" }}>
        <input type="checkbox" checked={value.allowHttpResultUrl === "true"} onChange={(event) => {
          const record = { ...value };
          if (event.target.checked) record.allowHttpResultUrl = "true";
          else delete record.allowHttpResultUrl;
          onChange(record);
        }} />
        <div className="lr-main"><div className="lr-t">允许平台返回 HTTP 图片地址</div><div className="lr-s">仅在平台确实返回 HTTP 原图 URL 时开启；仍会拦截内网地址。</div></div>
      </label>
    </div>
  );
}

const FIELD_CARD_STYLE: React.CSSProperties = { padding: 12, marginTop: 2 };

function ConfigField({ configKey, def, value, baseUrlPlaceholder, baseUrlHelp, onChange }: {
  configKey: string;
  def: FieldDef;
  value: Record<string, unknown>;
  baseUrlPlaceholder: string;
  baseUrlHelp: string;
  onChange: (key: string, next: unknown) => void;
}) {
  const options = def.options ?? Object.entries(def.enumLabels ?? {}).map(([v, label]) => [v, label] as [string, string]);
  if (def.type === "switch") {
    return (
      <label className="lrow" style={{ padding: "2px 0" }}>
        <div className="lr-main"><div className="lr-t">{def.label}</div>{def.help ? <div className="lr-s">{def.help}</div> : null}</div>
        <Switch on={Boolean(value[configKey])} onToggle={() => onChange(configKey, !value[configKey])} />
      </label>
    );
  }
  if (def.type === "select") {
    return (
      <label style={{ display: "block" }}>
        <span className="field-label">{def.label}</span>
        <select className="input" value={String(value[configKey] ?? "")} onChange={(event) => onChange(configKey, event.target.value)}>
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
      </label>
    );
  }
  if (def.type === "kv") {
    return (
      <div>
        <div className="field-label">{def.label}</div>
        <ParamEditor value={(value[configKey] as Record<string, string>) || {}} onChange={(next) => onChange(configKey, next)} />
      </div>
    );
  }
  if (def.type === "json") {
    return <TemplateEditor label={def.label} value={(value[configKey] as Record<string, unknown>) || {}} onChange={(next) => onChange(configKey, next)} />;
  }
  if (def.type === "rules") {
    return (
      <div className="card" style={FIELD_CARD_STYLE}>
        <div className="lr-t">{def.label}</div>
        <div className="lr-s" style={{ margin: "4px 0 10px" }}>
          只填写域名，不包含 https:// 和路径。永久保存图片时优先使用加速域名，下载失败会自动回退原始地址。
        </div>
        <ResultUrlRewriteEditor value={(value[configKey] as Array<{ sourceHost: string; targetHost: string }>) || []} onChange={(next) => onChange(configKey, next)} />
      </div>
    );
  }
  if (def.type === "mapping") {
    return (
      <div className="card" style={FIELD_CARD_STYLE}>
        <div className="lr-t">{def.label}</div>
        <div className="lr-s" style={{ margin: "4px 0 10px" }}>按平台实际响应结构填写数据路径，留空的字段使用协议默认值。</div>
        <MappingEditor value={(value[configKey] as Record<string, string>) || {}} onChange={(next) => onChange(configKey, next)} />
      </div>
    );
  }
  return (
    <label style={{ display: "block" }}>
      <span className="field-label">{def.label}</span>
      <input
        className="input"
        value={String(value[configKey] ?? "")}
        placeholder={configKey === "baseUrl" ? baseUrlPlaceholder : def.placeholder}
        onChange={(event) => onChange(configKey, event.target.value)}
      />
      {configKey === "baseUrl" ? <div className="lr-s" style={{ marginTop: 4 }}>{baseUrlHelp}</div> : def.help ? <div className="lr-s" style={{ marginTop: 4 }}>{def.help}</div> : null}
    </label>
  );
}

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };
const COMMON_PRESERVED_KEYS = ["textToImageEnabled", "imageToImageEnabled", "requestParams", "imageRequestParams", "resultUrlRewriteRules"];
const DEFAULT_ASYNC_MAPPING: Record<string, string> = {
  taskIdPath: "task_id",
  statusPath: "data.status",
  progressPath: "data.progress",
  resultUrlPath: "data.data.data[].url",
  errorPath: "data.fail_reason",
  successValue: "SUCCESS",
  failureValue: "FAILURE",
  pendingValue: "IN_PROGRESS"
};

function defaultsForKind(entry: EngineAdapterMeta): Record<string, unknown> {
  return {
    ...entry.defaults,
    responseMapping: entry.defaults.requestMode === "async" ? { ...DEFAULT_ASYNC_MAPPING } : {},
    resultUrlRewriteRules: [],
    requestParams: {},
    imageRequestParams: {},
    requestHeaders: {},
    queryHeaders: {},
    requestTemplate: {},
    imageRequestTemplate: {},
    textToImageEnabled: true,
    imageToImageEnabled: false
  };
}

function nextCopyId(sourceId: string, platforms: EnginePlatform[]) {
  const existingIds = new Set(platforms.map((platform) => platform.id));
  for (let index = 1; index <= 999; index += 1) {
    const suffix = index === 1 ? "-copy" : `-copy-${index}`;
    const candidate = `${sourceId.slice(0, 40 - suffix.length)}${suffix}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return "";
}

function TestResultRow({ result }: { result: EngineTestResult | null }) {
  if (!result) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <Badge text={result.ok ? "测试通过" : "测试未通过"} type={result.ok ? "success" : "danger"} />
      <span className="lr-s">{result.message} · {result.latencyMs}ms</span>
    </div>
  );
}

function DuplicatePlatformForm({
  source,
  platforms,
  useMock,
  onSaved
}: {
  source: EnginePlatform;
  platforms: EnginePlatform[];
  useMock: boolean;
  onSaved: () => void;
}) {
  const { closeSheet, toast } = useNav();
  const [id, setId] = useState(nextCopyId(source.id, platforms));
  const [name, setName] = useState(`${source.name} 副本`);
  const [groupName, setGroupName] = useState(source.groupName);
  const [copyApiKey, setCopyApiKey] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!id.trim() || !name.trim()) { toast("请填写平台标识和名称"); return; }
    if (platforms.some((platform) => platform.id === id.trim())) { toast("平台标识已存在"); return; }
    setSaving(true);
    try {
      if (useMock) {
        const now = new Date().toISOString();
        ENGINE_PLATFORMS.push({
          ...source,
          id: id.trim(),
          name: name.trim(),
          groupName: groupName.trim(),
          apiKeyHint: copyApiKey ? source.apiKeyHint : "",
          apiKeyEnv: copyApiKey ? source.apiKeyEnv : "",
          hasEncryptedKey: copyApiKey ? source.hasEncryptedKey : false,
          linkedModelIds: [],
          health: { total: 0, succeeded: 0, failed: 0 },
          sort: source.sort + 1,
          enabled,
          createdAt: now,
          updatedAt: now
        });
      } else {
        await duplicateEnginePlatform(source.id, {
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

function PlatformForm({
  item,
  platforms,
  meta,
  useMock,
  onSaved
}: {
  item?: EnginePlatform;
  platforms: EnginePlatform[];
  meta: EnginePlatformMeta;
  useMock: boolean;
  onSaved: () => void;
}) {
  const { closeSheet, toast } = useNav();
  const originalId = item?.id || "";
  const [id, setId] = useState(item?.id || "");
  const [name, setName] = useState(item?.name || "");
  const [groupName, setGroupName] = useState(item?.groupName || "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState(item?.apiKeyEnv || "");
  const [kind, setKind] = useState<EngineAdapterKind>(item?.adapter || "async-http");
  const [cfg, setCfg] = useState<Record<string, unknown>>(() => (
    item ? { ...item.config } as Record<string, unknown> : defaultsForKind(meta.adapters.find((entry) => entry.kind === "async-http") as EngineAdapterMeta)
  ));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EngineTestResult | null>(null);
  const entry = meta.adapters.find((adapter) => adapter.kind === kind) as EngineAdapterMeta;
  const visibleKeys = [
    ...(kind === "async-http" ? ["requestMode"] : []),
    ...[...new Set([...entry.requiredFields, ...entry.optionalFields])].filter((key) => FIELD_DEFS[key])
  ];
  const update = (key: string, next: unknown) => setCfg((current) => ({ ...current, [key]: next }));
  const switchKind = (nextKind: EngineAdapterKind) => {
    const nextEntry = meta.adapters.find((adapter) => adapter.kind === nextKind) as EngineAdapterMeta;
    const preserved: Record<string, unknown> = {};
    for (const key of COMMON_PRESERVED_KEYS) preserved[key] = cfg[key];
    setKind(nextKind);
    setCfg({ ...defaultsForKind(nextEntry), ...preserved });
    setTestResult(null);
  };
  const fieldVisible = (key: string) => {
    if (key === "authHeaderName") return cfg.authMode === "raw";
    if (key === "authQueryName") return cfg.authMode === "query";
    return true;
  };
  const runTest = async () => {
    setTesting(true);
    try {
      setTestResult(await testEnginePlatform(originalId));
    } catch (error) {
      setTestResult({ ok: false, reachable: false, status: 0, latencyMs: 0, message: error instanceof Error ? error.message : "测试失败" });
    } finally {
      setTesting(false);
    }
  };
  const save = async () => {
    const nextId = id.trim().toLowerCase();
    if (!originalId) {
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/i.test(nextId)) { toast("平台标识只允许字母、数字和连字符，长度 2-41"); return; }
      if (platforms.some((platform) => platform.id === nextId)) { toast("平台标识已存在，请更换一个标识"); return; }
    }
    if (!name.trim()) { toast("请填写平台名称"); return; }
    if (!String(cfg.baseUrl || "").trim()) { toast("请填写提交接口 URL"); return; }
    if (!originalId && !apiKey.trim() && !apiKeyEnv.trim()) { toast("请填写 API Key 或环境变量名"); return; }
    const rules = (cfg.resultUrlRewriteRules as Array<{ sourceHost: string; targetHost: string }>) || [];
    if (rules.some((rule) => !rule.sourceHost.trim() || !rule.targetHost.trim())) { toast("请完整填写结果图片的原始域名和加速域名"); return; }
    const requestMode = String(cfg.requestMode || entry.requestMode);
    if (kind === "async-http" && requestMode === "async" && !String(cfg.queryEndpoint || "").trim()) {
      toast("异步接口需要配置查询任务 URL");
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      groupName: groupName.trim(),
      enabled,
      adapter: kind,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      apiKeyEnv: apiKeyEnv.trim(),
      config: cfg
    };
    try {
      if (useMock) {
        const now = new Date().toISOString();
        const row: EnginePlatform = {
          id: originalId || nextId,
          name: name.trim(),
          groupName: groupName.trim(),
          enabled,
          sort: item?.sort ?? (platforms.reduce((max, platform) => Math.max(max, platform.sort), 0) + 10),
          adapter: kind,
          requestMode: requestMode as "sync" | "async",
          config: cfg as unknown as EnginePlatform["config"],
          apiKeyHint: apiKey ? `••••${apiKey.slice(-4)}` : item?.apiKeyHint || "",
          apiKeyEnv: apiKeyEnv.trim(),
          hasEncryptedKey: Boolean(apiKey || apiKeyEnv.trim() || item?.hasEncryptedKey),
          linkedModelIds: item?.linkedModelIds ?? [],
          health: item?.health ?? { total: 0, succeeded: 0, failed: 0 },
          createdAt: item?.createdAt || now,
          updatedAt: now
        };
        const existing = ENGINE_PLATFORMS.find((platform) => platform.id === row.id);
        if (existing) Object.assign(existing, row);
        else ENGINE_PLATFORMS.push(row);
      } else if (originalId) {
        await updateEnginePlatform(originalId, body);
      } else {
        await createEnginePlatform({ id: nextId, ...body });
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
      <input className="input" value={id} disabled={Boolean(originalId)} onChange={(event) => setId(event.target.value.toLowerCase())} placeholder="如 ainb-backup" />
      <label className="field-label" style={{ marginTop: 12 }}>平台名称</label>
      <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="如 Ainb 备用线路" />
      <label className="field-label" style={{ marginTop: 12 }}>所属分组</label>
      <input
        className="input"
        list="engine-platform-groups"
        maxLength={30}
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        placeholder="输入新分组，或选择已有分组"
      />
      <datalist id="engine-platform-groups">
        {[...new Set(platforms.map((platform) => platform.groupName).filter(Boolean))].map((group) => <option key={group} value={group} />)}
      </datalist>

      <div className="field-label" style={{ marginTop: 16, color: "var(--text)" }}>接口协议</div>
      <select className="input" value={kind} onChange={(event) => switchKind(event.target.value as EngineAdapterKind)}>
        {meta.adapters.map((adapter) => <option key={adapter.kind} value={adapter.kind}>{adapter.label}</option>)}
      </select>
      <div className="lr-s" style={{ marginTop: 5 }}>{entry.description}</div>

      <div className="field-label" style={{ marginTop: 16, color: "var(--text)" }}>鉴权密钥</div>
      <input
        className="input"
        type="password"
        autoComplete="new-password"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        placeholder={item && (item.hasEncryptedKey || item.apiKeyHint) ? `已配置 ${item.apiKeyHint}，留空则保持不变` : "请输入平台 API Key"}
      />
      <label className="field-label" style={{ marginTop: 8 }}>或使用服务器环境变量名</label>
      <input className="input" value={apiKeyEnv} onChange={(event) => setApiKeyEnv(event.target.value)} placeholder="如 KIE_API_KEY" />
      <div className="lr-s" style={{ marginTop: 4 }}>二选一填写；环境变量需已配置在服务器进程环境中。</div>

      <label className="lrow" style={{ cursor: "pointer", marginTop: 12, padding: "4px 0" }}>
        <div className="lr-main"><div className="lr-t">启用该平台</div><div className="lr-s">停用后不参与模型降级链</div></div>
        <Switch on={enabled} onToggle={() => setEnabled((current) => !current)} />
      </label>

      {GROUPS.map(([groupKey, groupTitle]) => {
        const keys = visibleKeys.filter((key) => FIELD_DEFS[key].group === groupKey && fieldVisible(key));
        if (!keys.length) return null;
        return (
          <div key={groupKey} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{groupTitle}</div>
            <div style={{ display: "grid", gap: 12 }}>
              {keys.map((key) => (
                <ConfigField
                  key={key}
                  configKey={key}
                  def={FIELD_DEFS[key]}
                  value={cfg}
                  baseUrlPlaceholder={BASE_URL_HELP[kind].placeholder}
                  baseUrlHelp={BASE_URL_HELP[kind].help}
                  onChange={update}
                />
              ))}
            </div>
          </div>
        );
      })}

      {originalId ? (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-ghost btn-block" type="button" disabled={testing} onClick={runTest}>
            <i className={testing ? "ri-loader-4-line" : "ri-pulse-line"} />{testing ? "测试中" : "测试平台连通性"}
          </button>
          <TestResultRow result={testResult} />
        </div>
      ) : (
        <div className="lr-s" style={{ marginTop: 16 }}>保存后可使用“测试平台连通性”验证接口可达与密钥有效。</div>
      )}

      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

function sizeSummary(platform: EnginePlatform) {
  const config = platform.config;
  if (config.sizeMode === "ratio-resolution") return `${config.ratioField}=16:9 + ${config.resolutionField}=4k`;
  return `${config.pixelSizeField}=3840x2160`;
}

export function OpsApiProvider() {
  const { useMock } = useAdminSession();
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const [groupFilter, setGroupFilter] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const state = useAsyncData(useMock ? null : async () => {
    const [platforms, meta] = await Promise.all([fetchEnginePlatforms(), fetchEngineMeta()]);
    return { platforms, meta };
  }, [useMock]);
  const healthState = useAsyncData(useMock ? null : () => fetchEngineHealth(), [useMock]);
  const meta = useMock ? MOCK_META : state.data?.meta;
  const platforms = useMock ? ENGINE_PLATFORMS : state.data?.platforms ?? [];
  const activeJobs = useMock ? 0 : healthState.data?.activeJobs ?? 0;
  const groups = [...new Set(platforms.map((platform) => platform.groupName).filter(Boolean))];
  const hasUngrouped = platforms.some((platform) => !platform.groupName);
  const groupFilters = ["全部", ...groups, ...(hasUngrouped ? ["未分组"] : [])];
  const activeGroupFilter = groupFilters.includes(groupFilter) ? groupFilter : "全部";
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visiblePlatforms = platforms.filter((platform) => (
    activeGroupFilter === "全部"
    || (activeGroupFilter === "未分组" ? !platform.groupName : platform.groupName === activeGroupFilter)
  ) && (!normalizedKeyword || [platform.name, platform.id, platform.groupName, platform.config.baseUrl]
    .some((value) => value.toLowerCase().includes(normalizedKeyword))));
  const reload = () => useMock ? refresh() : state.reload();
  const adapterLabel = (kind: string) => meta?.adapters.find((adapter) => adapter.kind === kind)?.label ?? kind;

  const openForm = (platform?: EnginePlatform) => {
    if (!meta) { toast("配置元数据未加载，请稍后重试"); return; }
    openSheet(platform ? "编辑 API 平台" : "新增 API 平台", <PlatformForm item={platform} platforms={platforms} meta={meta} useMock={useMock} onSaved={reload} />);
  };
  const copyPlatform = (platform: EnginePlatform) => openSheet("快速创建 API 副本", <DuplicatePlatformForm source={platform} platforms={platforms} useMock={useMock} onSaved={reload} />);

  const movePlatform = async (platform: EnginePlatform, direction: "up" | "down") => {
    try {
      if (useMock) {
        const peers = platforms.filter((item) => item.groupName === platform.groupName).sort((a, b) => a.sort - b.sort);
        const index = peers.findIndex((item) => item.id === platform.id);
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= peers.length) return;
        [peers[index].sort, peers[target].sort] = [peers[target].sort, peers[index].sort];
      } else {
        await moveEnginePlatform(platform.id, direction);
      }
      reload();
      toast(direction === "up" ? "优先级已提高" : "优先级已降低");
    } catch (error) {
      toast(error instanceof Error ? error.message : "调整失败");
    }
  };

  const toggle = async (platform: EnginePlatform) => {
    const enabling = !platform.enabled;
    try {
      if (useMock) {
        platform.enabled = enabling;
      } else {
        await updateEnginePlatform(platform.id, {
          name: platform.name,
          groupName: platform.groupName,
          enabled: enabling,
          adapter: platform.adapter,
          config: platform.config as unknown as Record<string, unknown>
        });
      }
      reload();
      toast(enabling ? "平台已启用" : "平台已停用");
    } catch (error) {
      toast(error instanceof Error ? error.message : "操作失败");
    }
  };

  const testFromList = async (platform: EnginePlatform) => {
    try {
      const result = await testEnginePlatform(platform.id);
      toast(`${result.message} · ${result.latencyMs}ms`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "测试失败");
    }
  };

  const remove = (platform: EnginePlatform) => confirmDlg("删除 API 平台", "确定删除该平台吗？", () => {
    void (async () => {
      try {
        if (useMock) ENGINE_PLATFORMS.splice(ENGINE_PLATFORMS.indexOf(platform), 1);
        else await deleteEnginePlatform(platform.id);
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
          <div><div className="lr-t">{platforms.length}</div><div className="lr-s">平台总数</div></div>
          <div><div className="lr-t">{platforms.filter((platform) => platform.enabled).length}</div><div className="lr-s">已启用</div></div>
          <div><div className="lr-t">{activeJobs}</div><div className="lr-s">进行中任务</div></div>
        </div>
      </div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <i className="ri-search-line" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
        <input className="input" style={{ paddingLeft: 36 }} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索平台名称、标识、分组或接口地址" />
      </div>
      {platforms.length ? <Chips items={groupFilters} active={activeGroupFilter} onPick={setGroupFilter} /> : null}
      {state.loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载 API 平台中</div></div> : null}
      {state.error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{state.error}</div></div> : null}
      {!state.loading && !state.error && platforms.length > 0 && visiblePlatforms.length === 0 ? <div className="empty"><i className="ri-inbox-2-line" /><div className="et">该分组暂无 API 平台</div></div> : null}
      {visiblePlatforms.map((platform) => {
        const config = platform.config;
        const health = platform.health;
        const successRate = health && health.total > 0 ? Math.round((health.succeeded / health.total) * 1000) / 10 : null;
        return (
          <div key={platform.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div className="lr-ico" style={{ color: "#5B9FE8", background: "var(--info-soft)", flexShrink: 0 }}><i className="ri-server-line" /></div>
              <div className="lr-main">
                <div className="lr-t">
                  {platform.name}
                  <Badge text={platform.apiKeyHint || (platform.apiKeyEnv ? `环境变量 ${platform.apiKeyEnv}` : "密钥未配置")} type={platform.apiKeyHint || platform.apiKeyEnv ? "success" : "danger"} />
                </div>
                <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <Badge text={platform.groupName || "未分组"} type={platform.groupName ? "info" : "muted"} />
                  <Badge text={adapterLabel(platform.adapter)} type="purple" />
                </div>
                <div className="lr-s" style={{ wordBreak: "break-all" }}>{config.baseUrl}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <Badge text={`文 ${RESULT_MODE_LABELS[config.textResultMode] || config.textResultMode}`} type={config.textResultMode === "base64" ? "purple" : "muted"} />
                  <Badge text={`图 ${RESULT_MODE_LABELS[config.imageResultMode] || config.imageResultMode}`} type={config.imageResultMode === "base64" ? "purple" : "muted"} />
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {config.textToImageEnabled ? <Badge text="文生图" type="success" /> : null}
                  {config.imageToImageEnabled ? <Badge text="图生图" type="info" /> : null}
                  {config.imageToImageEnabled && config.imageInputField
                    ? <Badge text={`参考图 · ${config.imageInputField}`} type="muted" />
                    : null}
                  <Badge text={config.requestMode === "async" ? "异步" : "同步"} type={config.requestMode === "async" ? "info" : "muted"} />
                  {config.statusEnabled ? <Badge text="真实进度" type="success" /> : null}
                  <Badge text={sizeSummary(platform)} type="muted" />
                  {config.resultUrlRewriteRules.length ? <Badge text={`域名加速 ${config.resultUrlRewriteRules.length} 条`} type="success" /> : null}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {platform.linkedModelIds?.length ? platform.linkedModelIds.map((modelId) => <Badge key={modelId} text={modelId} type="info" />) : <Badge text="未关联模型" type="muted" />}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 9 }}>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "var(--bg-soft)" }}>
                    <div style={{ fontSize: 14, fontWeight: 750 }}>{successRate === null ? "暂无" : `${successRate}%`}</div>
                    <div className="lr-s">近7天成功率</div>
                  </div>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "var(--bg-soft)" }}>
                    <div style={{ fontSize: 14, fontWeight: 750 }}>{health?.total ?? 0}</div>
                    <div className="lr-s">尝试次数</div>
                  </div>
                  <div style={{ padding: "7px 8px", borderRadius: 9, background: "var(--bg-soft)" }}>
                    <div style={{ fontSize: 14, fontWeight: 750, color: health?.failed ? "var(--danger)" : undefined }}>{health?.failed ?? 0}</div>
                    <div className="lr-s">失败次数</div>
                  </div>
                </div>
              </div>
              <Switch on={platform.enabled} onToggle={() => toggle(platform)} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{platform.id} · 组内优先级</span>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button className="nav-btn" type="button" aria-label="提高优先级" onClick={() => movePlatform(platform, "up")}><i className="ri-arrow-up-line" /></button>
                <button className="nav-btn" type="button" aria-label="降低优先级" onClick={() => movePlatform(platform, "down")}><i className="ri-arrow-down-line" /></button>
                <span className="nav-btn" title="测试连通性" aria-label="测试连通性" style={{ width: 32, height: 32, fontSize: 17, color: "var(--fg-2)" }} onClick={() => void testFromList(platform)}><i className="ri-pulse-line" /></span>
                <CtrlIcons onCopy={() => copyPlatform(platform)} onEdit={() => openForm(platform)} onDelete={() => remove(platform)} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

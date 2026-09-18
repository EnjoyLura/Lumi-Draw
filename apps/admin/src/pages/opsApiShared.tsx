import { useState } from "react";
import type { EngineAdapterKind, EngineAdapterMeta, EnginePlatform, EnginePlatformMeta, EngineTestResult } from "../data/engineApi";
import { Badge, Switch } from "../ui";

// API 平台配置的共享常量与字段编辑器：列表页（试运行/副本）与二级编辑页共用。

// mock 模式下的适配器元数据（与后端 adapterMetadata() 保持同构，仅离线演示用）
export const MOCK_META: EnginePlatformMeta = {
  adapters: [
    { kind: "openai-images", label: "OpenAI Images 协议", requestMode: "sync", description: "OpenAI /v1/images/generations、/v1/images/edits 同步协议及兼容聚合平台", requiredFields: ["baseUrl"], optionalFields: ["imageEndpoint", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField"], defaults: { requestMode: "sync", authMode: "bearer", imageInputMode: "multipart", imageInputField: "image", sizeMode: "pixels", pixelSizeField: "size" } },
    { kind: "gemini", label: "Gemini generateContent 协议", requestMode: "sync", description: "Google Gemini :generateContent 图像协议，参考图以内联 base64 传递", requiredFields: ["baseUrl"], optionalFields: ["requestParams", "sizeMode", "resolutionField", "ratioField"], defaults: { requestMode: "sync", authMode: "raw", authHeaderName: "x-goog-api-key", sizeMode: "ratio-resolution", ratioField: "aspectRatio", resolutionField: "imageSize" } },
    { kind: "kie", label: "KIE 任务协议", requestMode: "async", description: "KIE createTask/recordInfo 异步任务协议，支持回调", requiredFields: ["baseUrl"], optionalFields: ["queryEndpoint", "responseMapping", "requestParams", "imageRequestParams", "statusEnabled"], defaults: { requestMode: "async", authMode: "bearer", queryEndpoint: "{baseUrl}/api/v1/jobs/recordInfo" } },
    { kind: "async-http", label: "通用 HTTP（模板 + 轮询）", requestMode: "sync", description: "请求模板 + 响应映射驱动，接入新的提交/轮询型平台无需写代码", requiredFields: ["baseUrl"], optionalFields: ["imageEndpoint", "queryEndpoint", "requestTemplate", "imageRequestTemplate", "responseMapping", "requestParams", "imageRequestParams", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "ratioField", "resolutionField", "statusEnabled", "authMode", "authHeaderName", "authQueryName", "requestHeaders", "queryHeaders", "injectModel", "injectCount"], defaults: { requestMode: "async", authMode: "bearer", imageInputMode: "url-array", imageInputField: "image_urls", sizeMode: "pixels", pixelSizeField: "size", injectModel: true, injectCount: true } }
  ],
  requestModes: ["sync", "async"],
  authModes: ["bearer", "raw", "query", "none"],
  imageInputModes: ["multipart", "url", "url-array"],
  qualityTiers: ["1K", "2K", "4K"]
};

export const ADAPTER_PRESETS: Record<EngineAdapterKind, { icon: string; scene: string }> = {
  "openai-images": { icon: "ri-openai-fill", scene: "Change2Pro、OpenAI 及各类 OpenAI 兼容聚合站" },
  gemini: { icon: "ri-sparkling-2-line", scene: "Google Gemini / Nano Banana 官方与中转" },
  kie: { icon: "ri-pulse-line", scene: "KIE.ai 异步任务平台（Seedream 等）" },
  "async-http": { icon: "ri-plug-line", scene: "任何「提交 + 轮询」或自定义 JSON 协议的平台" }
};

export const AUTH_MODE_LABELS: Record<string, string> = { bearer: "Bearer Token", raw: "自定义请求头（原值）", query: "URL 参数", none: "不携带密钥" };
export const IMAGE_INPUT_LABELS: Record<string, string> = { multipart: "Multipart 文件上传", url: "单个 URL 字段", "url-array": "JSON URL 数组" };

export type EditorType = "text" | "select" | "switch" | "kv" | "json" | "rules" | "mapping";

export interface FieldDef {
  label: string;
  group: string;
  type: EditorType;
  options?: Array<[string, string]>;
  enumLabels?: Record<string, string>;
  placeholder?: string;
  help?: string;
}

export const GROUPS: Array<[string, string]> = [
  ["endpoint", "接口地址"],
  ["auth", "鉴权"],
  ["capability", "生成能力"],
  ["reference", "参考图输入"],
  ["size", "尺寸参数映射"],
  ["params", "请求参数与请求头"],
  ["template", "请求体模板"],
  ["mapping", "响应字段映射"],
  ["result", "结果图片加速"]
];

export const FIELD_DEFS: Record<string, FieldDef> = {
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
  resultUrlRewriteRules: { label: "结果图片域名加速", group: "result", type: "rules" },
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

export const MAPPING_FIELDS: Array<[string, string, string]> = [
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

export function ParamEditor({ value, onChange }: { value: Record<string, string>; onChange: (value: Record<string, string>) => void }) {
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

export function ConfigField({ configKey, def, value, onChange }: {
  configKey: string;
  def: FieldDef;
  value: Record<string, unknown>;
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
        placeholder={def.placeholder}
        onChange={(event) => onChange(configKey, event.target.value)}
      />
      {def.help ? <div className="lr-s" style={{ marginTop: 4 }}>{def.help}</div> : null}
    </label>
  );
}

export const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "18px -14px 0", padding: "12px 14px 0", borderTop: "1px solid var(--border)" };
export const COMMON_PRESERVED_KEYS = ["textToImageEnabled", "imageToImageEnabled", "requestParams", "imageRequestParams", "resultUrlRewriteRules"];
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

export function defaultsForKind(entry: EngineAdapterMeta): Record<string, unknown> {
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

export function nextCopyId(sourceId: string, platforms: EnginePlatform[]) {
  const existingIds = new Set(platforms.map((platform) => platform.id));
  for (let index = 1; index <= 999; index += 1) {
    const suffix = index === 1 ? "-copy" : `-copy-${index}`;
    const candidate = `${sourceId.slice(0, 40 - suffix.length)}${suffix}`;
    if (!existingIds.has(candidate)) return candidate;
  }
  return "";
}

export function TestResultRow({ result }: { result: EngineTestResult | null }) {
  if (!result) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
      <Badge text={result.ok ? "测试通过" : "测试未通过"} type={result.ok ? "success" : "danger"} />
      <span className="lr-s">{result.message} · {result.latencyMs}ms</span>
    </div>
  );
}
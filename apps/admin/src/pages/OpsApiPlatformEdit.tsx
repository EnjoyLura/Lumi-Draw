import { useRef, useState, type ReactNode } from "react";
import {
  createEnginePlatform,
  fetchEngineMeta,
  fetchEnginePlatforms,
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
import { Badge, Switch } from "../ui";
import {
  ADAPTER_PRESETS,
  COMMON_PRESERVED_KEYS,
  ConfigField,
  FIELD_DEFS,
  FOOT_STYLE,
  GROUPS,
  MOCK_META,
  ParamEditor,
  TestResultRow,
  defaultsForKind
} from "./opsApiShared";

/** 新增入口的 param 标记；编辑入口的 param 为平台标识。 */
export const NEW_PLATFORM_PARAM = "new";

type StepKey = "basic" | "capability" | "advanced";
type Operation = "text" | "image";

const STEPS: Array<{ key: StepKey; title: string }> = [
  { key: "basic", title: "基础信息" },
  { key: "capability", title: "生成能力" },
  { key: "advanced", title: "高级选项" }
];

/** 基础信息步的鉴权字段；实际展示还会按协议可用字段过滤。 */
const AUTH_KEYS = ["authMode", "authHeaderName", "authQueryName"];

/** 各步骤展示的协议配置键；实际展示还会按协议可用字段过滤。 */
const STEP_KEYS: Record<"advanced", string[]> = {
  advanced: ["requestHeaders", "queryHeaders", "injectModel", "injectCount", "requestTemplate", "imageRequestTemplate", "responseMapping", "resultUrlRewriteRules"]
};

/** 所有协议通用、不依赖适配器可选字段清单的配置键。 */
const ALWAYS_VISIBLE_KEYS = ["resultUrlRewriteRules"];

const BASIC_PLACEHOLDER: Record<EngineAdapterKind, string> = {
  "openai-images": "https://api.example.com",
  gemini: "https://generativelanguage.googleapis.com",
  kie: "https://api.kie.ai",
  "async-http": "https://api.example.com"
};

/** 接口路径常用后缀（按协议与用途），点击即填入，仍可自行输入。 */
const ENDPOINT_SUFFIX_PRESETS: Record<EngineAdapterKind, Record<Operation | "query", string[]>> = {
  "openai-images": {
    text: ["/v1/images/generations", "/v1/chat/completions"],
    image: ["/v1/images/edits"],
    query: ["/v1/images/tasks/{task_id}"]
  },
  gemini: {
    text: ["/v1beta/models/{model}:generateContent"],
    image: ["/v1beta/models/{model}:generateContent"],
    query: []
  },
  kie: {
    text: ["/api/v1/jobs/createTask"],
    image: ["/api/v1/jobs/createTask"],
    query: ["/api/v1/jobs/recordInfo?taskId={task_id}"]
  },
  "async-http": {
    text: ["/v1/images/generations", "/v1/tasks"],
    image: ["/v1/images/edits", "/v1/tasks"],
    query: ["/v1/images/generations/{task_id}", "/tasks/{task_id}"]
  }
};

/** 常用参数的固定字段：其余键仍走「其他参数」编辑器。 */
const SHORTCUT_PARAMS: Array<{ key: "model" | "quality"; label: string; placeholder: string }> = [
  { key: "model", label: "模型（model）", placeholder: "如 gpt-image-2 / gemini-3.1-flash-image-preview" },
  { key: "quality", label: "质量档（quality）", placeholder: "如 high / medium，留空则不发送" }
];

/** 拆分完整接口地址为「基础地址 + 路径」；{baseUrl} 模板值只保留路径。 */
export function splitEndpoint(full: string): { base: string; suffix: string } {
  const value = String(full || "").trim();
  if (!value) return { base: "", suffix: "" };
  if (value.startsWith("{baseUrl}")) return { base: "", suffix: value.slice("{baseUrl}".length) };
  const match = /^([a-z][a-z0-9+.-]*:\/\/[^/]+)([\s\S]*)$/i.exec(value);
  if (!match) return { base: "", suffix: value };
  return { base: match[1], suffix: match[2] || "" };
}

/** 基础地址 + 路径拼接为完整接口地址。 */
export function joinEndpoint(base: string, suffix: string): string {
  const basePart = String(base || "").trim().replace(/\/+$/, "");
  const suffixPart = String(suffix || "").trim();
  if (!basePart) return suffixPart;
  if (!suffixPart) return basePart;
  return `${basePart}${suffixPart.startsWith("/") ? "" : "/"}${suffixPart}`;
}

/** 协议的默认完整地址优先，其次带出该协议首个常用后缀。 */
function seedSuffix(kind: EngineAdapterKind, operation: "text" | "image", fallbackSource: string): string {
  return splitEndpoint(fallbackSource).suffix || ENDPOINT_SUFFIX_PRESETS[kind][operation][0] || "";
}

/** 协议是否单独提供图生图接口（Gemini 等单端点的图生图与文生图共用地址）。 */
function supportsImageEndpoint(kind: EngineAdapterKind, meta: EnginePlatformMeta): boolean {
  const entry = meta.adapters.find((adapter) => adapter.kind === kind);
  if (!entry) return false;
  return [...entry.requiredFields, ...entry.optionalFields].includes("imageEndpoint");
}

/** 新建平台预填时跳过的字段：接口地址由「基础地址 + 路径」单独维护。 */
function withoutEndpoints(config: EnginePlatform["config"] | undefined): Record<string, unknown> {
  if (!config) return {};
  const { baseUrl: _baseUrl, imageEndpoint: _imageEndpoint, queryEndpoint: _queryEndpoint, ...rest } = config as unknown as Record<string, unknown>;
  return rest;
}

/** 同协议已有平台中优先级最高的一条，作为新建平台的预填模板。 */
function templateForKind(kind: EngineAdapterKind, platforms: EnginePlatform[]): EnginePlatform | undefined {
  return platforms.find((platform) => platform.adapter === kind);
}

/** 预填来源：模板平台的地址优先，其次协议默认地址。 */
function sourceEndpoint(kind: EngineAdapterKind, platforms: EnginePlatform[], meta: EnginePlatformMeta, field: "baseUrl" | "imageEndpoint" | "queryEndpoint"): string {
  const fromTemplate = templateForKind(kind, platforms)?.config?.[field];
  if (fromTemplate) return String(fromTemplate);
  return String(meta.adapters.find((adapter) => adapter.kind === kind)?.defaults?.[field] || "");
}

export function OpsApiPlatformEdit({ param }: { param?: string }) {
  const { useMock } = useAdminSession();
  const isNew = !param || param === NEW_PLATFORM_PARAM;
  const state = useAsyncData(useMock ? null : async () => {
    const [platforms, meta] = await Promise.all([fetchEnginePlatforms(), fetchEngineMeta()]);
    return { platforms, meta };
  }, [useMock]);
  const meta = useMock ? MOCK_META : state.data?.meta;
  const platforms = useMock ? ENGINE_PLATFORMS : state.data?.platforms ?? [];
  const item = isNew ? undefined : platforms.find((platform) => platform.id === param);

  if (!useMock && state.loading) return <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载平台配置中</div></div>;
  if (!useMock && state.error) return <div className="empty"><i className="ri-error-warning-line" /><div className="et">{state.error}</div></div>;
  if (!meta) return <div className="empty"><i className="ri-error-warning-line" /><div className="et">配置元数据未加载</div></div>;
  if (!isNew && !item) return <div className="empty"><i className="ri-server-line" /><div className="et">平台不存在</div></div>;

  return <PlatformEditor item={item} platforms={platforms} meta={meta} useMock={useMock} />;
}

/** 接口路径输入：常用后缀一键填入，也可自行输入。 */
function EndpointSuffixField({ presets, value, placeholder, onChange }: {
  presets: string[];
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      {presets.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {presets.map((preset) => (
            <span
              key={preset}
              className={`chip${value === preset ? " active" : ""}`}
              style={{ fontSize: 11, padding: "3px 8px" }}
              onClick={() => onChange(preset)}
            >
              {preset}
            </span>
          ))}
        </div>
      ) : null}
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </>
  );
}

function ParamShortcutInput({ label, placeholder, value, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ display: "block", marginTop: 8 }}>
      <span className="field-label">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function PlatformEditor({ item, platforms, meta, useMock }: {
  item?: EnginePlatform;
  platforms: EnginePlatform[];
  meta: EnginePlatformMeta;
  useMock: boolean;
}) {
  const { back, toast } = useNav();
  const initial = item?.config;
  /** 新建平台的默认预填来源：列表首条（即优先级最高的主力平台）。 */
  const defaultPrefill = item ? undefined : platforms[0];
  const initialKind: EngineAdapterKind = item?.adapter || defaultPrefill?.adapter || "openai-images";
  const [prefillFrom, setPrefillFrom] = useState<string>(defaultPrefill?.id || "none");
  const [step, setStep] = useState<StepKey>("basic");
  const [id, setId] = useState(item?.id || "");
  const [name, setName] = useState(item?.name || "");
  const [groupName, setGroupName] = useState(item?.groupName || defaultPrefill?.groupName || "");
  /** 记住自动带入的分组名，用户改过之后不再跟随预填来源。 */
  const autoGroupRef = useRef(defaultPrefill?.groupName || "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState(item?.apiKeyEnv || "");
  const [kind, setKind] = useState<EngineAdapterKind>(initialKind);
  const [baseAddress, setBaseAddress] = useState(() => splitEndpoint(item ? initial?.baseUrl || "" : sourceEndpoint(initialKind, platforms, meta, "baseUrl")).base);
  const [textSuffix, setTextSuffix] = useState(() => item
    ? splitEndpoint(initial?.baseUrl || "").suffix
    : splitEndpoint(sourceEndpoint(initialKind, platforms, meta, "baseUrl")).suffix || seedSuffix(initialKind, "text", ""));
  const [imageSuffix, setImageSuffix] = useState(() => {
    if (item) return splitEndpoint(initial?.imageEndpoint || "").suffix;
    if (!supportsImageEndpoint(initialKind, meta)) return "";
    return splitEndpoint(sourceEndpoint(initialKind, platforms, meta, "imageEndpoint")).suffix || seedSuffix(initialKind, "image", "");
  });
  const [querySuffix, setQuerySuffix] = useState(() => splitEndpoint(item ? initial?.queryEndpoint || "" : sourceEndpoint(initialKind, platforms, meta, "queryEndpoint")).suffix);
  const [cfg, setCfg] = useState<Record<string, unknown>>(() => {
    if (item) return { ...item.config } as Record<string, unknown>;
    const entry = meta.adapters.find((adapter) => adapter.kind === initialKind) as EngineAdapterMeta;
    return { ...defaultsForKind(entry), ...withoutEndpoints(defaultPrefill?.config) };
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EngineTestResult | null>(null);

  const entry = meta.adapters.find((adapter) => adapter.kind === kind) as EngineAdapterMeta;
  const stepIndex = STEPS.findIndex((entryStep) => entryStep.key === step);
  const prefillSource = item || prefillFrom === "none" ? undefined : platforms.find((platform) => platform.id === prefillFrom);
  const update = (key: string, next: unknown) => setCfg((current) => ({ ...current, [key]: next }));

  /** 新建平台预填：按来源平台的协议与配置填充各步骤内容。 */
  const applyPrefill = (source: EnginePlatform | undefined) => {
    const targetKind = source?.adapter || kind;
    const targetEntry = meta.adapters.find((adapter) => adapter.kind === targetKind) as EngineAdapterMeta;
    const preserved: Record<string, unknown> = {};
    for (const key of COMMON_PRESERVED_KEYS) preserved[key] = cfg[key];
    const template = item ? undefined : source;
    const nextAutoGroup = template?.groupName || "";
    const previousAutoGroup = autoGroupRef.current;
    autoGroupRef.current = nextAutoGroup;
    setKind(targetKind);
    setPrefillFrom(source?.id || "none");
    setGroupName((current) => (current === previousAutoGroup ? nextAutoGroup : current));
    setCfg({ ...defaultsForKind(targetEntry), ...withoutEndpoints(template?.config), ...preserved });
    const endpointSource = (field: "baseUrl" | "imageEndpoint" | "queryEndpoint") =>
      template ? String(template.config?.[field] || "") || String(targetEntry.defaults?.[field] || "") : String(targetEntry.defaults?.[field] || "");
    setBaseAddress(splitEndpoint(endpointSource("baseUrl")).base);
    setTextSuffix(splitEndpoint(endpointSource("baseUrl")).suffix || seedSuffix(targetKind, "text", ""));
    setImageSuffix(supportsImageEndpoint(targetKind, meta)
      ? splitEndpoint(endpointSource("imageEndpoint")).suffix || seedSuffix(targetKind, "image", "")
      : "");
    setQuerySuffix(splitEndpoint(endpointSource("queryEndpoint")).suffix);
    setTestResult(null);
  };

  /** 换协议：自动改选同协议已有平台作为预填来源，没有则回到协议默认值。 */
  const switchKind = (nextKind: EngineAdapterKind) => applyPrefill(templateForKind(nextKind, platforms));

  const changePrefill = (platformId: string) => applyPrefill(platformId === "none" ? undefined : platforms.find((platform) => platform.id === platformId));

  const readParam = (operation: Operation, key: string): string => {
    const map = (cfg[operation === "text" ? "requestParams" : "imageRequestParams"] as Record<string, string>) || {};
    return String(map[key] ?? "");
  };
  const writeParam = (operation: Operation, key: string, value: string) => {
    const configKey = operation === "text" ? "requestParams" : "imageRequestParams";
    const map = { ...((cfg[configKey] as Record<string, string>) || {}) };
    if (value.trim()) map[key] = value.trim();
    else delete map[key];
    update(configKey, map);
  };
  const extraParams = (operation: Operation): Record<string, string> => {
    const map = (cfg[operation === "text" ? "requestParams" : "imageRequestParams"] as Record<string, string>) || {};
    return Object.fromEntries(Object.entries(map).filter(([key]) => !SHORTCUT_PARAMS.some((shortcut) => shortcut.key === key)));
  };
  const writeExtraParams = (operation: Operation, next: Record<string, string>) => {
    const configKey = operation === "text" ? "requestParams" : "imageRequestParams";
    const shortcuts: Record<string, string> = {};
    for (const shortcut of SHORTCUT_PARAMS) {
      const value = readParam(operation, shortcut.key);
      if (value) shortcuts[shortcut.key] = value;
    }
    update(configKey, { ...next, ...shortcuts });
  };

  const fieldVisible = (key: string) => {
    if (key === "authHeaderName") return cfg.authMode === "raw";
    if (key === "authQueryName") return cfg.authMode === "query";
    return true;
  };
  const adapterKeys = [
    ...(kind === "async-http" ? ["requestMode"] : []),
    ...ALWAYS_VISIBLE_KEYS,
    ...[...new Set([...entry.requiredFields, ...entry.optionalFields])].filter((key) => FIELD_DEFS[key])
  ];
  const keysForStep = (stepKey: "advanced") => STEP_KEYS[stepKey].filter((key) => adapterKeys.includes(key) && fieldVisible(key));
  /** 仅渲染当前协议声明的可选字段，避免出现协议不支持的空白控件。 */
  const supportedKeys = (keys: string[]) => keys.filter((key) => adapterKeys.includes(key));
  const authKeys = supportedKeys(AUTH_KEYS).filter(fieldVisible);
  const usesAsyncMode = String(cfg.requestMode || entry.requestMode) === "async";
  const renderKeys = (keys: string[]): ReactNode => {
    let lastGroup = "";
    return keys.map((key) => {
      const def = FIELD_DEFS[key];
      const heading = def.group !== lastGroup ? GROUPS.find(([group]) => group === def.group)?.[1] : undefined;
      lastGroup = def.group;
      return (
        <div key={key} style={{ marginTop: heading ? 14 : 10 }}>
          {heading ? <div className="step-group">{heading}</div> : null}
          <ConfigField configKey={key} def={def} value={cfg} onChange={update} />
        </div>
      );
    });
  };
  const advancedTweaks = keysForStep("advanced").filter((key) =>
    JSON.stringify(cfg[key] ?? null) !== JSON.stringify(defaultsForKind(entry)[key] ?? null)).length;
  const usesQueryEndpoint = entry.requestMode === "async" || usesAsyncMode;
  const textEnabled = Boolean(cfg.textToImageEnabled);
  const imageEnabled = Boolean(cfg.imageToImageEnabled);

  const textEndpoint = joinEndpoint(baseAddress, textSuffix);
  const imageEndpoint = joinEndpoint(baseAddress, imageSuffix);
  const sizeKeys = supportedKeys(["sizeMode", "pixelSizeField", "ratioField", "resolutionField"]);
  const supportImageEndpoint = supportsImageEndpoint(kind, meta);
  const composedQueryEndpoint = querySuffix.trim() ? joinEndpoint(baseAddress, querySuffix) : "";
  const composedConfig = (): Record<string, unknown> => ({
    ...cfg,
    baseUrl: textEndpoint,
    ...(supportImageEndpoint ? { imageEndpoint: imageSuffix.trim() ? imageEndpoint : "" } : {}),
    queryEndpoint: composedQueryEndpoint
  });

  const validateStep = (stepKey: StepKey): string | null => {
    if (stepKey === "basic") {
      if (!item) {
        const nextId = id.trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9-]{1,40}$/i.test(nextId)) return "平台标识只允许字母、数字和连字符，长度 2-41";
        if (platforms.some((platform) => platform.id === nextId)) return "平台标识已存在，请更换一个标识";
      }
      if (!name.trim()) return "请填写平台名称";
      if (!baseAddress.trim()) return "请填写基础地址，如 https://api.example.com";
      if (!item && !apiKey.trim() && !apiKeyEnv.trim()) return "请填写 API Key 或服务器环境变量名";
      return null;
    }
    if (stepKey === "capability") {
      if (textEnabled && !textSuffix.trim()) return "已启用文生图，请填写文生图接口路径";
      if (imageEnabled && supportImageEndpoint && !imageSuffix.trim()) return "已启用图生图，请填写图生图接口路径";
      if (!textEnabled && !imageEnabled) return "请至少启用文生图或图生图之一";
      if (usesQueryEndpoint && !querySuffix.trim()) return "异步接口需要填写查询任务路径";
      const rules = (cfg.resultUrlRewriteRules as Array<{ sourceHost: string; targetHost: string }>) || [];
      if (rules.some((rule) => !rule.sourceHost.trim() || !rule.targetHost.trim())) {
        return "请完整填写结果图片的原始域名和加速域名";
      }
      return null;
    }
    return null;
  };

  const goNext = () => {
    const message = validateStep(step);
    if (message) { toast(message); return; }
    setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)].key);
  };

  const runTest = async () => {
    if (!item) return;
    setTesting(true);
    try {
      setTestResult(await testEnginePlatform(item.id));
    } catch (error) {
      setTestResult({ ok: false, reachable: false, status: 0, latencyMs: 0, message: error instanceof Error ? error.message : "测试失败" });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    for (const candidate of STEPS) {
      const message = validateStep(candidate.key);
      if (message) { toast(message); setStep(candidate.key); return; }
    }
    const nextId = id.trim().toLowerCase();
    const nextConfig = composedConfig();
    setSaving(true);
    const body = {
      name: name.trim(),
      groupName: groupName.trim(),
      enabled,
      adapter: kind,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      apiKeyEnv: apiKeyEnv.trim(),
      config: nextConfig
    };
    try {
      if (useMock) {
        const now = new Date().toISOString();
        const row: EnginePlatform = {
          id: item?.id || nextId,
          name: name.trim(),
          groupName: groupName.trim(),
          enabled,
          sort: item?.sort ?? (platforms.reduce((max, platform) => Math.max(max, platform.sort), 0) + 10),
          adapter: kind,
          requestMode: String(nextConfig.requestMode || entry.requestMode) as "sync" | "async",
          config: nextConfig as unknown as EnginePlatform["config"],
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
      } else if (item) {
        await updateEnginePlatform(item.id, body);
      } else {
        await createEnginePlatform({ id: nextId, ...body });
      }
      back();
      toast(item ? "已保存" : "已新增，建议立即试运行验证全链路");
    } catch (error) {
      toast(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const operationCard = (operation: Operation) => {
    const isText = operation === "text";
    const enabledKey = isText ? "textToImageEnabled" : "imageToImageEnabled";
    const suffix = isText ? textSuffix : imageSuffix;
    const setSuffix = isText ? setTextSuffix : setImageSuffix;
    const composed = isText ? textEndpoint : imageEndpoint;
    const presets = ENDPOINT_SUFFIX_PRESETS[kind][operation];
    const referenceKeys = isText ? [] : supportedKeys(["imageInputMode", "imageInputField"]);
    return (
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <div className="lrow" style={{ cursor: "pointer", padding: 0 }} onClick={() => update(enabledKey, !cfg[enabledKey])}>
          <div className="lr-main">
            <div className="lr-t">{isText ? "文生图" : "图生图"}</div>
            <div className="lr-s">{isText ? "仅根据提示词生成图片" : "带参考图生成，需平台支持编辑接口"}</div>
          </div>
          <Switch on={Boolean(cfg[enabledKey])} onToggle={() => update(enabledKey, !cfg[enabledKey])} />
        </div>
        {cfg[enabledKey] ? (
          <div style={{ marginTop: 12 }}>
            {isText || supportImageEndpoint ? (
              <>
                <span className="field-label">{isText ? "文生图接口路径" : "图生图接口路径"}</span>
                <EndpointSuffixField
                  presets={presets}
                  value={suffix}
                  placeholder={presets[0] || "/v1/..."}
                  onChange={setSuffix}
                />
                <div className="lr-s" style={{ marginTop: 4, wordBreak: "break-all" }}>
                  完整地址：{composed || "（先填写基础地址）"}
                </div>
              </>
            ) : (
              <div className="lr-s">该协议图生图与文生图共用接口地址，无需单独填写路径。</div>
            )}
            {!isText && referenceKeys.length ? (
              <div style={{ marginTop: 12 }}>
                {referenceKeys.map((key) => <ConfigField key={key} configKey={key} def={FIELD_DEFS[key]} value={cfg} onChange={update} />)}
              </div>
            ) : null}
            <div className="step-group" style={{ marginTop: 14 }}>{isText ? "文生图参数" : "图生图参数"}</div>
            {SHORTCUT_PARAMS.map((shortcut) => (
              <ParamShortcutInput
                key={shortcut.key}
                label={shortcut.label}
                placeholder={shortcut.placeholder}
                value={readParam(operation, shortcut.key)}
                onChange={(value) => writeParam(operation, shortcut.key, value)}
              />
            ))}
            <div className="field-label" style={{ marginTop: 12 }}>其他请求参数</div>
            <ParamEditor
              key={`${kind}-${operation}-extra`}
              value={extraParams(operation)}
              onChange={(next) => writeExtraParams(operation, next)}
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <span className="lr-t">{item ? item.name : "新增 API 平台"}</span>
        <Badge text={entry.label} type="purple" />
        {item ? <span className="lr-s">{item.id}</span> : null}
      </div>
      <div className="steps">
        {STEPS.map((stepEntry, index) => (
          <div
            key={stepEntry.key}
            className={`step${stepEntry.key === step ? " active" : ""}${index < stepIndex ? " done" : ""}`}
            onClick={() => setStep(stepEntry.key)}
          >
            <div className="step-dot">{index < stepIndex ? <i className="ri-check-line" /> : index + 1}</div>
            <div className="step-t">{stepEntry.title}</div>
          </div>
        ))}
      </div>

      {step === "basic" ? (
        <>
          <div className="step-group">平台身份</div>
          <label style={{ display: "block" }}>
            <span className="field-label">平台标识</span>
            <input className="input" value={id} disabled={Boolean(item)} onChange={(event) => setId(event.target.value.toLowerCase())} placeholder="如 ainb-backup" />
          </label>
          <label style={{ display: "block", marginTop: 10 }}>
            <span className="field-label">平台名称</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="如 Ainb 备用线路" />
          </label>
          <label style={{ display: "block", marginTop: 10 }}>
            <span className="field-label">所属分组</span>
            <input
              className="input"
              list="engine-platform-groups"
              maxLength={30}
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="输入新分组，或选择已有分组"
            />
          </label>
          <datalist id="engine-platform-groups">
            {[...new Set(platforms.map((platform) => platform.groupName).filter(Boolean))].map((group) => <option key={group} value={group} />)}
          </datalist>

          <div className="step-group" style={{ marginTop: 16 }}>接入方式</div>
          <select className="input" value={kind} onChange={(event) => switchKind(event.target.value as EngineAdapterKind)}>
            {meta.adapters.map((adapter) => <option key={adapter.kind} value={adapter.kind}>{adapter.label}</option>)}
          </select>
          <div className="lr-s" style={{ marginTop: 5 }}>{entry.description}</div>
          <div className="lr-s" style={{ marginTop: 3, color: "var(--fg-muted)" }}>
            适用：{ADAPTER_PRESETS[kind].scene} · {entry.requestMode === "async" ? "异步轮询" : "同步返回"}
          </div>
          {!item ? (
            <label style={{ display: "block", marginTop: 12 }}>
              <span className="field-label">预填自</span>
              <select className="input" value={prefillFrom} onChange={(event) => changePrefill(event.target.value)}>
                <option value="none">不预填，使用协议默认值</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}（{meta.adapters.find((adapter) => adapter.kind === platform.adapter)?.label || platform.adapter}）
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {prefillSource ? (
            <div className="lr-s" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge text={`已带入「${prefillSource.name}」的配置`} type="info" />
              <span>接口路径、请求参数与鉴权方式已填好，按需修改；API Key 需单独填写。</span>
            </div>
          ) : null}
          <label style={{ display: "block", marginTop: 10 }}>
            <span className="field-label">基础地址</span>
            <input
              className="input"
              value={baseAddress}
              onChange={(event) => setBaseAddress(event.target.value)}
              placeholder={BASIC_PLACEHOLDER[kind]}
            />
          </label>
          <div className="lr-s" style={{ marginTop: 4 }}>只填域名（含协议），各接口路径在「生成能力」中分别填写。</div>
          {kind === "async-http" ? (
            <div style={{ marginTop: 14 }}>
              <ConfigField configKey="requestMode" def={FIELD_DEFS.requestMode} value={cfg} onChange={update} />
            </div>
          ) : null}

          <div className="step-group" style={{ marginTop: 16 }}>鉴权</div>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={item && (item.hasEncryptedKey || item.apiKeyHint) ? `已配置 ${item.apiKeyHint}，留空则保持不变` : "请输入平台 API Key"}
          />
          <input
            className="input"
            style={{ marginTop: 8 }}
            value={apiKeyEnv}
            onChange={(event) => setApiKeyEnv(event.target.value)}
            placeholder="或填写服务器环境变量名，如 KIE_API_KEY"
          />
          <div className="lr-s" style={{ marginTop: 4 }}>API Key 与环境变量名二选一；环境变量需已配置在服务器进程环境中。</div>
          {authKeys.map((key) => (
            <div key={key} style={{ marginTop: 10 }}>
              <ConfigField configKey={key} def={FIELD_DEFS[key]} value={cfg} onChange={update} />
            </div>
          ))}

          <label className="lrow" style={{ cursor: "pointer", marginTop: 14, padding: "4px 0" }}>
            <div className="lr-main"><div className="lr-t">启用该平台</div><div className="lr-s">停用后不参与模型降级链</div></div>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          </label>
        </>
      ) : null}

      {step === "capability" ? (
        <>
          <div className="lr-s">勾选需要的能力，展开填写该能力的接口路径与请求参数；两个能力共用同一个基础地址。</div>
          {operationCard("text")}
          {operationCard("image")}
          {sizeKeys.length ? (
            <div style={{ marginTop: 14 }}>
              <span className="field-label">尺寸参数映射（两个能力共用）</span>
              {sizeKeys.map((key) => <ConfigField key={key} configKey={key} def={FIELD_DEFS[key]} value={cfg} onChange={update} />)}
            </div>
          ) : null}
          {usesQueryEndpoint ? (
            <div style={{ marginTop: 14 }}>
              <span className="field-label">查询任务路径</span>
              <EndpointSuffixField
                presets={ENDPOINT_SUFFIX_PRESETS[kind].query}
                value={querySuffix}
                placeholder="/api/v1/jobs/recordInfo?taskId={task_id}"
                onChange={setQuerySuffix}
              />
              <div className="lr-s" style={{ marginTop: 4, wordBreak: "break-all" }}>
                完整地址：{composedQueryEndpoint || "（留空则使用协议默认地址）"}
              </div>
              <div className="lr-s" style={{ marginTop: 4 }}>异步平台提交任务后按此地址轮询取图，两个能力共用。</div>
              {supportedKeys(["statusEnabled"]).map((key) => (
                <div key={key} style={{ marginTop: 10 }}>
                  <ConfigField configKey={key} def={FIELD_DEFS[key]} value={cfg} onChange={update} />
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {step === "advanced" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className="lr-s">留空即使用协议默认值，大多数平台无需修改。</span>
            {advancedTweaks > 0 ? <Badge text={`已调整 ${advancedTweaks} 项`} type="info" /> : <Badge text="全部默认值" type="muted" />}
          </div>
          {renderKeys(keysForStep("advanced").filter((key) => ["params", "template"].includes(FIELD_DEFS[key].group)))}
          {renderKeys(keysForStep("advanced").filter((key) => FIELD_DEFS[key].group === "mapping"))}
          {renderKeys(keysForStep("advanced").filter((key) => FIELD_DEFS[key].group === "result"))}
          {item ? (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-ghost btn-block" type="button" disabled={testing} onClick={runTest}>
                <i className={testing ? "ri-loader-4-line" : "ri-pulse-line"} />{testing ? "测试中" : "测试已保存配置的连通性"}
              </button>
              <TestResultRow result={testResult} />
            </div>
          ) : null}
        </>
      ) : null}

      <div style={FOOT_STYLE}>
        {stepIndex > 0
          ? <button className="btn btn-ghost btn-block" onClick={() => setStep(STEPS[stepIndex - 1].key)} disabled={saving}>上一步</button>
          : <button className="btn btn-ghost btn-block" onClick={back} disabled={saving}>取消</button>}
        {stepIndex < STEPS.length - 1
          ? <button className="btn btn-primary btn-block" onClick={goNext}>下一步</button>
          : <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : item ? "保存修改" : "创建平台"}</button>}
      </div>
    </>
  );
}
import { useRef, useState } from "react";
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
import { Badge } from "../ui";
import {
  ADAPTER_PRESETS,
  COMMON_PRESERVED_KEYS,
  ConfigField,
  DETAIL_KEYS,
  FIELD_DEFS,
  FOOT_STYLE,
  MOCK_META,
  ParamEditor,
  TestResultRow,
  defaultsForKind
} from "./opsApiShared";

/** 新增入口的 param 标记；编辑入口的 param 为平台标识。 */
export const NEW_PLATFORM_PARAM = "new";

/** 由「生成能力」区承载的协议字段；其余协议字段落到折叠的细节区。 */
const CAPABILITY_KEYS = ["imageInputMode", "imageInputField", "queryEndpoint", "statusEnabled", "requestParams", "imageRequestParams"];

const BASE_URL_PLACEHOLDER: Record<EngineAdapterKind, string> = {
  "openai-images": "https://api.example.com/v1/images/generations",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  "async-http": "https://api.example.com/v1/tasks"
};

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

/** 同协议已有平台中优先级最高的一条，作为新建平台的预填模板。 */
function templateForKind(kind: EngineAdapterKind, platforms: EnginePlatform[]): EnginePlatform | undefined {
  return platforms.find((platform) => platform.adapter === kind);
}

function PlatformEditor({ item, platforms, meta, useMock }: {
  item?: EnginePlatform;
  platforms: EnginePlatform[];
  meta: EnginePlatformMeta;
  useMock: boolean;
}) {
  const { back, toast } = useNav();
  /** 新建平台的默认预填来源：列表首条（即优先级最高的主力平台）。 */
  const defaultPrefill = item ? undefined : platforms[0];
  const initialKind: EngineAdapterKind = item?.adapter || defaultPrefill?.adapter || "openai-images";
  const [prefillFrom, setPrefillFrom] = useState<string>(defaultPrefill?.id || "none");
  const [id, setId] = useState(item?.id || "");
  const [name, setName] = useState(item?.name || "");
  const [groupName, setGroupName] = useState(item?.groupName || defaultPrefill?.groupName || "");
  /** 记住自动带入的分组名，用户改过之后不再跟随预填来源。 */
  const autoGroupRef = useRef(defaultPrefill?.groupName || "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState(item?.apiKeyEnv || "");
  const [kind, setKind] = useState<EngineAdapterKind>(initialKind);
  const [cfg, setCfg] = useState<Record<string, unknown>>(() => {
    if (item) return { ...item.config } as Record<string, unknown>;
    return { ...defaultsForKind(findEntry(meta, initialKind)), ...(defaultPrefill ? defaultPrefill.config : {}) } as Record<string, unknown>;
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EngineTestResult | null>(null);

  const entry = findEntry(meta, kind);
  const prefillSource = item || prefillFrom === "none" ? undefined : platforms.find((platform) => platform.id === prefillFrom);
  const update = (key: string, next: unknown) => setCfg((current) => ({ ...current, [key]: next }));

  /** 新建平台预填：整套配置（含接口地址与鉴权）来自来源平台，缺省时回到协议默认值。 */
  const applyPrefill = (source: EnginePlatform | undefined, forcedKind?: EngineAdapterKind) => {
    const targetKind = forcedKind || source?.adapter || kind;
    const nextAutoGroup = source?.groupName || "";
    const previousAutoGroup = autoGroupRef.current;
    autoGroupRef.current = nextAutoGroup;
    setKind(targetKind);
    setPrefillFrom(source?.id || "none");
    setGroupName((current) => (current === previousAutoGroup ? nextAutoGroup : current));
    const preserved = Object.fromEntries(COMMON_PRESERVED_KEYS.map((key) => [key, cfg[key]]));
    setCfg(source
      ? { ...defaultsForKind(findEntry(meta, targetKind)), ...source.config } as Record<string, unknown>
      : { ...defaultsForKind(findEntry(meta, targetKind)), ...preserved });
    setTestResult(null);
  };

  /** 换协议：自动改选同协议已有平台作为预填来源，没有则回到该协议的默认值。 */
  const switchKind = (nextKind: EngineAdapterKind) => applyPrefill(templateForKind(nextKind, platforms), nextKind);
  const changePrefill = (platformId: string) => applyPrefill(platformId === "none" ? undefined : platforms.find((platform) => platform.id === platformId));

  /** 只在协议声明过的字段里渲染，并按已填值收敛互斥字段。 */
  const supports = (key: string) => [...entry.requiredFields, ...entry.optionalFields].includes(key);
  const fieldVisible = (key: string) => {
    if (key === "authHeaderName") return cfg.authMode === "raw";
    if (key === "authQueryName") return cfg.authMode === "query";
    if (key === "pixelSizeField") return String(cfg.sizeMode || entry.defaults.sizeMode) === "pixels";
    if (key === "ratioField" || key === "resolutionField") return String(cfg.sizeMode || entry.defaults.sizeMode) === "ratio-resolution";
    return true;
  };
  const capabilityKeys = CAPABILITY_KEYS.filter((key) => supports(key) && FIELD_DEFS[key] && fieldVisible(key));
  const detailKeys = DETAIL_KEYS.filter((key) => supports(key) && FIELD_DEFS[key] && fieldVisible(key) && !CAPABILITY_KEYS.includes(key));
  const textEnabled = Boolean(cfg.textToImageEnabled);
  const imageEnabled = Boolean(cfg.imageToImageEnabled);
  const usesAsync = kind === "async-http" ? String(cfg.requestMode || entry.requestMode) === "async" : entry.requestMode === "async";
  const detailTweaks = detailKeys.filter((key) =>
    JSON.stringify(cfg[key] ?? null) !== JSON.stringify(defaultsForKind(entry)[key] ?? null)).length;
  const renderFields = (keys: string[]) => keys.map((key) => (
    <div key={key} style={{ marginTop: 10 }}>
      <ConfigField configKey={key} def={FIELD_DEFS[key]} value={cfg} onChange={update} />
    </div>
  ));

  const validate = (): string | null => {
    if (!item) {
      const nextId = id.trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{1,40}$/i.test(nextId)) return "平台标识只允许字母、数字和连字符，长度 2-41";
      if (platforms.some((platform) => platform.id === nextId)) return "平台标识已存在，请更换一个标识";
      if (!apiKey.trim() && !apiKeyEnv.trim()) return "请填写 API Key 或服务器环境变量名";
    }
    if (!name.trim()) return "请填写平台名称";
    if (!String(cfg.baseUrl || "").trim()) return "请填写接口地址";
    if (!textEnabled && !imageEnabled) return "请至少启用文生图或图生图之一";
    if (usesAsync && !String(cfg.queryEndpoint || "").trim()) return "异步接口需要填写查询任务地址";
    const rules = (cfg.resultUrlRewriteRules as Array<{ sourceHost: string; targetHost: string }>) || [];
    if (rules.some((rule) => !rule.sourceHost.trim() || !rule.targetHost.trim())) return "请完整填写结果图片的原始域名和加速域名";
    return null;
  };

  const save = async () => {
    const message = validate();
    if (message) { toast(message); setDetailsOpen(true); return; }
    const nextId = id.trim().toLowerCase();
    const nextConfig = { ...cfg, adapter: kind } as Record<string, unknown>;
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

  const operationCard = (operation: "text" | "image") => {
    const isText = operation === "text";
    const enabledKey = isText ? "textToImageEnabled" : "imageToImageEnabled";
    const on = Boolean(cfg[enabledKey]);
    const referenceKeys = capabilityKeys.filter((key) => ["imageInputMode", "imageInputField"].includes(key));
    const paramsKey = isText ? "requestParams" : "imageRequestParams";
    return (
      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <div className="lrow" style={{ cursor: "pointer", padding: 0 }} onClick={() => update(enabledKey, !on)}>
          <div className="lr-main">
            <div className="lr-t">{isText ? "文生图" : "图生图"}</div>
            <div className="lr-s">{isText ? "仅根据提示词生成图片" : "带参考图生成，需要平台支持编辑接口"}</div>
          </div>
          <input type="checkbox" checked={on} onChange={() => update(enabledKey, !on)} />
        </div>
        {on ? (
          <div style={{ marginTop: 10 }}>
            {!isText && referenceKeys.length ? <div style={{ marginTop: 0 }}>{renderFields(referenceKeys)}</div> : null}
            {!isText && !referenceKeys.length ? <div className="lr-s">该协议的参考图传输方式固定，无需配置。</div> : null}
            <div className="field-label" style={{ marginTop: 10 }}>{isText ? "文生图请求参数" : "图生图请求参数"}</div>
            <div className="lr-s" style={{ margin: "3px 0 8px" }}>按平台要求填写，如 model、quality；未填 model 时使用模型管理里的上游模型名。</div>
            <ParamEditor key={`${kind}-${operation}-params`} value={(cfg[paramsKey] as Record<string, string>) || {}} onChange={(next) => update(paramsKey, next)} />
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
      <label className="lrow" style={{ cursor: "pointer", marginTop: 10, padding: "4px 0" }}>
        <div className="lr-main"><div className="lr-t">启用该平台</div><div className="lr-s">停用后不参与模型降级链</div></div>
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
      </label>

      <div className="step-group" style={{ marginTop: 16 }}>接入</div>
      <label style={{ display: "block" }}>
        <span className="field-label">协议</span>
        <select className="input" value={kind} onChange={(event) => switchKind(event.target.value as EngineAdapterKind)}>
          {meta.adapters.map((adapter) => <option key={adapter.kind} value={adapter.kind}>{adapter.label}</option>)}
        </select>
      </label>
      <div className="lr-s" style={{ marginTop: 5 }}>{entry.description}</div>
      <div className="lr-s" style={{ marginTop: 3 }}>
        适用：{ADAPTER_PRESETS[kind].scene} · {entry.requestMode === "async" || kind === "async-http" ? "支持同步或异步轮询" : "同步返回"}
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
          <span>接口地址、请求参数与协议细节已填好，按需修改；API Key 需单独填写。</span>
        </div>
      ) : null}
      <label style={{ display: "block", marginTop: 12 }}>
        <span className="field-label">接口地址</span>
        <input
          className="input"
          value={String(cfg.baseUrl || "")}
          onChange={(event) => update("baseUrl", event.target.value)}
          placeholder={BASE_URL_PLACEHOLDER[kind]}
        />
      </label>
      <div className="lr-s" style={{ marginTop: 4 }}>{ADAPTER_PRESETS[kind].endpointHint}</div>

      <div className="step-group" style={{ marginTop: 16 }}>密钥</div>
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
        placeholder="或填写服务器环境变量名，如 AINB_IMAGE_API_KEY"
      />
      <div className="lr-s" style={{ marginTop: 4 }}>API Key 与环境变量名二选一；环境变量需已配置在服务器进程环境中。</div>

      <div className="step-group" style={{ marginTop: 16 }}>生成能力</div>
      {operationCard("text")}
      {operationCard("image")}
      {capabilityKeys.filter((key) => !["imageInputMode", "imageInputField", "requestParams", "imageRequestParams"].includes(key)).length ? (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <div className="lr-t">任务查询</div>
          <div className="lr-s" style={{ margin: "3px 0 6px" }}>异步平台提交任务后按此地址轮询取图，两个能力共用。</div>
          {renderFields(capabilityKeys.filter((key) => ["queryEndpoint", "statusEnabled"].includes(key)))}
        </div>
      ) : null}

      <div className="card" style={{ padding: 12, marginTop: 12 }}>
        <div className="lrow" style={{ cursor: "pointer", padding: 0 }} onClick={() => setDetailsOpen((current) => !current)}>
          <div className="lr-main">
            <div className="lr-t"><i className={detailsOpen ? "ri-arrow-down-s-line" : "ri-arrow-right-s-line"} /> 协议细节</div>
            <div className="lr-s">留空即使用协议默认值，大多数平台无需修改。</div>
          </div>
          {detailTweaks > 0 ? <Badge text={`已调整 ${detailTweaks} 项`} type="info" /> : <Badge text="全部默认值" type="muted" />}
        </div>
        {detailsOpen ? (
          <div style={{ marginTop: 4 }}>
            {renderFields(detailKeys)}
            {!detailKeys.length ? <div className="lr-s" style={{ marginTop: 8 }}>该协议没有需要额外配置的细节。</div> : null}
          </div>
        ) : null}
      </div>

      {item ? (
        <div style={{ marginTop: 14 }}>
          <button className="btn btn-ghost btn-block" type="button" disabled={testing} onClick={runTest}>
            <i className={testing ? "ri-loader-4-line" : "ri-pulse-line"} />{testing ? "测试中" : "测试已保存配置的连通性"}
          </button>
          <TestResultRow result={testResult} />
        </div>
      ) : null}

      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={back} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : item ? "保存修改" : "创建平台"}</button>
      </div>
    </>
  );
}

function findEntry(meta: EnginePlatformMeta, kind: EngineAdapterKind): EngineAdapterMeta {
  return meta.adapters.find((adapter) => adapter.kind === kind) as EngineAdapterMeta;
}

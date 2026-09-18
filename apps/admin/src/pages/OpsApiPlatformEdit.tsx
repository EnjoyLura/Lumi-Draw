import { useState, type ReactNode } from "react";
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
  BASE_URL_HELP,
  COMMON_PRESERVED_KEYS,
  ConfigField,
  FIELD_DEFS,
  FOOT_STYLE,
  GROUPS,
  MOCK_META,
  TestResultRow,
  defaultsForKind
} from "./opsApiShared";

/** 新增入口的 param 标记；编辑入口的 param 为平台标识。 */
export const NEW_PLATFORM_PARAM = "new";

type StepKey = "basic" | "endpoint" | "capability" | "advanced";

const STEPS: Array<{ key: StepKey; title: string }> = [
  { key: "basic", title: "基础信息" },
  { key: "endpoint", title: "接口与鉴权" },
  { key: "capability", title: "生成能力" },
  { key: "advanced", title: "高级选项" }
];

/** 各步骤展示的配置键；实际展示还会按协议可用字段过滤。 */
const STEP_KEYS: Record<Exclude<StepKey, "basic">, string[]> = {
  endpoint: ["requestMode", "baseUrl", "imageEndpoint", "queryEndpoint", "statusEnabled", "authMode", "authHeaderName", "authQueryName"],
  capability: ["textToImageEnabled", "imageToImageEnabled", "imageInputMode", "imageInputField", "sizeMode", "pixelSizeField", "ratioField", "resolutionField"],
  advanced: ["requestParams", "imageRequestParams", "requestHeaders", "queryHeaders", "injectModel", "injectCount", "requestTemplate", "imageRequestTemplate", "responseMapping", "resultUrlRewriteRules"]
};

/** 所有协议通用、不依赖适配器可选字段清单的配置键。 */
const ALWAYS_VISIBLE_KEYS = ["textToImageEnabled", "imageToImageEnabled", "resultUrlRewriteRules"];

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

function PlatformEditor({ item, platforms, meta, useMock }: {
  item?: EnginePlatform;
  platforms: EnginePlatform[];
  meta: EnginePlatformMeta;
  useMock: boolean;
}) {
  const { back, toast } = useNav();
  const [step, setStep] = useState<StepKey>("basic");
  const [id, setId] = useState(item?.id || "");
  const [name, setName] = useState(item?.name || "");
  const [groupName, setGroupName] = useState(item?.groupName || "");
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyEnv, setApiKeyEnv] = useState(item?.apiKeyEnv || "");
  const [kind, setKind] = useState<EngineAdapterKind>(item?.adapter || "openai-images");
  const [cfg, setCfg] = useState<Record<string, unknown>>(() => {
    if (item) return { ...item.config } as Record<string, unknown>;
    const entry = meta.adapters.find((adapter) => adapter.kind === kind) as EngineAdapterMeta;
    return defaultsForKind(entry);
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EngineTestResult | null>(null);

  const entry = meta.adapters.find((adapter) => adapter.kind === kind) as EngineAdapterMeta;
  const stepIndex = STEPS.findIndex((entryStep) => entryStep.key === step);
  const baseUrlHelp = BASE_URL_HELP[kind];
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
  const adapterKeys = [
    ...(kind === "async-http" ? ["requestMode"] : []),
    ...ALWAYS_VISIBLE_KEYS,
    ...[...new Set([...entry.requiredFields, ...entry.optionalFields])].filter((key) => FIELD_DEFS[key])
  ];
  const keysForStep = (stepKey: Exclude<StepKey, "basic">) => STEP_KEYS[stepKey].filter((key) => adapterKeys.includes(key) && fieldVisible(key));
  const renderKeys = (keys: string[]): ReactNode => {
    let lastGroup = "";
    return keys.map((key) => {
      const def = FIELD_DEFS[key];
      const heading = def.group !== lastGroup ? GROUPS.find(([group]) => group === def.group)?.[1] : undefined;
      lastGroup = def.group;
      return (
        <div key={key} style={{ marginTop: heading ? 14 : 10 }}>
          {heading ? <div className="step-group">{heading}</div> : null}
          <ConfigField
            configKey={key}
            def={def}
            value={cfg}
            baseUrlPlaceholder={baseUrlHelp.placeholder}
            baseUrlHelp={baseUrlHelp.help}
            onChange={update}
          />
        </div>
      );
    });
  };
  const advancedTweaks = keysForStep("advanced").filter((key) =>
    JSON.stringify(cfg[key] ?? null) !== JSON.stringify(defaultsForKind(entry)[key] ?? null)).length;

  const validateStep = (stepKey: StepKey): string | null => {
    if (stepKey === "basic") {
      if (!item) {
        const nextId = id.trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9-]{1,40}$/i.test(nextId)) return "平台标识只允许字母、数字和连字符，长度 2-41";
        if (platforms.some((platform) => platform.id === nextId)) return "平台标识已存在，请更换一个标识";
      }
      if (!name.trim()) return "请填写平台名称";
      return null;
    }
    if (stepKey === "endpoint") {
      if (!String(cfg.baseUrl || "").trim()) return "请填写提交接口 URL";
      if (kind === "async-http" && String(cfg.requestMode || entry.requestMode) === "async" && !String(cfg.queryEndpoint || "").trim()) {
        return "异步接口需要配置查询任务 URL";
      }
      if (!item && !apiKey.trim() && !apiKeyEnv.trim()) return "请填写 API Key 或环境变量名";
      return null;
    }
    const rules = (cfg.resultUrlRewriteRules as Array<{ sourceHost: string; targetHost: string }>) || [];
    if (rules.some((rule) => !rule.sourceHost.trim() || !rule.targetHost.trim())) {
      return "请完整填写结果图片的原始域名和加速域名";
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
          id: item?.id || nextId,
          name: name.trim(),
          groupName: groupName.trim(),
          enabled,
          sort: item?.sort ?? (platforms.reduce((max, platform) => Math.max(max, platform.sort), 0) + 10),
          adapter: kind,
          requestMode: String(cfg.requestMode || entry.requestMode) as "sync" | "async",
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

          <div className="step-group" style={{ marginTop: 16 }}>接口协议</div>
          <select className="input" value={kind} onChange={(event) => switchKind(event.target.value as EngineAdapterKind)}>
            {meta.adapters.map((adapter) => <option key={adapter.kind} value={adapter.kind}>{adapter.label}</option>)}
          </select>
          <div className="lr-s" style={{ marginTop: 5 }}>{entry.description}</div>
          <div className="lr-s" style={{ marginTop: 3, color: "var(--fg-muted)" }}>
            适用：{ADAPTER_PRESETS[kind].scene} · {entry.requestMode === "async" ? "异步轮询" : "同步返回"}
          </div>

          <label className="lrow" style={{ cursor: "pointer", marginTop: 14, padding: "4px 0" }}>
            <div className="lr-main"><div className="lr-t">启用该平台</div><div className="lr-s">停用后不参与模型降级链</div></div>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          </label>
        </>
      ) : null}

      {step === "endpoint" ? (
        <>
          {renderKeys(keysForStep("endpoint").filter((key) => FIELD_DEFS[key].group === "endpoint"))}
          <div className="step-group" style={{ marginTop: 16 }}>鉴权密钥</div>
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
          {renderKeys(keysForStep("endpoint").filter((key) => FIELD_DEFS[key].group === "auth"))}
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

      {step === "capability" ? (
        <>
          {renderKeys(keysForStep("capability").filter((key) => FIELD_DEFS[key].group === "capability"))}
          {renderKeys(keysForStep("capability").filter((key) => FIELD_DEFS[key].group === "reference"))}
          {renderKeys(keysForStep("capability").filter((key) => FIELD_DEFS[key].group === "size"))}
        </>
      ) : null}

      {step === "advanced" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className="lr-s">留空即使用协议默认值，大多数平台无需修改。</span>
            {advancedTweaks > 0 ? <Badge text={`已调整 ${advancedTweaks} 项`} type="info" /> : <Badge text="全部默认值" type="muted" />}
          </div>
          {renderKeys(keysForStep("advanced").filter((key) => FIELD_DEFS[key].group === "params"))}
          {renderKeys(keysForStep("advanced").filter((key) => FIELD_DEFS[key].group === "template"))}
          {renderKeys(keysForStep("advanced").filter((key) => FIELD_DEFS[key].group === "mapping"))}
          {renderKeys(keysForStep("advanced").filter((key) => FIELD_DEFS[key].group === "result"))}
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
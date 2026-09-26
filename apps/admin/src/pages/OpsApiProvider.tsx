import { useEffect, useRef, useState } from "react";
import {
  deleteEnginePlatform,
  duplicateEnginePlatform,
  fetchEngineDryRun,
  fetchEngineHealth,
  fetchEngineMeta,
  fetchEnginePlatforms,
  isDryRunTerminal,
  moveEnginePlatform,
  startEngineDryRun,
  testEnginePlatform,
  updateEnginePlatform,
  type EngineDryRunView,
  type EnginePlatform
} from "../data/engineApi";
import { useAdminSession } from "../data/adminSession";
import { ENGINE_PLATFORMS, IMG } from "../data/mock";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge, Chips, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";
import { FOOT_STYLE, MOCK_META, nextCopyId } from "./opsApiShared";
import { NEW_PLATFORM_PARAM } from "./OpsApiPlatformEdit";

const DRY_RUN_STEPS = ["提交任务", "上游生成", "转存 OSS", "生成结果"] as const;

function stepState(view: EngineDryRunView | null, step: number): "wait" | "active" | "done" | "fail" {
  if (!view) return step === 0 ? "active" : "wait";
  const failed = ["failed", "cancelled"].includes(view.status);
  const attempt = view.attempts[view.attempts.length - 1];
  const asset = view.assets[0];
  if (step === 0) {
    if (attempt) return "done";
    return failed ? "fail" : "active";
  }
  if (step === 1) {
    if (asset || view.status === "settling" || ["succeeded", "partial_failed"].includes(view.status)) return "done";
    if (failed || attempt?.state === "failed") return "fail";
    return attempt ? "active" : "wait";
  }
  if (step === 2) {
    if (asset?.status === "stored") return "done";
    if (asset?.status === "failed") return "fail";
    if (asset || view.status === "settling") return "active";
    return failed ? "fail" : "wait";
  }
  if (["succeeded", "partial_failed"].includes(view.status)) return "done";
  if (failed) return "fail";
  return "wait";
}

function stepDetail(view: EngineDryRunView | null, step: number): string {
  if (!view) return step === 0 ? "正在创建试运行任务…" : "";
  const attempt = view.attempts[view.attempts.length - 1];
  const asset = view.assets[0];
  if (step === 0) {
    if (attempt) return `已提交（${attempt.adapter}）`;
    return view.stageText || "正在创建试运行任务…";
  }
  if (step === 1) {
    if (attempt?.state === "failed") return `${attempt.errorKind || "error"}：${attempt.errorMessage || "上游调用失败"}`;
    if (attempt?.latencyMs != null && (asset || view.status === "settling" || ["succeeded", "partial_failed"].includes(view.status))) return `上游耗时 ${(attempt.latencyMs / 1000).toFixed(1)}s`;
    if (view.attempts.length > 1) return `已自动切换线路（第 ${view.attempts.length} 次尝试）`;
    return attempt ? view.stageText || "上游生成中…" : "";
  }
  if (step === 2) {
    if (asset?.status === "stored") {
      const parts = [
        asset.transferTtfbMs != null ? `建连 ${asset.transferTtfbMs}ms` : "",
        asset.transferDownloadMs != null ? `下载 ${asset.transferDownloadMs}ms` : "",
        asset.transferUploadMs != null ? `上传 ${asset.transferUploadMs}ms` : "",
        asset.sizeBytes ? `${(asset.sizeBytes / 1024).toFixed(0)}KB` : ""
      ].filter(Boolean);
      return parts.length ? parts.join(" · ") : "已保存到私有 OSS";
    }
    if (asset?.status === "failed") return asset.errorMessage || "转存失败";
    if (asset || view.status === "settling") return "FC 正在下载原图并直存 OSS（不占服务器带宽）…";
    return "";
  }
  if (["succeeded", "partial_failed"].includes(view.status)) return asset?.imageUrl ? "CDN 图片可访问" : "任务完成";
  if (["failed", "cancelled"].includes(view.status)) return view.failure?.message || view.stageText || "试运行失败";
  return "";
}

function StepIcon({ state }: { state: "wait" | "active" | "done" | "fail" }) {
  const icon = state === "done" ? "ri-check-line" : state === "fail" ? "ri-close-line" : state === "active" ? "ri-loader-4-line" : "ri-more-line";
  const color = state === "done" ? "var(--success)" : state === "fail" ? "var(--danger)" : state === "active" ? "var(--accent-deep, #5B9FE8)" : "var(--fg-muted)";
  return (
    <span style={{
      width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0,
      border: `1.5px solid ${state === "wait" ? "var(--border)" : color}`, color,
      background: state === "wait" ? "var(--bg-soft)" : "transparent"
    }}>
      <i className={icon} style={state === "active" ? { animation: "spin 1s linear infinite" } : undefined} />
    </span>
  );
}

function mockDryRunView(platform: EnginePlatform, mode: "text-to-image" | "image-to-image"): EngineDryRunView {
  const now = new Date().toISOString();
  return {
    jobId: `mock-dry-${platform.id}`,
    providerId: platform.id,
    operation: mode,
    status: "succeeded",
    progress: 100,
    stageText: "生成完成（模拟）",
    prompt: "一只戴着宇航头盔的橘猫漂浮在星空里",
    createdAt: now,
    startedAt: now,
    finishedAt: now,
    attempts: [{ index: 1, adapter: platform.adapter, state: "succeeded", latencyMs: 8600, startedAt: now, finishedAt: now }],
    assets: [{ index: 1, status: "stored", width: 1024, height: 1024, sizeBytes: 1024 * 1024, transferDownloadMs: 1200, transferUploadMs: 320, imageUrl: IMG("work1"), cardUrl: IMG("work1") }]
  };
}

function DryRunPanel({ platform, useMock }: { platform: EnginePlatform; useMock: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"text-to-image" | "image-to-image">("text-to-image");
  const [view, setView] = useState<EngineDryRunView | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const supportsImageToImage = platform.config.imageToImageEnabled;

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const poll = (jobId: string, startedAt: number) => {
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const next = await fetchEngineDryRun(jobId);
          setView(next);
          if (isDryRunTerminal(next.status)) return;
        } catch {
          // 查询失败不等于试运行失败，继续轮询。
        }
        if (Date.now() - startedAt > 5 * 60_000) {
          setError("试运行超过 5 分钟未结束，请稍后在平台健康度中确认结果");
          return;
        }
        poll(jobId, startedAt);
      })();
    }, 2000);
  };

  const start = async () => {
    if (starting) return;
    setStarting(true);
    setError("");
    setView(null);
    try {
      if (useMock) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setView(mockDryRunView(platform, mode));
        return;
      }
      const started = await startEngineDryRun(platform.id, { prompt: prompt.trim() || undefined, mode });
      setView(null);
      poll(started.jobId, Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "试运行启动失败");
    } finally {
      setStarting(false);
    }
  };

  const asset = view?.assets[0];
  const running = Boolean(view && !isDryRunTerminal(view.status));
  return (
    <>
      <div className="card" style={{ padding: 10, marginBottom: 12, background: "var(--info-soft)" }}>
        <div className="lr-t">全链路试运行「{platform.name}」</div>
        <div className="lr-s" style={{ marginTop: 3 }}>
          {mode === "image-to-image"
            ? "用最近一次成功试运行的产物作参考图，真实走一次图生图全链路（上游 → FC 直存/转存 → OSS → CDN）。会消耗该平台少量余额，不扣用户积分、不产生作品。"
            : "真实调用上游生成 1 张 1K 测试图，并走完 FC 转存/直存 → OSS → CDN 全链路。会消耗该平台少量余额，不扣用户积分、不产生作品。"}
        </div>
      </div>
      {supportsImageToImage ? (
        <div className="seg">
          <div className={`seg-i${mode === "text-to-image" ? " active" : ""}`} onClick={() => { if (!running) setMode("text-to-image"); }}>文生图</div>
          <div className={`seg-i${mode === "image-to-image" ? " active" : ""}`} onClick={() => { if (!running) setMode("image-to-image"); }}>图生图</div>
        </div>
      ) : null}
      <label className="field-label">测试提示词（可选）</label>
      <input className="input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="留空使用默认测试提示词" maxLength={200} />
      <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} disabled={starting || running} onClick={start}>
        <i className={starting || running ? "ri-loader-4-line" : "ri-play-line"} style={starting || running ? { animation: "spin 1s linear infinite" } : undefined} />
        {running ? "试运行进行中…" : starting ? "正在启动…" : "开始试运行"}
      </button>
      {error ? <div className="lr-s" style={{ marginTop: 8, color: "var(--danger)" }}>{error}</div> : null}

      {view || starting ? (
        <div style={{ marginTop: 16 }}>
          {DRY_RUN_STEPS.map((label, step) => {
            const state = starting && !view ? (step === 0 ? "active" : "wait") : stepState(view, step);
            const detail = stepDetail(view, step);
            return (
              <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0" }}>
                <StepIcon state={state} />
                <div className="lr-main">
                  <div className="lr-t" style={{ fontSize: 13 }}>{label}</div>
                  {detail ? (
                    <div className="lr-s" style={{ marginTop: 2, color: state === "fail" ? "var(--danger)" : undefined, wordBreak: "break-all" }}>{detail}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {asset?.status === "stored" && asset.imageUrl ? (
        <div className="card" style={{ padding: 10, marginTop: 12, textAlign: "center" }}>
          <img src={asset.imageUrl} alt="试运行结果" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10 }} />
          <div className="lr-s" style={{ marginTop: 8 }}>
            {asset.width ? `${asset.width}×${asset.height} · ` : ""}{asset.sizeBytes ? `${(asset.sizeBytes / 1024).toFixed(0)}KB · ` : ""}已存入私有 OSS 并可经 CDN 访问
          </div>
        </div>
      ) : null}

      {view && isDryRunTerminal(view.status) ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
          <Badge
            text={view.status === "succeeded" ? "试运行通过" : view.status === "partial_failed" ? "部分成功" : "试运行失败"}
            type={view.status === "succeeded" ? "success" : view.status === "partial_failed" ? "warning" : "danger"}
          />
          {view.finishedAt && view.createdAt ? (
            <span className="lr-s">总耗时 {((new Date(view.finishedAt).getTime() - new Date(view.createdAt).getTime()) / 1000).toFixed(1)}s</span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// ---------------- 表单 ----------------

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
        <div className="lr-main"><div className="lr-t">创建后立即启用</div><div className="lr-s">建议先试运行通过，再加入模型降级链</div></div>
      </label>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "复制中" : "创建副本"}</button>
      </div>
    </>
  );
}

// ---------------- 列表 ----------------

function healthRate(health?: { total: number; succeeded: number; failed: number }): number | null {
  if (!health || health.total <= 0) return null;
  return Math.round((health.succeeded / health.total) * 1000) / 10;
}

function rateColor(rate: number | null): string {
  if (rate === null) return "var(--fg-muted)";
  if (rate >= 95) return "var(--success)";
  if (rate >= 80) return "#B7791F";
  return "var(--danger)";
}

export function OpsApiProvider() {
  const { useMock } = useAdminSession();
  const { go, openSheet, toast, confirmDlg } = useNav();
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
  const transferMissing = !useMock && healthState.data ? healthState.data.imageTransferConfigured === false : false;
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
    go("opsApiPlatformEdit", platform ? platform.id : NEW_PLATFORM_PARAM);
  };

  const openCreate = () => {
    go("opsApiPlatformEdit", NEW_PLATFORM_PARAM);
  };
  const copyPlatform = (platform: EnginePlatform) => openSheet("快速创建 API 副本", <DuplicatePlatformForm source={platform} platforms={platforms} useMock={useMock} onSaved={reload} />);
  const openDryRun = (platform: EnginePlatform) => openSheet("全链路试运行", <DryRunPanel platform={platform} useMock={useMock} />);

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
      <AddBtn text="新增 API 平台" onClick={openCreate} />
      {transferMissing ? (
        <div className="card" style={{ padding: 10, marginBottom: 10, background: "var(--warning-soft, #FEF3C7)", border: "1px solid rgba(183,121,31,.3)" }}>
          <div className="lr-t" style={{ color: "#B7791F" }}><i className="ri-alarm-warning-line" /> 图片转存函数（FC）未配置</div>
          <div className="lr-s" style={{ marginTop: 3 }}>
            生成图片将由 API 服务器进程内下载转存，占用服务器带宽且速度慢。请尽快配置 IMAGE_TRANSFER_FUNCTION_URL / IMAGE_TRANSFER_BEARER_TOKEN。
          </div>
        </div>
      ) : null}
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
        const rate = healthRate(platform.health);
        return (
          <div key={platform.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                title={rate === null ? "近 7 天无调用" : `近 7 天成功率 ${rate}%`}
                style={{ width: 10, height: 10, borderRadius: "50%", background: platform.enabled ? rateColor(rate) : "var(--fg-muted)", flexShrink: 0, opacity: platform.enabled ? 1 : 0.4 }}
              />
              <div className="lr-main" style={{ minWidth: 0 }}>
                <div className="lr-t" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {platform.name}
                  <Badge text={adapterLabel(platform.adapter)} type="purple" />
                  {!platform.enabled ? <Badge text="已停用" type="muted" /> : null}
                  {platform.health?.degraded
                    ? <Badge text={`已降级·连续失败${platform.health.consecutiveFailures ?? ""}`} type="danger" />
                    : null}
                  {platform.apiKeyHint || platform.apiKeyEnv
                    ? null
                    : <Badge text="密钥未配置" type="danger" />}
                </div>
                <div className="lr-s" style={{ marginTop: 3, wordBreak: "break-all" }}>{platform.config.baseUrl}</div>
              </div>
              <Switch on={platform.enabled} onToggle={() => toggle(platform)} />
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              {platform.groupName ? <Badge text={platform.groupName} type="info" /> : null}
              {platform.config.textToImageEnabled ? <Badge text="文生图" type="success" /> : null}
              {platform.config.imageToImageEnabled ? <Badge text="图生图" type="info" /> : null}
              <Badge text={platform.requestMode === "async" ? "异步轮询" : "同步返回"} type="muted" />
              {platform.linkedModelIds?.length
                ? <Badge text={`关联 ${platform.linkedModelIds.length} 个模型`} type="info" />
                : <Badge text="未关联模型" type="muted" />}
              <span className="lr-s" style={{ marginLeft: "auto" }}>
                {rate === null
                  ? "近7天无调用"
                  : <span style={{ color: rateColor(rate), fontWeight: 700 }}>近7天 {rate}% · {platform.health?.total ?? 0} 次{platform.health?.failed ? ` · ${platform.health.failed} 失败` : ""}</span>}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{platform.id}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 12 }} type="button" onClick={() => openDryRun(platform)}>
                  <i className="ri-play-circle-line" /> 试运行
                </button>
                <span className="nav-btn" title="测试连通性" aria-label="测试连通性" style={{ width: 32, height: 32, fontSize: 17, color: "var(--fg-2)" }} onClick={() => void testFromList(platform)}><i className="ri-pulse-line" /></span>
                <button className="nav-btn" type="button" aria-label="提高优先级" onClick={() => movePlatform(platform, "up")}><i className="ri-arrow-up-line" /></button>
                <button className="nav-btn" type="button" aria-label="降低优先级" onClick={() => movePlatform(platform, "down")}><i className="ri-arrow-down-line" /></button>
                <CtrlIcons onCopy={() => copyPlatform(platform)} onEdit={() => openForm(platform)} onDelete={() => remove(platform)} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

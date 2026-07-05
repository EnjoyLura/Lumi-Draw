import { useEffect, useState } from "react";
import { apiGetReviewSettings, apiSaveReviewSettings, type AdminReviewSettings } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Sec, Switch } from "../ui";

const HINT: React.CSSProperties = { fontSize: 12, color: "var(--fg-muted)", margin: "8px 2px 0", lineHeight: 1.5 };

export function SetAudit() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminReviewSettings>(useMock ? null : () => apiGetReviewSettings(), [useMock]);
  const [textSec, setTextSec] = useState(true);
  const [imageSec, setImageSec] = useState(true);
  const [manual, setManual] = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setTextSec(data.wxTextSecCheckEnabled);
      setImageSec(data.wxImageSecCheckEnabled);
      setManual(data.manualReviewEnabled);
      setAutoPublish(data.autoPublishAfterPass);
    }
  }, [data, useMock]);

  const save = async () => {
    setSaving(true);
    try {
      if (!useMock) {
        await apiSaveReviewSettings({
          wxTextSecCheckEnabled: textSec,
          wxImageSecCheckEnabled: imageSec,
          manualReviewEnabled: manual,
          autoPublishAfterPass: autoPublish
        });
        reload();
      }
      toast("已保存审核设置");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载审核设置中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <Sec title="微信内容安全" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>开启文本审核</span><Switch on={textSec} onToggle={() => setTextSec(!textSec)} /></div>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>开启图片审核</span><Switch on={imageSec} onToggle={() => setImageSec(!imageSec)} /></div>
      </div>
      <div style={HINT}>开启后提交内容会调用微信安全接口，命中风险时进入人工处理。</div>
      <Sec title="人工审核" />
      <div className="card" style={{ padding: "2px 14px" }}>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>开启人工审核</span><Switch on={manual} onToggle={() => setManual(!manual)} /></div>
        <div className="kv"><span className="k" style={{ fontWeight: 600, color: "var(--fg-2)" }}>通过后自动发布</span><Switch on={autoPublish} onToggle={() => setAutoPublish(!autoPublish)} /></div>
      </div>
      <div style={HINT}>关闭人工审核后，仅保留自动审核结果；开启自动发布后审核通过的作品会直接进入公开状态。</div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存设置"}</button></div>
    </>
  );
}

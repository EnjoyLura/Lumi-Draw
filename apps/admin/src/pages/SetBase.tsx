import { useEffect, useState } from "react";
import { apiGetCreditsConfig, apiSaveCreditsConfig, type AdminCreditsConfig } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";

export function SetBase() {
  const { toast } = useNav();
  const { useMock } = useAdminSession();
  const { data, loading, error, reload } = useAsyncData<AdminCreditsConfig>(useMock ? null : () => apiGetCreditsConfig(), [useMock]);
  const [signup, setSignup] = useState("100");
  const [publish, setPublish] = useState("50");
  const [fav, setFav] = useState("5");
  const [invite, setInvite] = useState("50");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!useMock && data) {
      setSignup(String(data.registerGift));
      setPublish(String(data.publishReward));
      setFav(String(data.favoriteReward));
      setInvite(String(data.inviteReward));
    }
  }, [data, useMock]);

  const save = async () => {
    setSaving(true);
    try {
      if (!useMock) {
        await apiSaveCreditsConfig({
          registerGift: parseInt(signup) || 0,
          publishReward: parseInt(publish) || 0,
          favoriteReward: parseInt(fav) || 0,
          inviteReward: parseInt(invite) || 0
        });
        reload();
      }
      toast("已保存积分基础配置");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载积分配置中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      <div className="card" style={{ padding: 14 }}>
        <label className="field-label">新用户赠送积分</label>
        <input className="input" type="number" value={signup} onChange={(e) => setSignup(e.target.value)} />
        <label className="field-label" style={{ marginTop: 12 }}>发布作品奖励积分</label>
        <input className="input" type="number" value={publish} onChange={(e) => setPublish(e.target.value)} />
        <label className="field-label" style={{ marginTop: 12 }}>作品被收藏奖励积分</label>
        <input className="input" type="number" value={fav} onChange={(e) => setFav(e.target.value)} />
        <label className="field-label" style={{ marginTop: 12 }}>邀请好友奖励积分</label>
        <input className="input" type="number" value={invite} onChange={(e) => setInvite(e.target.value)} />
      </div>
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存配置"}</button></div>
    </>
  );
}

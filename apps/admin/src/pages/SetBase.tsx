import { useState } from "react";
import { useNav } from "../shell/NavContext";

export function SetBase() {
  const { toast } = useNav();
  const [signup, setSignup] = useState("100");
  const [publish, setPublish] = useState("50");
  const [fav, setFav] = useState("5");
  const [invite, setInvite] = useState("50");

  return (
    <>
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
      <div className="actionbar"><button className="btn btn-primary btn-block" onClick={() => toast("已保存积分基础配置")}>保存配置</button></div>
    </>
  );
}

import { useState } from "react";
import {
  apiAdjustUserCredits,
  apiBanUser,
  apiGetMemberPlans,
  apiGetUserDetail,
  apiGiftUserMember,
  apiUnbanUser,
  apiUpdateUser,
  type AdminUserDetailData
} from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { MEMBER_PLANS, USERS, type AdminUser } from "../data/mock";
import { getUser, getUserWorks } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { Avatar, Badge, Seg, StatCard, StatusBadge, WorkCard } from "../ui";

const TABS: Array<[string, string]> = [
  ["info", "资料"],
  ["credit", "积分明细"],
  ["recharge", "充值"],
  ["spend", "消费"],
  ["works", "作品"]
];

const CREDIT_LOG: Array<[string, string, string]> = [
  ["每日签到", "+10", "今天"],
  ["生成消费", "-15", "昨天"],
  ["充值到账", "+680", "06-18"],
  ["邀请奖励", "+50", "06-15"]
];
const RECHARGE_LOG: Array<[string, string]> = [
  ["¥68 → 680积分", "06-18 成功"],
  ["¥18 → 180积分", "06-15 成功"],
  ["¥168 年卡", "06-11 成功"]
];
const SPEND_LOG: Array<[string, string, string]> = [
  ["生成「霓虹都市」", "-15", "06-18"],
  ["生成「山水之间」", "-8", "06-17"],
  ["生成「古风少女」", "-20", "06-14"]
];

const FOOT_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 10,
  margin: "12px -18px 0",
  padding: "12px 18px 0",
  borderTop: "1px solid var(--border)"
};

function mockUserDetail(id: number): AdminUserDetailData {
  const user = getUser(id);
  return { ...user, recentWorks: getUserWorks(user.id) };
}

function EditUserForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [gender, setGender] = useState(user.gender || "男");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast("请输入昵称");
      return;
    }
    setSaving(true);
    try {
      if (useMock) {
        user.name = name.trim();
        user.bio = bio;
        user.gender = gender;
      } else {
        await apiUpdateUser(user.id, { name: name.trim(), bio, gender });
      }
      closeSheet();
      onDone();
      toast("已保存");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">昵称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>个人简介</label>
      <input className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="个人简介" />
      <label className="field-label" style={{ marginTop: 12 }}>性别</label>
      <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
        <option>男</option>
        <option>女</option>
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>积分</label>
      <input className="input" value={user.credits} disabled style={{ opacity: 0.6 }} />
      <label className="field-label" style={{ marginTop: 12 }}>内部备注</label>
      <textarea className="input" rows={2} placeholder="内部备注" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

function AdjustCreditsForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [op, setOp] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast("请输入有效积分数量");
      return;
    }
    const signedAmount = op === "sub" ? -num : num;
    setSaving(true);
    try {
      if (useMock) {
        user.credits += signedAmount;
      } else {
        await apiAdjustUserCredits(user.id, signedAmount, reason.trim() || "人工调整");
      }
      closeSheet();
      onDone();
      toast("积分已调整");
    } catch (e) {
      toast(e instanceof Error ? e.message : "调整失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">操作类型</label>
      <Seg items={[["add", "增加"], ["sub", "扣减"]]} active={op} onPick={setOp} />
      <label className="field-label" style={{ marginTop: 12 }}>数量</label>
      <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="请输入积分数量" />
      <label className="field-label" style={{ marginTop: 12 }}>原因</label>
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：活动补偿" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>确定</button>
      </div>
    </>
  );
}

function GiftMemberForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const { data, loading } = useAsyncData(useMock ? null : () => apiGetMemberPlans(), [useMock]);
  const plans = useMock ? MEMBER_PLANS : data ?? [];
  const [planId, setPlanId] = useState(() => String((plans[0] ?? MEMBER_PLANS[0])?.id ?? ""));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPlan = plans.find((plan) => plan.id === Number(planId));
  const submit = async () => {
    if (!selectedPlan) {
      toast("请选择会员方案");
      return;
    }
    setSaving(true);
    try {
      if (useMock) {
        user.member = selectedPlan.name;
        user.credits += selectedPlan.gift;
      } else {
        await apiGiftUserMember(user.id, selectedPlan.id, reason.trim() || "后台赠送会员");
      }
      closeSheet();
      onDone();
      toast("会员已赠送");
    } catch (e) {
      toast(e instanceof Error ? e.message : "赠送失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">会员方案</label>
      <select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={loading || saving}>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name}（¥{p.price}）</option>)}
      </select>
      {loading ? <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 8 }}>加载会员方案中...</div> : null}
      <label className="field-label" style={{ marginTop: 12 }}>赠送原因</label>
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：新用户福利" disabled={saving} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving || loading || !plans.length}>{saving ? "赠送中" : "确定"}</button>
      </div>
    </>
  );
}

function BanUserForm({ user, useMock, onDone }: { user: AdminUser; useMock: boolean; onDone: () => void }) {
  const { closeSheet, toast } = useNav();
  const [saving, setSaving] = useState(false);

  const doBan = async () => {
    setSaving(true);
    try {
      if (useMock) {
        user.status = "封禁";
        user.active = false;
      } else {
        await apiBanUser(user.id);
      }
      closeSheet();
      onDone();
      toast("已封禁用户");
    } catch (e) {
      toast(e instanceof Error ? e.message : "封禁失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">封禁原因</label>
      <select className="input">
        <option>发布违规内容</option>
        <option>恶意刷量</option>
        <option>侵权盗版</option>
        <option>其他</option>
      </select>
      <label className="field-label" style={{ marginTop: 12 }}>封禁时长</label>
      <select className="input">
        <option>3天</option>
        <option>7天</option>
        <option>30天</option>
        <option>永久</option>
      </select>
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-danger btn-block" onClick={doBan} disabled={saving}>确认封禁</button>
      </div>
    </>
  );
}

export function UserDetail({ param }: { param?: string }) {
  const { openSheet, confirmDlg, toast } = useNav();
  const { useMock } = useAdminSession();
  const [tab, setTab] = useState("info");
  const userId = Number(param ?? 0);
  const { data, loading, error, reload } = useAsyncData(useMock ? null : () => apiGetUserDetail(userId), [useMock, userId]);
  const u = useMock ? mockUserDetail(userId) : data;
  const works = useMock ? getUserWorks(u?.id ?? 0) : u?.recentWorks ?? [];
  const onDone = () => {
    if (!useMock) reload();
  };

  if (loading) return <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载用户中</div></div>;
  if (error) return <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div>;
  if (!u) return <div className="empty"><i className="ri-user-line" /><div className="et">用户不存在</div></div>;

  const ban = u.status === "封禁";

  const unban = () => confirmDlg("解封用户", "确定解除对该用户的封禁吗？", async () => {
    try {
      if (useMock) {
        const target = USERS.find((x) => x.id === u.id);
        if (target) target.status = "正常";
      } else {
        await apiUnbanUser(u.id);
        reload();
      }
      toast("已解封");
    } catch (e) {
      toast(e instanceof Error ? e.message : "解封失败");
    }
  });

  return (
    <>
      <div className="card" style={{ padding: 16, textAlign: "center" }}>
        <Avatar a={u.avatar} color={u.color} size={64} />
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10 }}>
          {u.name} <i className={`ri-${u.gender === "女" ? "women" : "men"}-line`} style={{ fontSize: 14, color: u.gender === "女" ? "#FFA8B8" : "#5B9FE8" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4 }}>{u.bio || "这个人很懒，什么都没留下"}</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>ID {u.id} · {u.phone}</div>
        <div style={{ marginTop: 8 }}>
          <StatusBadge s={u.status} /> {u.member !== "无" ? <Badge text={`${u.member}会员`} type="warning" /> : <Badge text="普通用户" type="muted" />}
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 12 }}>
        <StatCard label="积分余额" val={u.credits} icon="ri-copper-coin-line" color="#F59E0B" soft="var(--warning-soft)" />
        <StatCard label="作品数" val={u.works} icon="ri-image-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="粉丝数" val={u.followers} icon="ri-user-heart-line" color="#FFA8B8" soft="var(--danger-soft)" />
        <StatCard label="获赞数" val={u.likes} icon="ri-heart-3-line" color="#EF4444" soft="var(--danger-soft)" />
      </div>

      <div style={{ marginTop: 14 }}>
        <Seg items={TABS} active={tab} onPick={setTab} small />
      </div>

      {tab === "works" ? (
        <div className="wgrid" style={{ marginTop: 10 }}>
          {works.length === 0 ? (
            <div className="empty" style={{ gridColumn: "1/-1" }}><i className="ri-image-line" /><div className="et">该用户暂无作品</div></div>
          ) : (
            works.map((w) => <WorkCard key={w.id} w={w} />)
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: "2px 14px" }}>
          {tab === "info" && (
            <>
              <div className="kv"><span className="k">个人简介</span><span className="v">{u.bio || "—"}</span></div>
              <div className="kv"><span className="k">性别</span><span className="v">{u.gender || "未设置"}</span></div>
              <div className="kv"><span className="k">粉丝 / 关注</span><span className="v">{u.followers} / {u.following}</span></div>
              <div className="kv"><span className="k">获赞总数</span><span className="v">{u.likes}</span></div>
              <div className="kv"><span className="k">注册时间</span><span className="v">{u.reg}</span></div>
              <div className="kv"><span className="k">手机号</span><span className="v">{u.phone}</span></div>
              <div className="kv"><span className="k">会员状态</span><span className="v">{u.member === "无" ? "未开通" : u.member}</span></div>
              <div className="kv"><span className="k">最近活跃</span><span className="v">{u.active ? "今天" : "7天前"}</span></div>
            </>
          )}
          {tab === "credit" && CREDIT_LOG.map((r, i) => (
            <div key={i} className="kv"><span className="k">{r[0]} · {r[2]}</span><span className="v" style={{ color: r[1][0] === "+" ? "var(--success)" : "var(--danger)" }}>{r[1]}</span></div>
          ))}
          {tab === "recharge" && RECHARGE_LOG.map((r, i) => (
            <div key={i} className="kv"><span className="k">{r[1]}</span><span className="v">{r[0]}</span></div>
          ))}
          {tab === "spend" && SPEND_LOG.map((r, i) => (
            <div key={i} className="kv"><span className="k">{r[0]} · {r[2]}</span><span className="v" style={{ color: "var(--danger)" }}>{r[1]}积分</span></div>
          ))}
        </div>
      )}

      <div className="actionbar">
        <button className="btn btn-ghost btn-sm" onClick={() => openSheet("编辑用户", <EditUserForm user={u} useMock={useMock} onDone={onDone} />)}><i className="ri-edit-line" />编辑</button>
        <button className="btn btn-soft btn-sm" onClick={() => openSheet("调整积分", <AdjustCreditsForm user={u} useMock={useMock} onDone={onDone} />)}><i className="ri-coins-line" />积分</button>
        <button className="btn btn-soft btn-sm" onClick={() => openSheet("赠送会员", <GiftMemberForm user={u} useMock={useMock} onDone={onDone} />)}><i className="ri-vip-crown-line" />会员</button>
        <button className={`btn ${ban ? "btn-success" : "btn-danger"} btn-sm`} style={{ flex: 1 }} onClick={() => (ban ? unban() : openSheet("封禁用户", <BanUserForm user={u} useMock={useMock} onDone={onDone} />))}>
          <i className={`ri-${ban ? "lock-unlock-line" : "forbid-line"}`} />{ban ? "解封" : "封禁"}
        </button>
      </div>
    </>
  );
}

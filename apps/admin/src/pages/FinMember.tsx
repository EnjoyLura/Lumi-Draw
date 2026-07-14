import { useState } from "react";
import { apiDeleteMemberPlan, apiGetMemberPlans, apiSaveMemberPlan } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { MEMBER_PLANS, nextId, type MemberPlan } from "../data/mock";
import { getMemberPlans } from "../data/service";
import { useAsyncData } from "../data/useAsyncData";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function MemberForm({ id, item, useMock, onSaved }: { id: number; item?: MemberPlan; useMock: boolean; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const p = item ?? (id ? MEMBER_PLANS.find((x) => x.id === id) : undefined);
  const [name, setName] = useState(p?.name ?? "");
  const [price, setPrice] = useState(String(p?.price ?? ""));
  const [gift, setGift] = useState(String(p?.gift ?? 0));
  const [ckBonus, setCkBonus] = useState(String(p?.ckBonus ?? 0));
  const [milestoneBonus, setMilestoneBonus] = useState(String(p?.milestoneBonus ?? 0));
  const [publishBonus, setPublishBonus] = useState(String(p?.publishBonus ?? 0));
  const [rights, setRights] = useState(p?.rights ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    const data = { name: name.trim(), price: parseInt(price) || 0, gift: parseInt(gift) || 0, ckBonus: parseInt(ckBonus) || 0, milestoneBonus: parseInt(milestoneBonus) || 0, publishBonus: parseInt(publishBonus) || 0, rights };
    setSaving(true);
    try {
      if (useMock) {
        if (p) Object.assign(p, data);
        else MEMBER_PLANS.push({ id: nextId(MEMBER_PLANS), ...data });
      } else {
        await apiSaveMemberPlan(id, { id, ...data });
      }
      closeSheet();
      onSaved();
      toast(id ? "已保存" : "已新增");
    } catch (e) {
      toast(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <label className="field-label">名称</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：月卡" />
      <label className="field-label" style={{ marginTop: 12 }}>价格（元）</label>
      <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>开通赠送积分</label>
      <input className="input" type="number" value={gift} onChange={(e) => setGift(e.target.value)} placeholder="购买会员即送的积分" />
      <label className="field-label" style={{ marginTop: 12 }}>签到额外赠送积分</label>
      <input className="input" type="number" value={ckBonus} onChange={(e) => setCkBonus(e.target.value)} placeholder="会员每日签到额外多得的积分" />
      <label className="field-label" style={{ marginTop: 12 }}>权益说明</label>
      <textarea className="input" rows={3} value={rights} onChange={(e) => setRights(e.target.value)} placeholder="如：每日20次·1K无限" />
      <label className="field-label" style={{ marginTop: 12 }}>签到里程碑额外积分</label>
      <input className="input" type="number" value={milestoneBonus} onChange={(e) => setMilestoneBonus(e.target.value)} placeholder="会员达成签到里程碑额外获得的积分" />
      <label className="field-label" style={{ marginTop: 12 }}>发布作品额外积分</label>
      <input className="input" type="number" value={publishBonus} onChange={(e) => setPublishBonus(e.target.value)} placeholder="会员每次发布作品额外获得的积分" />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet} disabled={saving}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save} disabled={saving}>{saving ? "保存中" : "保存"}</button>
      </div>
    </>
  );
}

export function FinMember() {
  const { openSheet, toast, confirmDlg } = useNav();
  const { useMock } = useAdminSession();
  const refresh = useRefresh();
  const { data, loading, error, reload } = useAsyncData<MemberPlan[]>(useMock ? null : () => apiGetMemberPlans(), [useMock]);
  const plans = useMock ? getMemberPlans() : data ?? [];
  const afterSaved = () => useMock ? refresh() : reload();

  const openForm = (id: number) => openSheet(id ? "编辑会员方案" : "新增会员方案", <MemberForm id={id} item={plans.find((x) => x.id === id)} useMock={useMock} onSaved={afterSaved} />);
  const del = (p: MemberPlan) => confirmDlg("删除会员方案", "确定删除该会员方案吗？", () => {
    void (async () => {
      try {
        if (useMock) {
          const i = plans.findIndex((x) => x.id === p.id);
          if (i > -1) plans.splice(i, 1);
          refresh();
        } else {
          await apiDeleteMemberPlan(p.id);
          reload();
        }
        toast("已删除");
      } catch (e) {
        toast(e instanceof Error ? e.message : "删除失败");
      }
    })();
  }, true);

  return (
    <>
      <AddBtn text="新增会员方案" onClick={() => openForm(0)} />
      {loading ? <div className="empty"><i className="ri-loader-4-line" /><div className="et">加载会员方案中</div></div> : null}
      {error ? <div className="empty"><i className="ri-error-warning-line" /><div className="et">{error}</div></div> : null}
      {plans.map((p) => (
        <div key={p.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}><i className="ri-vip-crown-fill" style={{ color: "#F59E0B" }} /> {p.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)" }}>¥{p.price}</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 6 }}>{p.rights}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <Badge text={`送 ${p.gift || 0} 积分`} type="success" />
            <Badge text={`签到多赠 ${p.ckBonus || 0}`} type="info" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openForm(p.id)}><i className="ri-edit-line" />编辑</button>
            <button className="btn btn-danger btn-sm" onClick={() => del(p)}><i className="ri-delete-bin-line" /></button>
          </div>
        </div>
      ))}
    </>
  );
}

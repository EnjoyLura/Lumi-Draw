import { useState } from "react";
import { MEMBER_PLANS, nextId, type MemberPlan } from "../data/mock";
import { getMemberPlans } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, Badge } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function MemberForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const p = id ? MEMBER_PLANS.find((x) => x.id === id) : undefined;
  const [name, setName] = useState(p?.name ?? "");
  const [price, setPrice] = useState(String(p?.price ?? ""));
  const [gift, setGift] = useState(String(p?.gift ?? 0));
  const [ckBonus, setCkBonus] = useState(String(p?.ckBonus ?? 0));
  const [rights, setRights] = useState(p?.rights ?? "");

  const save = () => {
    if (!name.trim()) { toast("请输入名称"); return; }
    const data = { name: name.trim(), price: parseInt(price) || 0, gift: parseInt(gift) || 0, ckBonus: parseInt(ckBonus) || 0, rights };
    if (p) Object.assign(p, data);
    else MEMBER_PLANS.push({ id: nextId(MEMBER_PLANS), ...data });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
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
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function FinMember() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const plans = getMemberPlans();

  const openForm = (id: number) => openSheet(id ? "编辑会员方案" : "新增会员方案", <MemberForm id={id} onSaved={refresh} />);
  const del = (p: MemberPlan) => confirmDlg("删除会员方案", "确定删除该会员方案吗？", () => {
    const i = plans.findIndex((x) => x.id === p.id);
    if (i > -1) plans.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增会员方案" onClick={() => openForm(0)} />
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

import { useState } from "react";
import { nextId, RECHARGE_TIERS, type AdminRecharge } from "../data/mock";
import { getRecharges } from "../data/service";
import { useNav } from "../shell/NavContext";
import { AddBtn, CtrlIcons, Switch } from "../ui";
import { useRefresh } from "./opsShared";

const FOOT_STYLE: React.CSSProperties = { display: "flex", gap: 10, margin: "12px -18px 0", padding: "12px 18px 0", borderTop: "1px solid var(--border)" };

function RechargeForm({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { closeSheet, toast } = useNav();
  const t = id ? RECHARGE_TIERS.find((x) => x.id === id) : undefined;
  const [price, setPrice] = useState(String(t?.price ?? ""));
  const [credits, setCredits] = useState(String(t?.credits ?? ""));
  const [bonus, setBonus] = useState(String(t?.bonus ?? 0));

  const save = () => {
    if (!price.trim()) { toast("请输入价格"); return; }
    const data = { price: parseInt(price) || 0, credits: parseInt(credits) || 0, bonus: parseInt(bonus) || 0 };
    if (t) Object.assign(t, data);
    else RECHARGE_TIERS.push({ id: nextId(RECHARGE_TIERS), on: true, ...data });
    closeSheet();
    onSaved();
    toast(id ? "已保存" : "已新增");
  };

  return (
    <>
      <label className="field-label">价格（元）</label>
      <input className="input" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>到账积分</label>
      <input className="input" type="number" value={credits} onChange={(e) => setCredits(e.target.value)} />
      <label className="field-label" style={{ marginTop: 12 }}>赠送积分</label>
      <input className="input" type="number" value={bonus} onChange={(e) => setBonus(e.target.value)} />
      <div style={FOOT_STYLE}>
        <button className="btn btn-ghost btn-block" onClick={closeSheet}>取消</button>
        <button className="btn btn-primary btn-block" onClick={save}>保存</button>
      </div>
    </>
  );
}

export function FinRecharge() {
  const { openSheet, toast, confirmDlg } = useNav();
  const refresh = useRefresh();
  const tiers = getRecharges();

  const openForm = (id: number) => openSheet(id ? "编辑充值档位" : "新增充值档位", <RechargeForm id={id} onSaved={refresh} />);
  const toggle = (t: AdminRecharge) => { t.on = !t.on; refresh(); toast(t.on ? "已启用" : "已停用"); };
  const del = (t: AdminRecharge) => confirmDlg("删除充值档位", "确定删除该充值档位吗？", () => {
    const i = tiers.findIndex((x) => x.id === t.id);
    if (i > -1) tiers.splice(i, 1);
    refresh();
    toast("已删除");
  }, true);

  return (
    <>
      <AddBtn text="新增充值档位" onClick={() => openForm(0)} />
      <div className="card">
        {tiers.map((t) => (
          <div key={t.id} className="lrow" style={{ cursor: "default" }}>
            <div className="lr-ico" style={{ background: "var(--warning-soft)", color: "#F59E0B" }}><i className="ri-copper-coin-line" /></div>
            <div className="lr-main">
              <div className="lr-t">¥{t.price} → {t.credits} 积分</div>
              <div className="lr-s">{t.bonus ? `赠送 ${t.bonus} 积分` : "无赠送"}</div>
            </div>
            <Switch on={t.on} onToggle={() => toggle(t)} />
            <CtrlIcons onEdit={() => openForm(t.id)} onDelete={() => del(t)} />
          </div>
        ))}
      </div>
    </>
  );
}

// 通用展示组件（移植自 prototype/admin-prototype.html 的 statCard/avatar/badge/searchBar/sec 等辅助函数）
import { IMG, statusType, userName, type AdminWork } from "./data/mock";
import { useNav } from "./shell/NavContext";

export interface StatCardProps {
  label: string;
  val: string | number;
  delta?: number;
  icon: string;
  color: string;
  soft: string;
  onClick?: () => void;
}

export function StatCard({ label, val, delta, icon, color, soft, onClick }: StatCardProps) {
  return (
    <div className="stat-card" style={onClick ? { cursor: "pointer" } : undefined} onClick={onClick}>
      <div className="sc-top">
        <div className="sc-ico" style={{ background: soft, color }}><i className={icon} /></div>
        <div className="sc-label">{label}</div>
        {onClick ? <i className="ri-arrow-right-s-line" style={{ marginLeft: "auto", color: "var(--fg-muted)", fontSize: 16 }} /> : null}
      </div>
      <div className="sc-val">{val}</div>
      {delta !== undefined ? (
        <div className={`sc-delta ${delta >= 0 ? "up" : "down"}`}>
          <i className={`ri-arrow-${delta >= 0 ? "up" : "down"}-line`} />{Math.abs(delta)}%
        </div>
      ) : null}
    </div>
  );
}

export function Avatar({ a, color, size = 40 }: { a: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>{a}</span>
  );
}

export function Badge({ text, type }: { text: string; type: string }) {
  return <span className={`badge b-${type}`}>{text}</span>;
}

export function StatusBadge({ s }: { s: string }) {
  return <Badge text={s} type={statusType(s)} />;
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="searchbar">
      <i className="ri-search-line" />
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {value ? <i className="ri-close-circle-fill" style={{ color: "var(--fg-muted)", cursor: "pointer" }} onClick={() => onChange("")} /> : null}
    </div>
  );
}

export function Chips({ items, active, onPick }: { items: string[]; active: string; onPick: (v: string) => void }) {
  return (
    <div className="chips">
      {items.map((f) => (
        <span key={f} className={`chip${active === f ? " active" : ""}`} onClick={() => onPick(f)}>{f}</span>
      ))}
    </div>
  );
}

export function Seg({ items, active, onPick, small }: { items: Array<[string, string]>; active: string; onPick: (v: string) => void; small?: boolean }) {
  return (
    <div className="seg">
      {items.map(([v, label]) => (
        <span key={v} className={`seg-i${active === v ? " active" : ""}`} style={small ? { fontSize: 12 } : undefined} onClick={() => onPick(v)}>{label}</span>
      ))}
    </div>
  );
}

export function WorkCard({ w }: { w: AdminWork }) {
  const { go } = useNav();
  const badge = w.featured || w.status === "精选"
    ? <span className="badge b-warning" style={{ position: "absolute", top: 6, left: 6 }}><i className="ri-star-fill" />精选</span>
    : w.status !== "已发布"
      ? <span style={{ position: "absolute", top: 6, left: 6 }}><StatusBadge s={w.status} /></span>
      : null;
  return (
    <div className="wcard" onClick={() => go("workDetail", String(w.id))}>
      <div style={{ position: "relative" }}>
        <img className="thumb" src={IMG("w" + w.id)} style={{ width: "100%", aspectRatio: "1" }} alt="" />
        {badge}
      </div>
      <div style={{ padding: "8px 9px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.title || w.prompt.slice(0, 10)}</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 3, display: "flex", justifyContent: "space-between" }}>
          <span>{userName(w.userId)}</span>
          <span><i className="ri-heart-3-line" /> {w.likes}</span>
        </div>
      </div>
    </div>
  );
}

export function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <span className={`switch${on ? " on" : ""}`} onClick={(e) => { e.stopPropagation(); onToggle(); }} />;
}

export function AddBtn({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button className="btn btn-soft btn-block" style={{ marginBottom: 12 }} onClick={onClick}>
      <i className="ri-add-line" />{text}
    </button>
  );
}

const CTRL_BTN: React.CSSProperties = { width: 30, height: 30, fontSize: 18 };

export function SortCtrl({ index, len, onMove }: { index: number; len: number; onMove: (dir: number) => void }) {
  const up = index > 0;
  const down = index < len - 1;
  return (
    <>
      <span className="nav-btn" style={{ ...CTRL_BTN, color: up ? "var(--fg-2)" : "var(--border-strong)" }} onClick={(e) => { e.stopPropagation(); if (up) onMove(-1); }}><i className="ri-arrow-up-s-line" /></span>
      <span className="nav-btn" style={{ ...CTRL_BTN, color: down ? "var(--fg-2)" : "var(--border-strong)" }} onClick={(e) => { e.stopPropagation(); if (down) onMove(1); }}><i className="ri-arrow-down-s-line" /></span>
    </>
  );
}

export function CtrlIcons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <>
      <span className="nav-btn" style={{ width: 32, height: 32, fontSize: 17, color: "var(--fg-2)" }} onClick={(e) => { e.stopPropagation(); onEdit(); }}><i className="ri-edit-line" /></span>
      <span className="nav-btn" style={{ width: 32, height: 32, fontSize: 17, color: "var(--danger)" }} onClick={(e) => { e.stopPropagation(); onDelete(); }}><i className="ri-delete-bin-line" /></span>
    </>
  );
}

export function BarChart({ data, labels, grad }: { data: number[]; labels: string[]; grad: string }) {
  const max = Math.max(...data);
  return (
    <div className="bars">
      {data.map((v, i) => (
        <div key={i} className="bar-col">
          <div className="bar" style={{ height: `${(v / max) * 100}%`, background: grad }} />
          <div className="bar-x">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
}

export function RankBar({ name, val, max, color }: { name: string; val: number; max: number; color: string }) {
  return (
    <div className="rankbar">
      <div className="rb-top"><span>{name}</span><span style={{ color: "var(--fg-muted)" }}>{val}</span></div>
      <div className="rb-track"><div className="rb-fill" style={{ width: `${(val / max) * 100}%`, background: color }} /></div>
    </div>
  );
}

export function Sec({ title, more, onMore }: { title: string; more?: string; onMore?: () => void }) {
  return (
    <div className="sec-title">
      <span>{title}</span>
      {more ? <span className="more" onClick={onMore}>{more}<i className="ri-arrow-right-s-line" /></span> : null}
    </div>
  );
}

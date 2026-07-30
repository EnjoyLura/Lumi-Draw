import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined
} from "@ant-design/icons";
import {
  Avatar as AntAvatar,
  Button,
  Card,
  Input,
  Segmented,
  Space,
  Statistic,
  Switch as AntSwitch,
  Tag,
  Tooltip,
  Typography
} from "antd";
import { useState } from "react";
import { AdminImage } from "./components/AdminImage";
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

/** Shared dashboard metric used by legacy and v2 pages. */
export function StatCard({ label, val, delta, icon, color, soft, onClick }: StatCardProps) {
  return (
    <Card
      className="lumi-stat-card"
      hoverable={Boolean(onClick)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <span className="lumi-stat-card__icon" style={{ color, background: soft }}><i className={icon} /></span>
      <Statistic title={label} value={val} />
      {delta !== undefined ? (
        <Typography.Text className={delta >= 0 ? "lumi-stat-card__delta is-up" : "lumi-stat-card__delta is-down"}>
          <i className={`ri-arrow-${delta >= 0 ? "up" : "down"}-line`} /> 较昨日 {Math.abs(delta)}%
        </Typography.Text>
      ) : null}
    </Card>
  );
}

export function Avatar({ a, color, size = 40 }: { a: string; color: string; size?: number }) {
  return <AntAvatar size={size} style={{ background: color, fontWeight: 700 }}>{a}</AntAvatar>;
}

const TAG_COLORS: Record<string, string> = {
  success: "success",
  warning: "warning",
  danger: "error",
  info: "processing",
  muted: "default",
  purple: "purple"
};

export function Badge({ text, type }: { text: string; type: string }) {
  return <Tag className="lumi-status-tag" color={TAG_COLORS[type] || "default"}>{text}</Tag>;
}

export function StatusBadge({ s }: { s: string }) {
  return <Badge text={s} type={statusType(s)} />;
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Input
      allowClear
      className="lumi-control-search"
      placeholder={placeholder}
      prefix={<SearchOutlined />}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function Chips({ items, active, onPick }: { items: string[]; active: string; onPick: (v: string) => void }) {
  return (
    <Segmented
      className="lumi-filter-segmented"
      options={items}
      value={active}
      onChange={(value) => onPick(String(value))}
    />
  );
}

export function Seg({ items, active, onPick, small }: { items: Array<[string, string]>; active: string; onPick: (v: string) => void; small?: boolean }) {
  return (
    <Segmented
      block
      size={small ? "small" : "middle"}
      options={items.map(([value, label]) => ({ label, value }))}
      value={active}
      onChange={(value) => onPick(String(value))}
    />
  );
}

export interface WorkCardOperations {
  featuredPending?: boolean;
  recommendPending?: boolean;
  onToggleFeatured: () => void;
  onToggleRecommend: () => void;
}

export function WorkCard({ w, operations }: { w: AdminWork; operations?: WorkCardOperations }) {
  const { go } = useNav();
  const featured = Boolean(w.featured || w.status === "精选");
  return (
    <Card
      className="lumi-work-card"
      hoverable
      cover={
        <div className="lumi-work-card__cover">
          <AdminImage src={w.thumbnailUrl || w.imageUrl || IMG("w" + w.id)} alt={w.title || w.prompt} />
          <Space className="lumi-work-card__tags" size={4} wrap>
            {featured ? <Tag color="gold">精选</Tag> : null}
            {w.recommend ? <Tag color="blue">首页推荐</Tag> : null}
            {!featured && !w.recommend && w.status !== "已发布" ? <StatusBadge s={w.status} /> : null}
          </Space>
        </div>
      }
      onClick={() => go("workDetail", String(w.id))}
    >
      <Typography.Text className="lumi-work-card__title" ellipsis>{w.title || w.prompt.slice(0, 16)}</Typography.Text>
      <div className="lumi-work-card__meta">
        <Typography.Text type="secondary" ellipsis>{w.authorName || userName(w.userId)}</Typography.Text>
        <Typography.Text type="secondary"><i className="ri-heart-3-line" /> {w.likes}</Typography.Text>
      </div>
      {operations ? (
        <div className="lumi-work-card__operations" onClick={(event) => event.stopPropagation()}>
          <span><i className="ri-star-fill" />精选</span>
          <AntSwitch size="small" checked={Boolean(w.featured)} loading={operations.featuredPending} onChange={operations.onToggleFeatured} />
          <span><i className="ri-home-heart-fill" />首页推荐</span>
          <AntSwitch size="small" checked={Boolean(w.recommend)} loading={operations.recommendPending} onChange={operations.onToggleRecommend} />
        </div>
      ) : null}
    </Card>
  );
}

export function Switch({ on, onToggle, disabled = false }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return <AntSwitch checked={on} disabled={disabled} onChange={onToggle} />;
}

export function AddBtn({ text, onClick }: { text: string; onClick: () => void }) {
  return <Button className="lumi-page-primary-action" type="primary" icon={<PlusOutlined />} onClick={onClick}>{text}</Button>;
}

export function SortCtrl({ index, len, onMove }: { index: number; len: number; onMove: (dir: number) => void }) {
  return (
    <Space.Compact>
      <Tooltip title="提高优先级"><Button type="text" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => onMove(-1)} /></Tooltip>
      <Tooltip title="降低优先级"><Button type="text" icon={<ArrowDownOutlined />} disabled={index === len - 1} onClick={() => onMove(1)} /></Tooltip>
    </Space.Compact>
  );
}

export function CtrlIcons({ onCopy, onEdit, onDelete }: { onCopy?: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <Space size={0} onClick={(event) => event.stopPropagation()}>
      {onCopy ? <Tooltip title="复制配置"><Button type="text" icon={<CopyOutlined />} aria-label="复制配置" onClick={onCopy} /></Tooltip> : null}
      <Tooltip title="编辑"><Button type="text" icon={<EditOutlined />} aria-label="编辑" onClick={onEdit} /></Tooltip>
      <Tooltip title="删除"><Button danger type="text" icon={<DeleteOutlined />} aria-label="删除" onClick={onDelete} /></Tooltip>
    </Space>
  );
}

export function BarChart({ data, labels, grad, valueFormatter = String }: { data: number[]; labels: string[]; grad: string; valueFormatter?: (value: number) => string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...data);
  return (
    <div className="bars">
      {data.map((v, i) => (
        <button type="button" key={labels[i] || i} className={`bar-col${selected === i ? " selected" : ""}`} onClick={() => setSelected(i)}>
          {selected === i ? <span className="bar-tip">{valueFormatter(v)}</span> : null}
          <span className="bar" style={{ height: v > 0 ? `${Math.max(5, (v / max) * 100)}%` : 0, background: grad }} />
          <span className="bar-x">{labels[i]}</span>
        </button>
      ))}
    </div>
  );
}

export function RankBar({ name, val, max, color }: { name: string; val: number; max: number; color: string }) {
  return (
    <div className="rankbar">
      <div className="rb-top"><span>{name}</span><span>{val}</span></div>
      <div className="rb-track"><div className="rb-fill" style={{ width: `${max ? (val / max) * 100 : 0}%`, background: color }} /></div>
    </div>
  );
}

export function Sec({ title, more, onMore }: { title: string; more?: string; onMore?: () => void }) {
  return (
    <div className="lumi-section-heading">
      <Typography.Title level={5}>{title}</Typography.Title>
      {more ? <Button type="link" size="small" onClick={onMore}>{more}</Button> : null}
    </div>
  );
}

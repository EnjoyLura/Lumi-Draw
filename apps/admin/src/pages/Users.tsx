import { useState } from "react";
import { getUsers } from "../data/service";
import { useNav } from "../shell/NavContext";
import { Avatar, Chips, SearchBar, StatCard, StatusBadge } from "../ui";

const FILTERS = ["全部", "会员", "活跃", "封禁"];

export function Users() {
  const { go } = useNav();
  const users = getUsers();
  const [filter, setFilter] = useState("全部");
  const [query, setQuery] = useState("");

  const q = query.toLowerCase();
  const list = users.filter((u) => {
    if (filter === "会员" && u.member === "无") return false;
    if (filter === "活跃" && !u.active) return false;
    if (filter === "封禁" && u.status !== "封禁") return false;
    if (q && u.name.toLowerCase().indexOf(q) < 0 && String(u.id).indexOf(q) < 0 && u.phone.indexOf(q) < 0) return false;
    return true;
  });

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 4 }}>
        <StatCard label="总用户" val="12,486" delta={6} icon="ri-group-line" color="#5B9FE8" soft="var(--info-soft)" />
        <StatCard label="今日新增" val="245" delta={12} icon="ri-user-add-line" color="#6FD4B0" soft="var(--success-soft)" />
        <StatCard label="会员用户" val="3,120" delta={4} icon="ri-vip-crown-line" color="#F59E0B" soft="var(--warning-soft)" />
        <StatCard label="封禁用户" val="86" delta={1} icon="ri-forbid-line" color="#EF4444" soft="var(--danger-soft)" />
      </div>
      <div style={{ height: 14 }} />
      <SearchBar value={query} onChange={setQuery} placeholder="搜索昵称 / 手机号 / ID" />
      <Chips items={FILTERS} active={filter} onPick={setFilter} />
      {query ? (
        <div style={{ fontSize: 12, color: "var(--fg-muted)", margin: "0 2px 8px" }}>搜索“{query}” · {list.length} 个结果</div>
      ) : null}
      <div className="card">
        {list.length === 0 ? (
          <div className="empty"><i className="ri-user-line" /><div className="et">暂无匹配用户</div></div>
        ) : (
          list.map((u) => (
            <div key={u.id} className="lrow" onClick={() => go("userDetail", String(u.id))}>
              <Avatar a={u.avatar} color={u.color} size={42} />
              <div className="lr-main">
                <div className="lr-t">
                  {u.name}
                  {u.member !== "无" ? <i className="ri-vip-crown-fill" style={{ color: "#F59E0B", fontSize: 12, marginLeft: 4 }} /> : null}
                </div>
                <div className="lr-s">ID {u.id} · {u.credits}积分 · {u.works}作品</div>
              </div>
              <StatusBadge s={u.status} />
              <i className="ri-arrow-right-s-line lr-arrow" />
            </div>
          ))
        )}
      </div>
    </>
  );
}

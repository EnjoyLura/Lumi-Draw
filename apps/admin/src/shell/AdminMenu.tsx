import { useState } from "react";
import { readUseMockData, writeUseMockData } from "../dataMode";
import { useNav } from "./NavContext";

function AdminMenuBody() {
  const { closeSheet, go, toast } = useNav();
  const [mock, setMock] = useState(readUseMockData());

  const toggleMock = () => {
    const next = !mock;
    setMock(next);
    writeUseMockData(next);
    toast(next ? "已开启模拟数据" : "已关闭模拟数据（改用后端接口）");
  };

  return (
    <>
      <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
        <span className="avatar" style={{ width: 56, height: 56, background: "#5B9FE8", fontSize: 22 }}>管</span>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>超级管理员</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>admin · 超管权限</div>
      </div>
      <div className="card" style={{ marginTop: 10 }}>
        <div className="lrow" onClick={() => { closeSheet(); go("settings", undefined, true); }}>
          <div className="lr-ico" style={{ background: "var(--bg-soft)", color: "var(--fg-2)" }}><i className="ri-settings-3-line" /></div>
          <div className="lr-main"><div className="lr-t">系统设置</div></div>
          <i className="ri-arrow-right-s-line lr-arrow" />
        </div>
        <div className="lrow" onClick={toggleMock}>
          <div className="lr-ico" style={{ background: "var(--info-soft)", color: "#5B9FE8" }}><i className="ri-database-2-line" /></div>
          <div className="lr-main">
            <div className="lr-t">模拟数据</div>
            <div className="lr-s">开启后使用静态数据，关闭后请求后端接口</div>
          </div>
          <div className={`switch${mock ? " on" : ""}`} />
        </div>
      </div>
    </>
  );
}

export function useOpenAdminMenu() {
  const { openSheet, closeSheet, toast } = useNav();
  return () =>
    openSheet(
      "管理员",
      <AdminMenuBody />,
      <button className="btn btn-danger btn-block" onClick={() => { closeSheet(); toast("已退出登录（原型演示）"); }}>退出登录</button>
    );
}

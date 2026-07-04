import { useState } from "react";
import { readUseMockData, writeUseMockData } from "../dataMode";
import { useNav } from "../shell/NavContext";
import { Sec } from "../ui";

const GROUPS: Array<[string, Array<[string, string, string]>]> = [
  ["内容与安全", [["setAudit", "审核设置", "ri-shield-check-line"], ["setSensitive", "敏感词管理", "ri-filter-line"]]],
  ["应用管理", [["setVersion", "版本管理", "ri-git-branch-line"], ["setAgreement", "协议管理", "ri-file-text-line"]]]
];

export function Settings() {
  const { go, toast } = useNav();
  const [mock, setMock] = useState(readUseMockData());

  const toggleMock = () => {
    const next = !mock;
    setMock(next);
    writeUseMockData(next);
    toast(next ? "已开启模拟数据" : "已切换为后端接口");
  };

  return (
    <>
      {GROUPS.map(([title, items]) => (
        <div key={title}>
          <Sec title={title} />
          <div className="card">
            {items.map(([id, label, icon]) => (
              <div key={id} className="lrow" onClick={() => go(id)}>
                <div className="lr-ico" style={{ background: "var(--bg-soft)", color: "var(--fg-2)" }}><i className={icon} /></div>
                <div className="lr-main"><div className="lr-t">{label}</div></div>
                <i className="ri-arrow-right-s-line lr-arrow" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Sec title="开发调试" />
      <div className="card">
        <div className="lrow" style={{ cursor: "default" }}>
          <div className="lr-ico" style={{ background: "var(--purple-soft)", color: "#8B7FD6" }}><i className="ri-code-s-slash-line" /></div>
          <div className="lr-main">
            <div className="lr-t">模拟数据</div>
            <div className="lr-s">开启后使用静态数据，关闭后请求后端接口</div>
          </div>
          <span className={`switch${mock ? " on" : ""}`} onClick={toggleMock} />
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: "var(--fg-muted)", marginTop: 24 }}>露米绘画管理后台 v1.0.0</div>
    </>
  );
}

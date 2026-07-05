import { useState } from "react";
import { adminLogin } from "../data/api";
import { useAdminSession } from "../data/adminSession";
import { ApiError } from "../data/http";

export function AdminLogin() {
  const { onLoggedIn, setUseMock } = useAdminSession();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) {
      setError("请输入账号和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = await adminLogin(username, password);
      onLoggedIn(token);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-frame">
      <div className="phone-screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 28, gap: 16 }}>
        <div style={{ textAlign: "center" }}>
          <span className="avatar" style={{ width: 64, height: 64, background: "#5B9FE8", fontSize: 26 }}>管</span>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>露米绘画 · 管理后台</div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}>请登录管理员账号</div>
        </div>
        <input className="input" placeholder="管理员账号" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="密码" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />
        {error ? <div style={{ color: "var(--danger, #EF4444)", fontSize: 12 }}>{error}</div> : null}
        <button className="btn btn-primary btn-block" disabled={loading} onClick={() => void submit()}>
          {loading ? "登录中..." : "登录"}
        </button>
        <button className="btn btn-block" style={{ background: "var(--bg-soft)" }} onClick={() => setUseMock(true)}>
          改用模拟数据
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login, register, error, ready, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);

  if (ready && user) return <Navigate to="/toc" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const ok =
        mode === "login" ? await login(username, password) : await register(username, password, invite || undefined);
      if (ok) nav("/toc", { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>太一 · 卷二</h1>
      </div>
      <p className="muted">使用账号登录后阅读；令牌由服务端签发并支持刷新。</p>
      <div className="nav-row" style={{ paddingTop: 0 }}>
        <button type="button" className={`btn ${mode === "login" ? "btn-primary" : ""}`} onClick={() => setMode("login")}>
          登录
        </button>
        <button
          type="button"
          className={`btn ${mode === "register" ? "btn-primary" : ""}`}
          onClick={() => setMode("register")}
        >
          注册
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="u">用户名</label>
          <input id="u" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p">密码（至少 8 位）</label>
          <input
            id="p"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="i">邀请码（若服务端已配置）</label>
            <input id="i" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="可选" />
          </div>
        )}
        {error && <p className="err">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "请稍候…" : mode === "login" ? "进入" : "注册并进入"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1.25rem" }}>
        无账号时请管理员在服务器创建用户，或开启 <code>ALLOW_REGISTER</code> / <code>INVITE_CODE</code>。
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link to="/toc" className="muted">
          已有会话？去目录
        </Link>
      </p>
    </div>
  );
}

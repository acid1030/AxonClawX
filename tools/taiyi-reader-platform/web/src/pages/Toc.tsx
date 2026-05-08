import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ChapterMeta } from "../api/client";

export default function Toc() {
  const nav = useNavigate();
  const { ready, user, logout, getAccessToken } = useAuth();
  const [list, setList] = useState<ChapterMeta[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      nav("/login", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        nav("/login", { replace: true });
        return;
      }
      const r = await api.fetchChapters(token);
      if (cancelled) return;
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setList(r.data.chapters);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, nav, getAccessToken]);

  if (!ready || !user) return <div className="app-shell muted">加载中…</div>;

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>章节目录</h1>
        <button type="button" className="btn btn-ghost" style={{ width: "auto", padding: "0.35rem 0.6rem" }} onClick={() => void logout().then(() => nav("/login"))}>
          退出
        </button>
      </div>
      <p className="muted">已登录：{user.username}</p>
      {err && <p className="err">{err}</p>}
      {!list && !err && <p className="muted">拉取目录…</p>}
      {list && (
        <ul className="toc-list">
          {list.map((c) => (
            <li key={c.slug}>
              <Link to={`/read/${encodeURIComponent(c.slug)}`}>{c.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

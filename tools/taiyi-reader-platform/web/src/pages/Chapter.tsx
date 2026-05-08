import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as api from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ChapterPayload } from "../api/client";

function attachCopyLock() {
  const block = (e: Event) => {
    e.preventDefault();
  };
  document.addEventListener("copy", block, true);
  document.addEventListener("cut", block, true);
  document.addEventListener("contextmenu", block, true);
  document.addEventListener("selectstart", block, true);
  document.addEventListener("dragstart", block, true);
  return () => {
    document.removeEventListener("copy", block, true);
    document.removeEventListener("cut", block, true);
    document.removeEventListener("contextmenu", block, true);
    document.removeEventListener("selectstart", block, true);
    document.removeEventListener("dragstart", block, true);
  };
}

export default function Chapter() {
  const { slug: slugParam } = useParams();
  const nav = useNavigate();
  const { ready, user, getAccessToken } = useAuth();
  const [data, setData] = useState<ChapterPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const slug = slugParam ? decodeURIComponent(slugParam) : "";

  useEffect(() => {
    if (!ready || !user || !slug) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        nav("/login", { replace: true });
        return;
      }
      const r = await api.fetchChapter(token, slug);
      if (cancelled) return;
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      setData(r.data);
      detach = attachCopyLock();
    })();
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [ready, user, slug, nav, getAccessToken]);

  useEffect(() => {
    if (!data?.title) return;
    document.title = `${data.title} · 太一`;
    return () => {
      document.title = "太一 · 卷二";
    };
  }, [data?.title]);

  if (!ready || !user) return <div className="app-shell muted">加载中…</div>;
  if (!slug) return <p className="app-shell err">无效章节</p>;

  if (err) {
    return (
      <div className="app-shell">
        <p className="err">{err}</p>
        <Link to="/toc">返回目录</Link>
      </div>
    );
  }

  if (!data) return <div className="app-shell muted">加载章节…</div>;

  return (
    <div className="app-shell reader-copy-lock">
      <nav className="nav-row">
        {data.prev ? (
          <Link className="nav-btn" to={`/read/${encodeURIComponent(data.prev)}`}>
            ← 上一章
          </Link>
        ) : (
          <span className="nav-btn nav-btn--disabled">← 上一章</span>
        )}
        <Link className="nav-btn nav-btn--accent" to="/toc">
          目录
        </Link>
        {data.next ? (
          <Link className="nav-btn" to={`/read/${encodeURIComponent(data.next)}`}>
            下一章 →
          </Link>
        ) : (
          <span className="nav-btn nav-btn--disabled">下一章 →</span>
        )}
      </nav>
      <h1 style={{ textAlign: "center", fontSize: "1.15rem", color: "var(--accent)", margin: "0 0 1.25rem" }}>
        {data.title}
      </h1>
      <article className="prose" dangerouslySetInnerHTML={{ __html: data.htmlBody }} />
      <nav className="nav-row" style={{ marginTop: "2rem" }}>
        {data.prev ? (
          <Link className="nav-btn" to={`/read/${encodeURIComponent(data.prev)}`}>
            ← 上一章
          </Link>
        ) : (
          <span className="nav-btn nav-btn--disabled">← 上一章</span>
        )}
        <Link className="nav-btn nav-btn--accent" to="/toc">
          目录
        </Link>
        {data.next ? (
          <Link className="nav-btn" to={`/read/${encodeURIComponent(data.next)}`}>
            下一章 →
          </Link>
        ) : (
          <span className="nav-btn nav-btn--disabled">下一章 →</span>
        )}
      </nav>
      <p className="muted" style={{ textAlign: "center", marginTop: "1rem" }}>
        {data.index + 1} / {data.total}
      </p>
    </div>
  );
}

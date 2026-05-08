/**
 * 将卷二正文 Markdown 转为静态小说阅读站点（章节导航、密钥、30 分钟会话、防复制）。
 * 用法: TAIYI_SRC=/path/to/卷二正文 npm run build
 * 可选: TAIYI_KEY=自定义阅读密钥（不设则构建时随机生成并写入 taiyi-READ-KEY.txt）
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "dist");
const SRC = process.env.TAIYI_SRC || "/Users/t/Documents/我的/太一/taiyi-novel/卷二正文";
const KEY_FILE = path.join(__dirname, "taiyi-READ-KEY.txt");

const SITE_PEPPER = "taiyi-novel-v2|axonclawx.cn";
const SESSION_MS = 30 * 60 * 1000;
const STORAGE_KEY = "taiyi_reader_session_v1";

function deriveVerifier(secret) {
  const salt = crypto.createHash("sha256").update(SITE_PEPPER + "|salt").digest();
  return crypto.pbkdf2Sync(secret, salt, 120_000, 32, "sha256").toString("hex");
}

function escapeJsString(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "");
}

function navBarHtml({ prev, next, indexHref, title }) {
  const prevBtn = prev
    ? `<a class="nav-btn" href="${prev.href}" rel="prev">← 上一章</a>`
    : `<span class="nav-btn nav-btn--disabled">← 上一章</span>`;
  const nextBtn = next
    ? `<a class="nav-btn" href="${next.href}" rel="next">下一章 →</a>`
    : `<span class="nav-btn nav-btn--disabled">下一章 →</span>`;
  return `
  <header class="reader-nav" role="navigation">
    ${prevBtn}
    <a class="nav-btn nav-btn--toc" href="${indexHref}">章节目录</a>
    ${nextBtn}
  </header>
  <div class="chapter-title-block"><h1 class="chapter-h1">${title}</h1></div>`;
}

function footerNav({ prev, next, indexHref }) {
  const prevBtn = prev
    ? `<a class="nav-btn" href="${prev.href}">← 上一章</a>`
    : `<span class="nav-btn nav-btn--disabled">← 上一章</span>`;
  const nextBtn = next
    ? `<a class="nav-btn" href="${next.href}">下一章 →</a>`
    : `<span class="nav-btn nav-btn--disabled">下一章 →</span>`;
  return `
  <footer class="reader-nav reader-nav--footer" role="navigation">
    ${prevBtn}
    <a class="nav-btn nav-btn--toc" href="${indexHref}">章节目录</a>
    ${nextBtn}
  </footer>`;
}

function shellPage(embedded) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>太一 · 卷二</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #141218;
      --bg-card: #1e1c24;
      --text: #e8e4dc;
      --muted: #9a958c;
      --accent: #c9a227;
      --accent-dim: #8a7020;
      --border: #2f2d36;
      --shadow: rgba(0,0,0,.45);
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      font-family: "Noto Serif SC", "Songti SC", "SimSun", serif;
      background: radial-gradient(ellipse 120% 80% at 50% -20%, #2a2635 0%, var(--bg) 55%);
      color: var(--text);
      -webkit-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; color: #e4bc4a; }
    .wrap { max-width: 42rem; margin: 0 auto; padding: 1.25rem 1rem 4rem; }
    .reader-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.5rem;
    }
    .reader-nav--footer {
      border-bottom: none;
      border-top: 1px solid var(--border);
      margin-top: 3rem;
      margin-bottom: 0;
      padding-top: 1.5rem;
    }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text);
      font-size: 0.9rem;
      text-decoration: none !important;
      box-shadow: 0 2px 8px var(--shadow);
      transition: border-color .2s, background .2s;
    }
    .nav-btn:hover:not(.nav-btn--disabled) {
      border-color: var(--accent-dim);
      background: #25232e;
    }
    .nav-btn--toc { border-color: var(--accent-dim); color: var(--accent); }
    .nav-btn--disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: none;
    }
    .chapter-title-block { text-align: center; margin-bottom: 2rem; }
    .chapter-h1 {
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--accent);
      margin: 0;
    }
    .prose {
      font-size: 1.05rem;
      line-height: 1.95;
      letter-spacing: 0.02em;
      text-align: justify;
      word-break: break-word;
    }
    .prose p { margin: 0 0 1.1em; text-indent: 2em; }
    .prose h1, .prose h2, .prose h3 { display: none; }
    .prose strong { color: #f0e6d8; font-weight: 600; }
    .prose em { color: var(--muted); font-style: normal; border-bottom: 1px dotted var(--muted); }
    .mask-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(10, 9, 12, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      backdrop-filter: blur(6px);
    }
    .mask-overlay[hidden] { display: none !important; }
    .auth-card {
      width: 100%;
      max-width: 22rem;
      padding: 1.75rem;
      border-radius: 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      box-shadow: 0 16px 48px var(--shadow);
    }
    .auth-card h2 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      color: var(--accent);
      text-align: center;
    }
    .auth-card p { margin: 0 0 1rem; font-size: 0.85rem; color: var(--muted); text-align: center; }
    .auth-card input {
      width: 100%;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #121118;
      color: var(--text);
      font-size: 1rem;
      margin-bottom: 0.75rem;
      font-family: ui-monospace, monospace;
    }
    .auth-card button {
      width: 100%;
      padding: 0.65rem;
      border: none;
      border-radius: 8px;
      background: linear-gradient(135deg, #a88b2a, #c9a227);
      color: #1a1810;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.95rem;
    }
    .auth-card button:hover { filter: brightness(1.08); }
    .auth-err { color: #e07070; font-size: 0.8rem; text-align: center; margin-top: 0.5rem; min-height: 1.2em; }
    .toc-list { list-style: none; padding: 0; margin: 0; }
    .toc-list li.toc-section {
      font-size: 0.85rem;
      color: var(--accent-dim);
      margin: 1.2rem 0 0.2rem;
      padding-left: 1rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      border-left: 2px solid var(--accent-dim);
    }
    .toc-list a {
      display: block;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      border: 1px solid transparent;
      color: var(--text);
    }
    .toc-list a:hover { background: var(--bg-card); border-color: var(--border); }
  </style>
</head>
<body>
  <div id="auth-overlay" class="mask-overlay" hidden></div>
  <div class="wrap" id="main"></div>
  <script>
(function(){
  var VERIFIER_HEX = '${embedded.verifierHex}';
  var SESSION_MS = ${SESSION_MS};
  var STORAGE_KEY = '${STORAGE_KEY}';
  function hex(buf) {
    var a = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < a.length; i++) s += ('0' + a[i.toString(16)]).slice(-2);
    return s;
  }
  async function derive(input) {
    var enc = new TextEncoder();
    var salt = await crypto.subtle.digest('SHA-256', enc.encode('${escapeJsString(SITE_PEPPER)}|salt'));
    var key = await crypto.subtle.importKey('raw', enc.encode(input), 'PBKDF2', false, ['deriveBits']);
    var bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' },
      key, 256
    );
    return hex(bits);
  }
  function getSession() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o.exp !== 'number') return null;
      if (Date.now() > o.exp) { localStorage.removeItem(STORAGE_KEY); return null; }
      return o;
    } catch (e) { return null; }
  }
  function setSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ exp: Date.now() + SESSION_MS }));
  }
  async function verify(input) {
    var h = await derive(input.trim());
    return h === VERIFIER_HEX;
  }
  function lockCopy(e) {
    e.preventDefault();
    return false;
  }
  function attachAntiCopy() {
    document.addEventListener('copy', lockCopy, true);
    document.addEventListener('cut', lockCopy, true);
    document.addEventListener('contextmenu', lockCopy, true);
    document.addEventListener('selectstart', lockCopy, true);
    document.addEventListener('dragstart', lockCopy, true);
  }
  function showAuth(onOk) {
    var overlay = document.getElementById('auth-overlay');
    overlay.hidden = false;
    overlay.innerHTML = '<div class="auth-card"><h2>阅读密钥</h2><p>请输入密钥以阅读本章。验证通过后 30 分钟内切换章节无需再次输入。</p><input type="password" id="taiyi-key" autocomplete="off" spellcheck="false" /><button type="button" id="taiyi-go">验证</button><div class="auth-err" id="taiyi-err"></div></div>';
    var inp = document.getElementById('taiyi-key');
    var btn = document.getElementById('taiyi-go');
    var err = document.getElementById('taiyi-err');
    function fail(msg) { err.textContent = msg || '密钥错误'; }
    async function go() {
      err.textContent = '';
      var v = await verify(inp.value);
      if (!v) { fail(); return; }
      setSession();
      overlay.hidden = true;
      overlay.innerHTML = '';
      onOk();
    }
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', function(ev) { if (ev.key === 'Enter') go(); });
    inp.focus();
  }
  window.__taiyiReaderInit = function inject(html) {
    function render() {
      document.getElementById('main').innerHTML = html;
      attachAntiCopy();
    }
    if (getSession()) { render(); return; }
    showAuth(render);
  };
})();
  </script>
  ${embedded.extraScripts || ""}
</body>
</html>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  let readKey = process.env.TAIYI_KEY?.trim();
  if (!readKey) {
    try {
      readKey = (await fs.readFile(KEY_FILE, "utf8")).trim();
    } catch {
      readKey = crypto.randomBytes(18).toString("base64url");
      await fs.writeFile(KEY_FILE, readKey + "\n", "utf8");
    }
  } else {
    await fs.writeFile(KEY_FILE, readKey + "\n", "utf8");
  }

  const verifierHex = deriveVerifier(readKey);
  console.log("阅读密钥已写入:", KEY_FILE, "(请勿提交到 git)");

  // Recursively collect .md files, preserving subdir as section label
  async function walk(dir, section) {
    const results = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        const sub = await walk(full, item.name);
        results.push(...sub);
      } else if (item.isFile() && item.name.endsWith(".md")) {
        results.push({ name: item.name, fullPath: full, section });
      }
    }
    return results;
  }

  const allEntries = await walk(SRC, null);
  // Sort: root files first, then by numeric Ch prefix
  allEntries.sort((a, b) => {
    const aNum = parseInt((a.name.match(/Ch(\d+)/) || [])[1] || "0", 10);
    const bNum = parseInt((b.name.match(/Ch(\d+)/) || [])[1] || "0", 10);
    return aNum - bNum;
  });

  if (!allEntries.length) {
    console.error("未找到 .md 文件:", SRC);
    process.exit(1);
  }

  const chapters = [];
  for (const entry of allEntries) {
    const raw = await fs.readFile(entry.fullPath, "utf8");
    const slug = entry.name.replace(/\.md$/i, "");
    const href = `chapter-${slug}.html`;
    const htmlBody = marked.parse(raw, { async: false });
    const titleMatch = raw.match(/^#\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;
    chapters.push({ slug, href, title, htmlBody, section: entry.section });
  }

  const indexHref = "index.html";

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const prev = i > 0 ? { href: chapters[i - 1].href } : null;
    const next = i < chapters.length - 1 ? { href: chapters[i + 1].href } : null;
    const navTop = navBarHtml({ prev, next, indexHref, title: ch.title });
    const navBot = footerNav({ prev, next, indexHref });
    const prose = `<article class="prose">${ch.htmlBody}</article>`;
    const inner = navTop + prose + navBot;
    const escapedInner = JSON.stringify(inner);
    const page = shellPage({
      verifierHex,
      extraScripts: `<script>window.__taiyiReaderInit(${escapedInner});</script>`,
    });
    const outPath = path.join(OUT_DIR, `chapter-${ch.slug}.html`);
    await fs.writeFile(outPath, page, "utf8");
  }

  const tocItems = [];
  let lastSection = null;
  for (const c of chapters) {
    if (c.section && c.section !== lastSection) {
      tocItems.push(`<li class="toc-section">${escapeHtml(c.section)}</li>`);
      lastSection = c.section;
    }
    tocItems.push(`<li><a href="${c.href}">${escapeHtml(c.title)}</a></li>`);
  }
  const tocHtml = tocItems.join("\n");
  const tocInner =
    `<header class="reader-nav" style="border:none;margin-bottom:1rem"><span class="nav-btn nav-btn--disabled">← 上一章</span><span class="nav-btn nav-btn--toc">章节目录</span><span class="nav-btn nav-btn--disabled">下一章 →</span></header>` +
    `<h1 class="chapter-h1" style="margin-bottom:1.5rem">卷二 · 章节目录</h1><ul class="toc-list">${tocHtml}</ul>` +
    `<footer class="reader-nav reader-nav--footer"><span class="nav-btn nav-btn--disabled">← 上一章</span><span class="nav-btn nav-btn--toc">章节目录</span><span class="nav-btn nav-btn--disabled">下一章 →</span></footer>`;

  const indexPage = shellPage({
    verifierHex,
    extraScripts: `<script>window.__taiyiReaderInit(${JSON.stringify(tocInner)});</script>`,
  });
  await fs.writeFile(path.join(OUT_DIR, "index.html"), indexPage, "utf8");

  console.log("输出目录:", OUT_DIR);
  console.log("章节数:", chapters.length);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

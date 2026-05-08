/**
 * 太一阅读后端：注册/登录、JWT 双令牌、刷新轮换、SQLite(sql.js)、章节 Markdown→HTML。
 * 环境变量见 .env.example
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import * as jose from "jose";
import { marked } from "marked";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "taiyi.db");
const require = createRequire(import.meta.url);
const sqlJsEntry = require.resolve("sql.js");
const sqlJsDir = path.dirname(sqlJsEntry);

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3450, 10);
const JWT_SECRET = process.env.JWT_SECRET;
const CONTENT_DIR = process.env.TAIYI_CONTENT_DIR;
const INVITE_CODE = process.env.INVITE_CODE || "";
const ACCESS_MIN = Number(process.env.ACCESS_TOKEN_MINUTES || 30, 10);
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS || 30, 10);

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET missing or shorter than 32 characters.");
  process.exit(1);
}

const encoder = new TextEncoder();
const secretKey = encoder.encode(JWT_SECRET);

/** @type {import("sql.js").Database} */
let db;

function persistDb() {
  const data = db.export();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function sqlGet(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (!stmt.step()) {
    stmt.free();
    return undefined;
  }
  const row = stmt.getAsObject();
  stmt.free();
  return row;
}

function sqlRun(sql, params = []) {
  db.run(sql, params);
  persistDb();
}

function sqlExec(sql) {
  db.exec(sql);
  persistDb();
}

async function initDb() {
  const SQL = await initSqlJs({ locateFile: (f) => path.join(sqlJsDir, f) });
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA foreign_keys = ON;");
  sqlExec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reader',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  jti TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
`);
}

function bootstrapAdmin() {
  const u = process.env.BOOTSTRAP_ADMIN_USER;
  const p = process.env.BOOTSTRAP_ADMIN_PASS;
  if (!u || !p) return;
  const row = sqlGet("SELECT COUNT(*) AS c FROM users");
  if (!row || Number(row.c) > 0) return;
  const hash = bcrypt.hashSync(p, 12);
  sqlRun("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')", [
    u.trim().toLowerCase(),
    hash,
  ]);
  console.log("[bootstrap] created admin user:", u.trim().toLowerCase());
}

/** @type {{ slug: string, title: string, filename: string }[]} */
let chapterCache = [];
let chapterCacheMtime = 0;

async function loadChapters() {
  if (!CONTENT_DIR || !fs.existsSync(CONTENT_DIR)) {
    chapterCache = [];
    return;
  }
  const stat = await fsPromises.stat(CONTENT_DIR);
  if (stat.mtimeMs === chapterCacheMtime && chapterCache.length) return;
  chapterCacheMtime = stat.mtimeMs;
  const names = (await fsPromises.readdir(CONTENT_DIR, { withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => d.name)
    .sort();
  const list = [];
  for (const name of names) {
    const slug = name.replace(/\.md$/i, "");
    const full = path.join(CONTENT_DIR, name);
    const raw = await fsPromises.readFile(full, "utf8");
    const m = raw.match(/^#\s*(.+)$/m);
    list.push({ slug, title: m ? m[1].trim() : slug, filename: name });
  }
  chapterCache = list;
}

function chapterIndex(slug) {
  return chapterCache.findIndex((c) => c.slug === slug);
}

async function issueTokens(userId, username) {
  const jti = nanoid(32);
  const now = Date.now();
  const expRefresh = now + REFRESH_DAYS * 86400_000;
  sqlRun(
    "INSERT INTO refresh_tokens (jti, user_id, expires_at, created_at, revoked) VALUES (?,?,?,?,0)",
    [jti, userId, expRefresh, now]
  );

  const access = await new jose.SignJWT({ typ: "access", username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_MIN}m`)
    .sign(secretKey);

  const refresh = await new jose.SignJWT({ typ: "refresh", jti })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_DAYS}d`)
    .sign(secretKey);

  return { accessToken: access, refreshToken: refresh, expiresIn: ACCESS_MIN * 60 };
}

async function verifyAccess(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jose.jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (payload.typ !== "access") return null;
    const userId = Number(payload.sub, 10);
    if (!userId) return null;
    return { userId, username: payload.username };
  } catch {
    return null;
  }
}

async function rotateRefresh(refreshToken) {
  let payload;
  try {
    ({ payload } = await jose.jwtVerify(refreshToken, secretKey, { algorithms: ["HS256"] }));
  } catch {
    return { error: "invalid_refresh" };
  }
  if (payload.typ !== "refresh" || typeof payload.jti !== "string") return { error: "invalid_refresh" };
  const row = sqlGet("SELECT * FROM refresh_tokens WHERE jti = ? AND revoked = 0", [payload.jti]);
  if (!row) return { error: "revoked_or_missing" };
  if (row.expires_at < Date.now()) {
    sqlRun("DELETE FROM refresh_tokens WHERE jti = ?", [payload.jti]);
    return { error: "expired" };
  }
  const userId = Number(payload.sub, 10);
  const u = sqlGet("SELECT id, username FROM users WHERE id = ?", [userId]);
  if (!u) return { error: "user_missing" };

  sqlRun("UPDATE refresh_tokens SET revoked = 1 WHERE jti = ?", [payload.jti]);
  return issueTokens(u.id, u.username);
}

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "64kb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        origin.startsWith("http://localhost") ||
        origin.startsWith("https://localhost") ||
        origin.startsWith("capacitor://") ||
        origin.includes("axonclawx.cn")
      ) {
        return cb(null, true);
      }
      cb(null, true);
    },
    credentials: true,
  })
);

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 80, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 30, standardHeaders: true, legacyHeaders: false });

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "taiyi-reader-server" });
});

app.post("/auth/register", authLimiter, async (req, res) => {
  await loadChapters();
  const { username, password, inviteCode } = req.body || {};
  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "invalid_body" });
  }
  if (username.length < 2 || username.length > 32 || !/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
    return res.status(400).json({ error: "invalid_username" });
  }
  if (password.length < 8) return res.status(400).json({ error: "password_too_short" });
  const allowOpen = process.env.ALLOW_REGISTER === "1";
  if (allowOpen) {
    /* ok */
  } else if (INVITE_CODE) {
    if (inviteCode !== INVITE_CODE) return res.status(403).json({ error: "invite_required" });
  } else {
    return res.status(403).json({ error: "registration_closed" });
  }
  const un = username.trim().toLowerCase();
  const hash = bcrypt.hashSync(password, 12);
  try {
    sqlRun("INSERT INTO users (username, password_hash) VALUES (?, ?)", [un, hash]);
    const idRow = sqlGet("SELECT last_insert_rowid() AS id");
    const uid = Number(idRow?.id, 10);
    const tokens = await issueTokens(uid, un);
    return res.status(201).json({ user: { id: uid, username: un }, ...tokens });
  } catch (e) {
    if (String(e).includes("UNIQUE") || String(e).includes("constraint")) {
      return res.status(409).json({ error: "username_taken" });
    }
    throw e;
  }
});

app.post("/auth/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "invalid_body" });
  const un = String(username).trim().toLowerCase();
  const user = sqlGet("SELECT id, username, password_hash FROM users WHERE username = ?", [un]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  const tokens = await issueTokens(user.id, user.username);
  res.json({ user: { id: user.id, username: user.username }, ...tokens });
});

app.post("/auth/refresh", authLimiter, async (req, res) => {
  const rt = req.body?.refreshToken;
  if (!rt || typeof rt !== "string") return res.status(400).json({ error: "missing_refresh" });
  const out = await rotateRefresh(rt);
  if (out.error) return res.status(401).json({ error: out.error });
  res.json(out);
});

app.post("/auth/logout", authLimiter, async (req, res) => {
  const rt = req.body?.refreshToken;
  if (rt && typeof rt === "string") {
    try {
      const { payload } = await jose.jwtVerify(rt, secretKey, { algorithms: ["HS256"] });
      if (payload.typ === "refresh" && payload.jti) {
        sqlRun("UPDATE refresh_tokens SET revoked = 1 WHERE jti = ?", [payload.jti]);
      }
    } catch {
      /* ignore */
    }
  }
  res.json({ ok: true });
});

app.get("/me", async (req, res) => {
  const ctx = await verifyAccess(req.headers.authorization);
  if (!ctx) return res.status(401).json({ error: "unauthorized" });
  res.json({ id: ctx.userId, username: ctx.username });
});

app.get("/chapters", async (req, res) => {
  const ctx = await verifyAccess(req.headers.authorization);
  if (!ctx) return res.status(401).json({ error: "unauthorized" });
  await loadChapters();
  if (!CONTENT_DIR) return res.status(503).json({ error: "content_not_configured" });
  res.json({
    chapters: chapterCache.map((c, i) => ({
      index: i,
      slug: c.slug,
      title: c.title,
    })),
  });
});

app.get("/chapters/:slug", async (req, res) => {
  const ctx = await verifyAccess(req.headers.authorization);
  if (!ctx) return res.status(401).json({ error: "unauthorized" });
  if (!CONTENT_DIR) return res.status(503).json({ error: "content_not_configured" });
  await loadChapters();
  const slug = decodeURIComponent(req.params.slug);
  const idx = chapterIndex(slug);
  if (idx < 0) return res.status(404).json({ error: "not_found" });
  const ch = chapterCache[idx];
  const full = path.join(CONTENT_DIR, ch.filename);
  const raw = await fsPromises.readFile(full, "utf8");
  const htmlBody = marked.parse(raw, { async: false });
  const prev = idx > 0 ? chapterCache[idx - 1].slug : null;
  const next = idx < chapterCache.length - 1 ? chapterCache[idx + 1].slug : null;
  res.json({
    slug: ch.slug,
    title: ch.title,
    htmlBody,
    prev,
    next,
    index: idx,
    total: chapterCache.length,
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal" });
});

await initDb();
bootstrapAdmin();
await loadChapters();
http.createServer(app).listen(PORT, HOST, () => {
  console.log(`taiyi-reader-server http://${HOST}:${PORT}`);
  if (!CONTENT_DIR) console.warn("WARN: TAIYI_CONTENT_DIR not set — chapter routes return 503.");
  else console.log("Content dir:", CONTENT_DIR, "chapters:", chapterCache.length);
});

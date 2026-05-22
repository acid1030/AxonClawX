import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3451);
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(DATA_DIR, 'uploads');
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'resource-library.db');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL DEFAULT 'cyan',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    prompt TEXT,
    image_url TEXT,
    image_alt TEXT,
    tags_json TEXT NOT NULL DEFAULT '[]',
    level TEXT NOT NULL DEFAULT 'basic',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_items_category_sort ON items(category_id, sort_order, updated_at);
`);

const CATEGORY_META = {
  imagePrompts: {
    title: '图片提示词',
    description: '适合文生图、图生图、商品图和海报设计的可复制提示词。',
    accent: 'cyan',
    sortOrder: 10,
  },
  cameraPrompts: {
    title: '运镜提示词',
    description: '适合视频生成、分镜设计、镜头运动和短片节奏控制。',
    accent: 'orange',
    sortOrder: 20,
  },
  capcutTips: {
    title: '剪映技巧',
    description: '面向剪映成片流程的字幕、节奏、调色、封面和模板技巧。',
    accent: 'emerald',
    sortOrder: 30,
  },
};

const SEED_ITEMS = [
  {
    id: 'image-product-hero',
    category: 'imagePrompts',
    title: '高端产品主视觉',
    description: '用于电商首图、品牌海报和新品发布视觉。',
    prompt: '高端商业产品摄影，主体居中，柔和轮廓光，深色渐变背景，微反射台面，细节清晰，电影级布光，8k，clean composition, premium product photography',
    tags: ['产品图', '电商', '主视觉'],
    level: 'basic',
  },
  {
    id: 'image-character-editorial',
    category: 'imagePrompts',
    title: '人物杂志大片',
    description: '适合真人角色、虚拟人和品牌代言人视觉。',
    prompt: 'editorial portrait, confident subject, dramatic key light, subtle rim light, textured background, fashion magazine style, sharp eyes, cinematic color grading, high detail',
    tags: ['人物', '杂志', '写真'],
    level: 'pro',
  },
  {
    id: 'camera-slow-push-in',
    category: 'cameraPrompts',
    title: '慢速推进镜头',
    description: '从环境过渡到主体，适合情绪铺垫和产品亮相。',
    prompt: 'slow cinematic push-in, camera moves steadily toward the subject, shallow depth of field, smooth stabilized motion, subtle parallax, dramatic reveal',
    tags: ['推进', '氛围', '揭示'],
    level: 'basic',
  },
  {
    id: 'camera-orbit-reveal',
    category: 'cameraPrompts',
    title: '环绕揭示镜头',
    description: '围绕主体旋转，突出空间、结构和高级感。',
    prompt: 'smooth 180-degree orbit shot around the subject, controlled speed, background parallax, subject remains centered, cinematic lighting, premium reveal',
    tags: ['环绕', '产品', '空间'],
    level: 'pro',
  },
  {
    id: 'capcut-hook-first-3s',
    category: 'capcutTips',
    title: '前三秒钩子',
    description: '开头先给结果、冲突或强利益点，再补充过程。',
    prompt: '剪辑结构：0-3 秒展示最终效果或最大反差；3-8 秒说明问题；8 秒后进入步骤拆解。字幕使用短句，每屏不超过 14 个字。',
    tags: ['开头', '留存', '短视频'],
    level: 'basic',
  },
];

function nowIso() {
  return new Date().toISOString();
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 20 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function requireAdmin(req) {
  if (!ADMIN_TOKEN) return false;
  return req.headers['x-admin-token'] === ADMIN_TOKEN;
}

function publicUrlFor(req, value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  const clean = value.startsWith('/') ? value : `/${value}`;
  if (PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL}${clean}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `${HOST}:${PORT}`;
  return `${proto}://${host}${clean}`;
}

function saveBase64Image(input) {
  if (!input || typeof input !== 'string') return '';
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return '';
  const mime = match[1];
  const ext = mime.includes('jpeg') ? '.jpg' : `.${mime.split('/')[1] || 'png'}`;
  const fileName = `${Date.now()}-${randomUUID()}${extname(ext) || '.png'}`;
  const fullPath = join(UPLOAD_DIR, fileName);
  writeFileSync(fullPath, Buffer.from(match[2], 'base64'));
  return `/resource-api/uploads/${fileName}`;
}

function upsertCategory(category) {
  const fallback = CATEGORY_META[category.id] || {};
  db.prepare(`
    INSERT INTO categories (id, title, description, accent, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      accent = excluded.accent,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at
  `).run(
    category.id,
    category.title || fallback.title || category.id,
    category.description || fallback.description || '',
    category.accent || fallback.accent || 'cyan',
    Number(category.sortOrder ?? fallback.sortOrder ?? 0),
    nowIso(),
  );
}

function normalizeItem(input, categoryId) {
  const id = String(input.id || `${categoryId}-${randomUUID()}`).trim();
  if (!id) throw new Error('item.id is required');
  const title = String(input.title || input.name || '').trim();
  if (!title) throw new Error('item.title is required');
  const imageFromBase64 = saveBase64Image(input.imageBase64 || input.imageData);
  return {
    id,
    categoryId,
    title,
    description: String(input.description || '').trim(),
    prompt: input.prompt == null ? null : String(input.prompt),
    imageUrl: imageFromBase64 || String(input.imageUrl || '').trim() || null,
    imageAlt: String(input.imageAlt || input.imageDescription || input.title || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => String(tag)).filter(Boolean) : [],
    level: input.level === 'pro' ? 'pro' : 'basic',
    sortOrder: Number(input.sortOrder || 0),
  };
}

function upsertItem(input, categoryId) {
  const item = normalizeItem(input, categoryId);
  db.prepare(`
    INSERT INTO items (
      id, category_id, title, description, prompt, image_url, image_alt, tags_json, level, sort_order, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category_id = excluded.category_id,
      title = excluded.title,
      description = excluded.description,
      prompt = excluded.prompt,
      image_url = COALESCE(excluded.image_url, items.image_url),
      image_alt = excluded.image_alt,
      tags_json = excluded.tags_json,
      level = excluded.level,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at
  `).run(
    item.id,
    item.categoryId,
    item.title,
    item.description,
    item.prompt,
    item.imageUrl,
    item.imageAlt,
    JSON.stringify(item.tags),
    item.level,
    item.sortOrder,
    nowIso(),
  );
  return item;
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (count > 0) return;
  for (const [id, meta] of Object.entries(CATEGORY_META)) {
    upsertCategory({ id, ...meta });
  }
  SEED_ITEMS.forEach((item, index) => upsertItem({ ...item, sortOrder: index + 1 }, item.category));
}

function getPayload(req) {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all();
  const itemStmt = db.prepare('SELECT * FROM items WHERE category_id = ? ORDER BY sort_order ASC, updated_at DESC');
  const result = categories.map((category) => {
    const fallback = CATEGORY_META[category.id] || {};
    const rows = itemStmt.all(category.id);
    return {
      id: category.id,
      title: category.title,
      titleKey: `resourceLibrary.categories.${category.id}.title`,
      fallbackTitle: category.title,
      description: category.description,
      descriptionKey: `resourceLibrary.categories.${category.id}.description`,
      fallbackDescription: category.description,
      accent: category.accent || fallback.accent || 'cyan',
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        prompt: row.prompt || undefined,
        imageUrl: publicUrlFor(req, row.image_url),
        imageAlt: row.image_alt || row.title,
        tags: JSON.parse(row.tags_json || '[]'),
        level: row.level === 'pro' ? 'pro' : 'basic',
      })),
    };
  });
  const updatedAt = db.prepare(`
    SELECT MAX(updated_at) AS updatedAt FROM (
      SELECT updated_at FROM categories
      UNION ALL
      SELECT updated_at FROM items
    )
  `).get().updatedAt || nowIso();
  return {
    version: `remote-${new Date(updatedAt).getTime() || Date.now()}`,
    updatedAt,
    categories: result,
  };
}

seedIfEmpty();

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'OPTIONS') return sendJson(res, 204, {});

    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/health')) {
      return sendJson(res, 200, { ok: true, service: 'axonclawx-resource-library-api' });
    }

    if (req.method === 'GET' && url.pathname === '/api/resource-library/latest') {
      return sendJson(res, 200, getPayload(req));
    }

    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      return sendJson(res, 404, { ok: false, error: 'Use nginx static mapping for uploads' });
    }

    if (req.method === 'POST' && url.pathname === '/api/resource-library/items') {
      if (!requireAdmin(req)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      const body = await readBody(req);
      const categoryId = String(body.category || body.categoryId || '').trim();
      if (!CATEGORY_META[categoryId]) return sendJson(res, 400, { ok: false, error: 'Invalid category' });
      upsertCategory({ id: categoryId, ...CATEGORY_META[categoryId] });
      const item = upsertItem(body, categoryId);
      return sendJson(res, 200, { ok: true, item });
    }

    if (req.method === 'POST' && url.pathname === '/api/resource-library/import') {
      if (!requireAdmin(req)) return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      const body = await readBody(req);
      const categories = Array.isArray(body.categories) ? body.categories : [];
      let imported = 0;
      for (const source of categories) {
        const category = source && typeof source === 'object' ? source : {};
        const id = String(category.id || '').trim();
        if (!CATEGORY_META[id]) continue;
        upsertCategory({
          id,
          title: category.title || category.fallbackTitle || CATEGORY_META[id].title,
          description: category.description || category.fallbackDescription || CATEGORY_META[id].description,
          accent: category.accent || CATEGORY_META[id].accent,
          sortOrder: category.sortOrder || CATEGORY_META[id].sortOrder,
        });
        const items = Array.isArray(category.items) ? category.items : [];
        for (const item of items) {
          upsertItem(item, id);
          imported += 1;
        }
      }
      return sendJson(res, 200, { ok: true, imported, payload: getPayload(req) });
    }

    return sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: String(err?.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Resource library API listening on http://${HOST}:${PORT}`);
});

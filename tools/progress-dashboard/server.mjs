import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const DASH_DIR = path.join(ROOT, 'tools', 'progress-dashboard');
const TASKS_FILE = path.join(DASH_DIR, 'tasks.json');
const INDEX_FILE = path.join(DASH_DIR, 'index.html');
const PORT = Number(process.env.PORT || 8787);

function safeReadJson(file, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
  } catch {
    return '';
  }
}

function computeWeightedProgress(tasks = []) {
  const totalWeight = tasks.reduce((s, t) => s + (Number(t.weight) || 0), 0) || 1;
  const weighted = tasks.reduce((s, t) => s + (Number(t.progress) || 0) * (Number(t.weight) || 0), 0);
  return Math.round(weighted / totalWeight);
}

function cjkDebtCountForFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    let count = 0;
    for (const line of text.split('\n')) {
      const s = line.trim();
      if (s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('*/')) continue;
      if (/[\u4e00-\u9fff]/.test(line)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

function walkTsxFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTsxFiles(p, out);
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function computeGroupProgress() {
  const fileGroupA = [
    'src/renderer/views/DashboardView.tsx',
    'src/renderer/components/chat/ChatView.tsx',
    'src/renderer/views/SessionsView.tsx',
    'src/renderer/views/ModelsView.tsx',
    'src/renderer/views/RunView.tsx',
    'src/renderer/views/SystemView.tsx',
  ].map((p) => path.join(ROOT, p));

  const fileGroupB = [
    'src/renderer/views/CronView.tsx',
    'src/renderer/views/NodesView.tsx',
    'src/renderer/views/AlertsView.tsx',
    'src/renderer/views/UsageView.tsx',
    'src/renderer/views/LogsView.tsx',
  ].map((p) => path.join(ROOT, p));

  const dirGroupC = path.join(ROOT, 'src/renderer/views/ConfigurationCenter');

  const calcFiles = (files) => {
    const existing = files.filter((f) => fs.existsSync(f));
    const total = existing.length || 1;
    const done = existing.filter((f) => cjkDebtCountForFile(f) === 0).length;
    const debtLines = existing.reduce((s, f) => s + cjkDebtCountForFile(f), 0);
    return { total, done, progress: Math.round((done / total) * 100), debtLines };
  };

  const calcDir = (dir) => {
    const files = walkTsxFiles(dir).filter((f) => !f.includes('/clawdeckx/'));
    const total = files.length || 1;
    const done = files.filter((f) => cjkDebtCountForFile(f) === 0).length;
    const debtLines = files.reduce((s, f) => s + cjkDebtCountForFile(f), 0);
    return { total, done, progress: Math.round((done / total) * 100), debtLines };
  };

  return {
    t2: calcFiles(fileGroupA),
    t3: calcFiles(fileGroupB),
    t4: calcDir(dirGroupC),
  };
}

function scanI18nDebt() {
  const script = String.raw`python3 - <<'PY'
import pathlib,re,json
root=pathlib.Path('src/renderer')
files=[]
for p in root.rglob('*.tsx'):
    sp=str(p)
    if '/clawdeckx/' in sp:
        continue
    text=p.read_text(errors='ignore').splitlines()
    cnt=0
    for line in text:
        s=line.strip()
        if s.startswith('//') or s.startswith('*') or s.startswith('/*') or s.startswith('*/'):
            continue
        if re.search(r'[\u4e00-\u9fff]', line):
            cnt += 1
    if cnt:
        files.append({'file':sp,'count':cnt})
print(json.dumps({'files':len(files), 'top':sorted(files,key=lambda x:x['count'], reverse=True)[:15]}))
PY`;
  const out = sh(script);
  try {
    return JSON.parse(out || '{}');
  } catch {
    return { files: 0, top: [] };
  }
}

function patchTaskProgress(tasks, id, progress) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.progress = Math.max(0, Math.min(100, Math.round(progress)));
  t.status = t.progress >= 100 ? 'done' : t.progress > 0 ? 'in_progress' : 'todo';
  t.updatedAt = new Date().toISOString();
}

function buildStatus() {
  const data = safeReadJson(TASKS_FILE, { tasks: [] });
  const tasks = Array.isArray(data.tasks) ? JSON.parse(JSON.stringify(data.tasks)) : [];

  const groups = computeGroupProgress();
  patchTaskProgress(tasks, 't2', groups.t2.progress);
  patchTaskProgress(tasks, 't3', groups.t3.progress);
  patchTaskProgress(tasks, 't4', groups.t4.progress);

  if (tasks.find((t) => t.id === 't2')?.progress >= 100 && tasks.find((t) => t.id === 't3')?.progress >= 100 && tasks.find((t) => t.id === 't4')?.progress >= 100) {
    patchTaskProgress(tasks, 't5', 60);
  }

  const weightedProgress = computeWeightedProgress(tasks);

  const commits = sh('git log --oneline -n 10')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(' ');
      return { hash: line.slice(0, i), message: line.slice(i + 1) };
    });

  const changed = sh('git status --short')
    .split('\n')
    .filter(Boolean)
    .map((x) => x.trim());

  const debt = scanI18nDebt();

  return {
    project: data.project || 'AxonClawX',
    owner: data.owner || 'assistant',
    serverTime: new Date().toISOString(),
    refreshSeconds: Number(data.refreshSeconds || 10),
    weightedProgress,
    summary: {
      taskTotal: tasks.length,
      taskDone: tasks.filter((t) => t.status === 'done').length,
      taskInProgress: tasks.filter((t) => t.status === 'in_progress').length,
      taskTodo: tasks.filter((t) => t.status === 'todo').length,
      i18nDebtFiles: Number(debt.files || 0),
    },
    liveProgress: {
      t2: groups.t2,
      t3: groups.t3,
      t4: groups.t4,
    },
    tasks,
    commits,
    changed,
    topDebtFiles: debt.top || [],
  };
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/api/status') {
    const body = JSON.stringify(buildStatus());
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
    return;
  }

  if (url === '/' || url.startsWith('/index.html')) {
    try {
      const html = fs.readFileSync(INDEX_FILE, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('index.html not found');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Progress dashboard running: http://localhost:${PORT}`);
});

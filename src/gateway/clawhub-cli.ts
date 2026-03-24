/**
 * ClawHub CLI - 通过 npx clawhub 管理技能
 * 对接 OpenClaw 真实技能体系
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
const SKILLS_DIR = path.join(OPENCLAW_DIR, 'skills');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function stripAnsi(str: string): string {
  const esc = String.fromCharCode(27);
  const csi = String.fromCharCode(155);
  const pattern = `(?:${esc}|${csi})[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`;
  return str.replace(new RegExp(pattern, 'g'), '').trim();
}

function runClawhub(args: string[], workDir = OPENCLAW_DIR): Promise<string> {
  return new Promise((resolve, reject) => {
    ensureDir(workDir);
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(cmd, ['clawhub@latest', ...args], {
      cwd: workDir,
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0', CLAWHUB_WORKDIR: workDir },
      shell: process.platform === 'win32',
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d.toString(); });
    child.stderr?.on('data', (d) => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 || code === null) resolve(stdout.trim());
      else reject(new Error(stderr || stdout || `Exit ${code}`));
    });
  });
}

export interface InstalledSkill {
  slug: string;
  version: string;
  source?: string;
  baseDir?: string;
  name?: string;
  description?: string;
}

export interface SearchSkill {
  slug: string;
  name: string;
  description: string;
  version: string;
  author?: string;
}

/**
 * 从 openclaw.json 读取 workspace 路径，扫描 <workspace>/skills/ 下的技能
 * OpenClaw 技能加载优先级：workspace > ~/.openclaw/skills > bundled
 */
export function listWorkspaceSkills(): InstalledSkill[] {
  try {
    const configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
    if (!fs.existsSync(configPath)) return [];
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw) as { agents?: { list?: Array<{ workspace?: string }> } };
    const workspace = config.agents?.list?.[0]?.workspace;
    if (!workspace || typeof workspace !== 'string') return [];
    const resolved = workspace.startsWith('~') ? path.join(os.homedir(), workspace.slice(1)) : workspace;
    const skillsDir = path.join(resolved, 'skills');
    if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) return [];
    const scanned = scanSkillsFromDir(skillsDir);
    return scanned.map((s) => ({
      slug: s.slug,
      version: 'workspace',
      source: 'openclaw-workspace',
      baseDir: s.baseDir,
      name: s.name,
      description: s.description,
    }));
  } catch {
    return [];
  }
}

/**
 * 直接扫描 ~/.openclaw/skills 目录（clawhub list 输出格式可能变化时的兜底）
 */
function listManagedSkillsFromDisk(): InstalledSkill[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const scanned = scanSkillsFromDir(SKILLS_DIR);
  return scanned.map((s) => ({
    slug: s.slug,
    version: 'managed',
    source: 'openclaw-managed',
    baseDir: s.baseDir,
    name: s.name,
    description: s.description,
  }));
}

export async function listInstalled(): Promise<InstalledSkill[]> {
  const seen = new Set<string>();
  const result: InstalledSkill[] = [];

  // 1. Workspace 技能（优先级最高）
  const workspaceSkills = listWorkspaceSkills();
  for (const s of workspaceSkills) {
    if (!seen.has(s.slug)) {
      seen.add(s.slug);
      result.push(s);
    }
  }

  // 2. ClawHub list（~/.openclaw/skills）
  try {
    const output = await runClawhub(['list']);
    if (output && !output.includes('No installed skills')) {
      const parsed: InstalledSkill[] = [];
      for (const line of output.split('\n').filter((l) => l.trim())) {
        const clean = stripAnsi(line);
        const m = clean.match(/^(\S+)\s+v?(\d+\.\S+)/);
        if (m) {
          parsed.push({
            slug: m[1],
            version: m[2],
            source: 'openclaw-managed',
            baseDir: path.join(SKILLS_DIR, m[1]),
          });
        }
      }
      for (const s of parsed) {
        if (!seen.has(s.slug)) {
          seen.add(s.slug);
          result.push(s);
        }
      }
    }
  } catch {
    /* clawhub list 失败时用磁盘扫描兜底 */
  }

  // 3. 磁盘扫描兜底（clawhub list 输出格式变化时）
  const managedFromDisk = listManagedSkillsFromDisk();
  for (const s of managedFromDisk) {
    if (!seen.has(s.slug)) {
      seen.add(s.slug);
      result.push(s);
    }
  }

  return result;
}

export async function search(query: string, limit?: number): Promise<SearchSkill[]> {
  try {
    const args = query.trim() ? ['search', query.trim()] : ['explore'];
    if (limit) args.push('--limit', String(limit));
    const output = await runClawhub(args);
    if (!output || output.includes('No skills found')) return [];
    return output.split('\n').filter((l) => l.trim()).map((line) => {
      const clean = stripAnsi(line);
      let m = clean.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+)$/);
      if (m) {
        const desc = m[3].replace(/\(\d+\.\d+\)$/, '').trim();
        return { slug: m[1], name: m[1], version: m[2], description: desc };
      }
      m = clean.match(/^(\S+)\s+(.+)$/);
      if (m) {
        const desc = m[2].replace(/\(\d+\.\d+\)$/, '').trim();
        return { slug: m[1], name: m[1], version: 'latest', description: desc };
      }
      return null;
    }).filter((s): s is SearchSkill => s !== null);
  } catch (err) {
    console.error('[ClawHub] search error:', err);
    throw err;
  }
}

export async function install(slug: string, version?: string): Promise<void> {
  const args = ['install', slug];
  if (version) args.push('--version', version);
  await runClawhub(args);
}

export async function uninstall(slug: string): Promise<void> {
  const skillDir = path.join(SKILLS_DIR, slug);
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true, force: true });
  }
  const lockFile = path.join(OPENCLAW_DIR, '.clawhub', 'lock.json');
  if (fs.existsSync(lockFile)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (lock.skills?.[slug]) {
        delete lock.skills[slug];
        fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2));
      }
    } catch { /* ignore */ }
  }
}

export function getSkillsDir(): string {
  return SKILLS_DIR;
}

function searchSkillInDir(dir: string, skillKey: string): string | null {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  const direct = path.join(dir, skillKey);
  if (fs.existsSync(direct) && fs.existsSync(path.join(direct, 'SKILL.md'))) return direct;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name, 'SKILL.md');
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
      if (fm) {
        const nameMatch = fm[1].match(/^\s*name\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
        if (nameMatch && nameMatch[1].trim().toLowerCase() === skillKey.toLowerCase()) {
          return path.join(dir, e.name);
        }
      }
    }
  }
  return null;
}

export function openSkillPath(skillKey: string, baseDir?: string): string | null {
  if (baseDir && fs.existsSync(baseDir)) return baseDir;
  // 1. Workspace skills
  const workspaceSkills = listWorkspaceSkills();
  const ws = workspaceSkills.find((s) => s.slug === skillKey || s.slug.toLowerCase() === skillKey.toLowerCase());
  if (ws?.baseDir && fs.existsSync(ws.baseDir)) return ws.baseDir;
  // 2. ~/.openclaw/skills
  const managed = searchSkillInDir(SKILLS_DIR, skillKey);
  if (managed) return managed;
  // 3. 扫描 workspace 目录
  try {
    const configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { agents?: { list?: Array<{ workspace?: string }> } };
      const workspace = config.agents?.list?.[0]?.workspace;
      if (workspace) {
        const resolved = workspace.startsWith('~') ? path.join(os.homedir(), workspace.slice(1)) : workspace;
        const skillsDir = path.join(resolved, 'skills');
        const found = searchSkillInDir(skillsDir, skillKey);
        if (found) return found;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * 扫描指定目录下的技能（含 SKILL.md 的子目录）
 */
export function scanSkillsFromDir(dirPath: string): Array<{ slug: string; name: string; baseDir: string; description?: string }> {
  const results: Array<{ slug: string; name: string; baseDir: string; description?: string }> = [];
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return results;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skillDir = path.join(dirPath, e.name);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;
    try {
      const raw = fs.readFileSync(skillMd, 'utf8');
      const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
      let name = e.name;
      let description = '';
      if (fm) {
        const nameMatch = fm[1].match(/^\s*name\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
        if (nameMatch) name = nameMatch[1].trim();
        const descMatch = fm[1].match(/^\s*description\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
        if (descMatch) description = descMatch[1].trim();
      }
      results.push({ slug: e.name, name, baseDir: skillDir, description: description || undefined });
    } catch { /* skip */ }
  }
  return results;
}

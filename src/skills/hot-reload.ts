/**
 * 技能热重载模块 (Skill Hot-Reload)
 * 
 * 功能:
 * - 监听 skills/ 目录文件变化
 * - 自动重新加载修改的技能
 * - 保持运行状态，实时生效
 * 
 * @module skills/hot-reload
 */

import chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// 类型定义
// ============================================================================

export interface SkillModule {
  name: string;
  description: string;
  location: string;
  metadata?: {
    openclaw?: {
      emoji?: string;
      project?: string;
    };
  };
  // 动态加载的技能模块
  handler?: any;
}

export interface HotReloadConfig {
  watchDir: string;
  debounceMs: number;
  verbose: boolean;
}

// ============================================================================
// 全局状态
// ============================================================================

const skillRegistry = new Map<string, SkillModule>();
const reloadQueue = new Map<string, NodeJS.Timeout>();

const defaultConfig: HotReloadConfig = {
  watchDir: path.resolve(process.cwd(), 'skills'),
  debounceMs: 300,
  verbose: true,
};

let watcher: chokidar.FSWatcher | null = null;
let isRunning = false;

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 从 SKILL.md 文件解析技能元数据
 */
function parseSkillMetadata(skillPath: string): SkillModule | null {
  try {
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    // 解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      log(`⚠️  无效的 SKILL.md 格式 (无 frontmatter): ${skillPath}`, 'warn');
      return null;
    }

    const yamlContent = frontmatterMatch[1];
    const nameMatch = yamlContent.match(/name:\s*["']?([^"'\n]+)["']?/);
    const descMatch = yamlContent.match(/description:\s*["']?([^"'\n]+)["']?/);
    const locationMatch = yamlContent.match(/metadata:\s*\n\s*openclaw:\s*\n\s*emoji:\s*["']?([^"'\n]+)["']?/);

    if (!nameMatch) {
      log(`⚠️  无法解析技能名称：${skillPath}`, 'warn');
      return null;
    }

    return {
      name: nameMatch[1].trim(),
      description: descMatch ? descMatch[1].trim() : 'No description',
      location: skillPath,
      metadata: locationMatch ? {
        openclaw: {
          emoji: locationMatch[1].trim(),
        },
      } : undefined,
    };
  } catch (error) {
    log(`❌ 解析技能元数据失败：${skillPath}`, 'error');
    log(`   ${error instanceof Error ? error.message : String(error)}`, 'error');
    return null;
  }
}

/**
 * 重新加载单个技能
 */
export async function reloadSkill(skillPath: string): Promise<boolean> {
  const absolutePath = path.resolve(skillPath);
  const skillDir = path.dirname(absolutePath);
  const skillName = path.basename(skillDir);

  log(`🔄 检测到技能变化：${skillName}`, 'info');

  try {
    // 验证 SKILL.md 是否存在
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
      log(`⚠️  跳过 (无 SKILL.md): ${skillDir}`, 'warn');
      return false;
    }

    // 解析新的技能元数据
    const newSkill = parseSkillMetadata(skillMdPath);
    if (!newSkill) {
      log(`❌ 技能解析失败：${skillDir}`, 'error');
      return false;
    }

    // 更新注册表
    const oldSkill = skillRegistry.get(skillName);
    skillRegistry.set(skillName, newSkill);

    if (oldSkill) {
      log(`✅ 技能已重载：${skillName} (${oldSkill.name} → ${newSkill.name})`, 'success');
    } else {
      log(`✅ 新技能已加载：${skillName}`, 'success');
    }

    // 触发自定义事件 (供外部监听)
    if (typeof process !== 'undefined' && process.emit) {
      process.emit('skill:reloaded', {
        skillName,
        oldSkill,
        newSkill,
        timestamp: Date.now(),
      });
    }

    return true;
  } catch (error) {
    log(`❌ 重载技能失败：${skillName}`, 'error');
    log(`   ${error instanceof Error ? error.message : String(error)}`, 'error');
    return false;
  }
}

/**
 * 扫描并加载所有现有技能
 */
export async function scanAndLoadSkills(watchDir: string): Promise<number> {
  const loadedCount = 0;

  try {
    if (!fs.existsSync(watchDir)) {
      log(`⚠️  技能目录不存在：${watchDir}`, 'warn');
      return 0;
    }

    const entries = fs.readdirSync(watchDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(watchDir, entry.name);
      const skillMdPath = path.join(skillDir, 'SKILL.md');

      if (fs.existsSync(skillMdPath)) {
        const skill = parseSkillMetadata(skillMdPath);
        if (skill) {
          skillRegistry.set(skill.name, skill);
          log(`📦 已加载技能：${skill.name}`, 'info');
        }
      }
    }

    return skillRegistry.size;
  } catch (error) {
    log(`❌ 扫描技能失败：${error instanceof Error ? error.message : String(error)}`, 'error');
    return 0;
  }
}

/**
 * 启动热重载监听
 */
export function startHotReload(config?: Partial<HotReloadConfig>): void {
  if (isRunning) {
    log('⚠️  热重载已在运行中', 'warn');
    return;
  }

  const finalConfig = { ...defaultConfig, ...config };
  watcher = chokidar.watch(finalConfig.watchDir, {
    ignored: /(^|[\/\\])\../, // 忽略隐藏文件
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: finalConfig.debounceMs,
      pollInterval: 100,
    },
  });

  // 监听 SKILL.md 文件变化
  watcher.on('change', (filePath) => {
    if (path.basename(filePath) === 'SKILL.md') {
      // 防抖处理
      const skillDir = path.dirname(filePath);
      
      if (reloadQueue.has(skillDir)) {
        clearTimeout(reloadQueue.get(skillDir)!);
      }

      const timeout = setTimeout(() => {
        reloadQueue.delete(skillDir);
        reloadSkill(filePath);
      }, finalConfig.debounceMs);

      reloadQueue.set(skillDir, timeout);
    }
  });

  // 监听新技能目录创建
  watcher.on('addDir', (dirPath) => {
    const skillMdPath = path.join(dirPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      setTimeout(() => reloadSkill(skillMdPath), finalConfig.debounceMs);
    }
  });

  // 监听技能目录删除
  watcher.on('unlinkDir', (dirPath) => {
    const skillMdPath = path.join(dirPath, 'SKILL.md');
    const skill = parseSkillMetadata(skillMdPath);
    if (skill) {
      skillRegistry.delete(skill.name);
      log(`🗑️  技能已移除：${skill.name}`, 'info');
    }
  });

  watcher.on('error', (error) => {
    log(`❌ 文件监听错误：${error.message}`, 'error');
  });

  isRunning = true;
  log(`👁️  热重载监听已启动：${finalConfig.watchDir}`, 'success');
  log(`📊 已加载技能数：${skillRegistry.size}`, 'info');
}

/**
 * 停止热重载监听
 */
export function stopHotReload(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    isRunning = false;
    log('🛑 热重载监听已停止', 'info');
  }
}

/**
 * 获取当前运行状态
 */
export function getStatus(): {
  isRunning: boolean;
  skillCount: number;
  skills: string[];
} {
  return {
    isRunning,
    skillCount: skillRegistry.size,
    skills: Array.from(skillRegistry.keys()),
  };
}

/**
 * 获取已加载的技能列表
 */
export function getLoadedSkills(): SkillModule[] {
  return Array.from(skillRegistry.values());
}

/**
 * 日志输出工具
 */
function log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  if (!defaultConfig.verbose && level === 'info') return;

  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
  }[level];

  console.log(`[SkillHotReload] ${prefix} ${message}`);
}

// ============================================================================
// CLI 入口 (独立运行时)
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const watchDir = args[0] || defaultConfig.watchDir;
  const verbose = args.includes('--verbose') || args.includes('-v');

  defaultConfig.watchDir = path.resolve(watchDir);
  defaultConfig.verbose = verbose;

  log('🚀 技能热重载服务启动', 'success');
  log(`📂 监听目录：${defaultConfig.watchDir}`, 'info');

  // 初始扫描
  scanAndLoadSkills(defaultConfig.watchDir);

  // 启动监听
  startHotReload();

  // 优雅退出
  process.on('SIGINT', () => {
    log('\n👋 正在关闭...', 'info');
    stopHotReload();
    process.exit(0);
  });

  // 保持运行
  setInterval(() => {
    // 心跳检测 (可选)
  }, 60000);
}

// ============================================================================
// 导出
// ============================================================================

export default {
  startHotReload,
  stopHotReload,
  reloadSkill,
  scanAndLoadSkills,
  getStatus,
  getLoadedSkills,
};

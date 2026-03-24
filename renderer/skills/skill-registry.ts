/**
 * Skill Registry - 技能注册中心
 * 
 * 功能:
 * 1. 技能注册 - 注册技能到系统
 * 2. 技能发现 - 扫描 skills/ 目录自动注册
 * 3. 技能查询 - 获取已注册技能列表
 * 4. 技能管理 - 启用/禁用技能
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';

// ============ 类型定义 ============

export interface Command {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  handler: (...args: unknown[]) => Promise<unknown>;
}

export interface Skill {
  name: string;
  version: string;
  description: string;
  commands: Command[];
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SkillRegistryConfig {
  skillsDir: string;
  autoScan?: boolean;
}

export interface SkillInfo {
  name: string;
  version: string;
  description: string;
  commandCount: number;
  enabled: boolean;
}

// ============ 技能注册表类 ============

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private config: SkillRegistryConfig;

  constructor(config: SkillRegistryConfig) {
    this.config = {
      autoScan: true,
      ...config,
    };
  }

  /**
   * 注册单个技能
   * 
   * @param skill 技能对象
   * @returns boolean 注册是否成功
   */
  register(skill: Skill): boolean {
    if (!skill.name || !skill.version) {
      console.error('[SkillRegistry] 技能必须包含 name 和 version');
      return false;
    }

    if (this.skills.has(skill.name)) {
      console.warn(`[SkillRegistry] 技能 ${skill.name} 已存在，将被覆盖`);
    }

    // 默认启用
    skill.enabled = skill.enabled !== false;

    this.skills.set(skill.name, skill);
    console.log(`[SkillRegistry] 已注册技能：${skill.name} v${skill.version}`);
    return true;
  }

  /**
   * 注销技能
   * 
   * @param skillName 技能名称
   * @returns boolean 注销是否成功
   */
  unregister(skillName: string): boolean {
    if (!this.skills.has(skillName)) {
      console.warn(`[SkillRegistry] 技能 ${skillName} 不存在`);
      return false;
    }

    this.skills.delete(skillName);
    console.log(`[SkillRegistry] 已注销技能：${skillName}`);
    return true;
  }

  /**
   * 获取技能
   * 
   * @param skillName 技能名称
   * @returns Skill | undefined 技能对象
   */
  getSkill(skillName: string): Skill | undefined {
    return this.skills.get(skillName);
  }

  /**
   * 获取所有技能
   * 
   * @returns Skill[] 技能列表
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 获取启用的技能
   * 
   * @returns Skill[] 启用的技能列表
   */
  getEnabledSkills(): Skill[] {
    return Array.from(this.skills.values()).filter(skill => skill.enabled !== false);
  }

  /**
   * 启用/禁用技能
   * 
   * @param skillName 技能名称
   * @param enabled 是否启用
   * @returns boolean 操作是否成功
   */
  setSkillEnabled(skillName: string, enabled: boolean): boolean {
    const skill = this.skills.get(skillName);
    if (!skill) {
      console.error(`[SkillRegistry] 技能 ${skillName} 不存在`);
      return false;
    }

    skill.enabled = enabled;
    console.log(`[SkillRegistry] 技能 ${skillName} 已${enabled ? '启用' : '禁用'}`);
    return true;
  }

  /**
   * 检查技能是否存在
   * 
   * @param skillName 技能名称
   * @returns boolean 是否存在
   */
  hasSkill(skillName: string): boolean {
    return this.skills.has(skillName);
  }

  /**
   * 获取技能信息摘要
   * 
   * @returns SkillInfo[] 技能信息列表
   */
  getSkillSummaries(): SkillInfo[] {
    return Array.from(this.skills.values()).map(skill => ({
      name: skill.name,
      version: skill.version,
      description: skill.description,
      commandCount: skill.commands?.length || 0,
      enabled: skill.enabled !== false,
    }));
  }

  /**
   * 自动扫描并注册技能
   * 
   * 扫描 skills/ 目录，查找并注册所有技能模块
   */
  async scanAndRegister(): Promise<void> {
    const skillsDir = this.config.skillsDir;
    
    try {
      const entries = await readdir(skillsDir);
      
      for (const entry of entries) {
        // 跳过目录和非 TS 文件
        const fullPath = join(skillsDir, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          continue; // 跳过目录
        }

        if (!entry.endsWith('.ts') && !entry.endsWith('.js')) {
          continue; // 跳过非代码文件
        }

        if (entry.includes('.test.') || entry.includes('.spec.')) {
          continue; // 跳过测试文件
        }

        if (entry === 'index.ts' || entry === 'skill-registry.ts' || entry === 'skill-invoker.ts') {
          continue; // 跳过索引和注册文件
        }

        // 尝试加载技能模块
        try {
          await this.loadSkillModule(fullPath, entry);
        } catch (error) {
          console.error(`[SkillRegistry] 加载技能 ${entry} 失败:`, error);
        }
      }

      console.log(`[SkillRegistry] 技能扫描完成，共注册 ${this.skills.size} 个技能`);
    } catch (error) {
      console.error('[SkillRegistry] 扫描技能目录失败:', error);
      throw error;
    }
  }

  /**
   * 加载技能模块
   * 
   * @param fullPath 文件完整路径
   * @param fileName 文件名
   */
  private async loadSkillModule(fullPath: string, fileName: string): Promise<void> {
    // 移除扩展名获取技能名
    const skillName = fileName.replace(extname(fileName), '');
    
    // 动态导入模块
    const module = await import(fullPath);
    
    // 查找技能对象 (优先查找导出的类或对象)
    let skillInstance: unknown = module.default;
    
    // 如果没有 default 导出，尝试查找命名导出
    if (!skillInstance) {
      // 尝试查找 {SkillName}Skill 模式的导出
      const className = `${skillName.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('')}Skill`;
      
      skillInstance = module[className];
    }

    // 如果是类，实例化它
    if (typeof skillInstance === 'function' && skillInstance.prototype) {
      skillInstance = new skillInstance();
    }

    // 如果实例有 toSkill() 方法，调用它获取 Skill 对象
    if (skillInstance && typeof (skillInstance as any).toSkill === 'function') {
      const skill = (skillInstance as any).toSkill();
      if (skill) {
        this.register(skill);
      }
    }
    // 如果实例本身就是 Skill 对象
    else if (skillInstance && typeof skillInstance === 'object' && 'name' in skillInstance && 'version' in skillInstance) {
      this.register(skillInstance as Skill);
    }
    // 尝试从模块中查找 skill 定义
    else {
      // 查找模块中是否有 skill 常量
      for (const key of Object.keys(module)) {
        const exported = module[key];
        if (exported && typeof exported === 'object' && 'name' in exported && 'version' in exported) {
          this.register(exported as Skill);
          break;
        }
      }
    }
  }

  /**
   * 导出技能列表为 JSON
   * 
   * @returns string JSON 字符串
   */
  exportToJson(): string {
    return JSON.stringify(this.getSkillSummaries(), null, 2);
  }

  /**
   * 清空所有技能
   */
  clear(): void {
    this.skills.clear();
    console.log('[SkillRegistry] 已清空所有技能');
  }

  /**
   * 获取技能数量
   * 
   * @returns number 技能数量
   */
  count(): number {
    return this.skills.size;
  }
}

// ============ 默认导出单例 ============

// 默认技能目录
const DEFAULT_SKILLS_DIR = join(process.cwd(), 'src/renderer/skills');

export const skillRegistry = new SkillRegistry({
  skillsDir: DEFAULT_SKILLS_DIR,
  autoScan: true,
});

export default skillRegistry;

/**
 * Skill Discovery System - 技能自动发现与注册系统
 * 
 * 功能:
 * 1. 技能扫描 - 扫描 skills/ 目录识别技能包
 * 2. 技能注册 - 自动注册到技能列表，生成索引
 * 3. 技能搜索 - 按名称/标签/功能搜索
 * 4. 技能文档 - 自动生成技能列表文档
 * 
 * @module skill-discovery
 */

import { readdir, readFile, stat, writeFile, mkdir } from 'fs/promises';
import { join, resolve, dirname, extname } from 'path';
import { existsSync } from 'fs';

// ============ 类型定义 ============

/**
 * 技能元数据 (从 SKILL.md 解析)
 */
export interface SkillMetadata {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 元数据信息 */
  metadata?: {
    openclaw?: {
      emoji?: string;
      project?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  /** 技能标签 (从描述中提取或手动定义) */
  tags?: string[];
  /** 技能分类 */
  category?: string;
  /** 触发条件说明 */
  trigger?: string;
}

/**
 * 技能包信息
 */
export interface SkillPackage {
  /** 技能目录路径 */
  path: string;
  /** SKILL.md 文件路径 */
  skillMdPath: string;
  /** 解析后的元数据 */
  metadata: SkillMetadata | null;
  /** 是否已解析 */
  parsed: boolean;
  /** 解析错误信息 */
  error?: string;
}

/**
 * 技能索引项
 */
export interface SkillIndexItem {
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 相对路径 */
  relativePath: string;
  /** 绝对路径 */
  absolutePath: string;
  /** 标签列表 */
  tags: string[];
  /** 分类 */
  category?: string;
  /** Emoji 图标 */
  emoji?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 最后修改时间 */
  lastModified: number;
}

/**
 * 技能索引
 */
export interface SkillIndex {
  /** 索引版本 */
  version: string;
  /** 生成时间 */
  generatedAt: number;
  /** 技能总数 */
  totalSkills: number;
  /** 启用的技能数 */
  enabledCount: number;
  /** 技能列表 */
  skills: SkillIndexItem[];
  /** 按名称索引 */
  byName: Record<string, SkillIndexItem>;
  /** 按标签索引 */
  byTag: Record<string, SkillIndexItem[]>;
  /** 按分类索引 */
  byCategory: Record<string, SkillIndexItem[]>;
}

/**
 * 技能扫描配置
 */
export interface SkillDiscoveryConfig {
  /** 技能根目录 */
  skillsRootDir: string;
  /** 索引文件路径 */
  indexPath?: string;
  /** 是否自动扫描子目录 */
  scanSubDirs?: boolean;
  /** 最大扫描深度 */
  maxDepth?: number;
  /** 是否生成文档 */
  generateDocs?: boolean;
  /** 文档输出路径 */
  docsOutputPath?: string;
}

/**
 * 搜索结果
 */
export interface SearchResults {
  /** 搜索关键词 */
  query: string;
  /** 搜索类型 */
  searchType: 'name' | 'tag' | 'description' | 'all';
  /** 匹配结果 */
  matches: SkillIndexItem[];
  /** 总数 */
  total: number;
}

// ============ 技能发现器类 ============

export class SkillDiscovery {
  private config: Required<SkillDiscoveryConfig>;
  private index: SkillIndex | null = null;
  private cache: Map<string, SkillPackage> = new Map();

  constructor(config: SkillDiscoveryConfig) {
    this.config = {
      skillsRootDir: config.skillsRootDir,
      indexPath: config.indexPath || join(config.skillsRootDir, 'skill-index.json'),
      scanSubDirs: config.scanSubDirs ?? true,
      maxDepth: config.maxDepth ?? 5,
      generateDocs: config.generateDocs ?? true,
      docsOutputPath: config.docsOutputPath || join(config.skillsRootDir, 'SKILLS-LIST.md'),
    };
  }

  /**
   * 扫描技能目录
   * 
   * @param customDir 自定义扫描目录 (可选)
   * @returns Promise<SkillPackage[]> 技能包列表
   */
  async scanSkills(customDir?: string): Promise<SkillPackage[]> {
    const scanDir = customDir || this.config.skillsRootDir;
    const packages: SkillPackage[] = [];

    console.log(`[SkillDiscovery] 开始扫描技能目录：${scanDir}`);

    try {
      const entries = await this.scanDirectoryRecursive(scanDir, 0);
      
      for (const entry of entries) {
        const skillPackage = await this.parseSkillPackage(entry);
        packages.push(skillPackage);
        this.cache.set(skillPackage.path, skillPackage);
      }

      console.log(`[SkillDiscovery] 扫描完成，发现 ${packages.length} 个技能包`);
      return packages;
    } catch (error) {
      console.error('[SkillDiscovery] 扫描失败:', error);
      throw error;
    }
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectoryRecursive(dir: string, depth: number): Promise<string[]> {
    if (depth > this.config.maxDepth) {
      return [];
    }

    const skillMdPaths: string[] = [];
    
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // 跳过隐藏目录和 node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          // 递归扫描子目录
          const subDirResults = await this.scanDirectoryRecursive(fullPath, depth + 1);
          skillMdPaths.push(...subDirResults);
        } else if (entry.isFile() && entry.name === 'SKILL.md') {
          // 找到 SKILL.md 文件
          skillMdPaths.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`[SkillDiscovery] 扫描目录 ${dir} 失败:`, error);
    }

    return skillMdPaths;
  }

  /**
   * 解析技能包
   */
  private async parseSkillPackage(skillMdPath: string): Promise<SkillPackage> {
    const skillDir = dirname(skillMdPath);
    const packageInfo: SkillPackage = {
      path: skillDir,
      skillMdPath,
      metadata: null,
      parsed: false,
    };

    try {
      const content = await readFile(skillMdPath, 'utf-8');
      const metadata = this.parseSkillMd(content);
      
      packageInfo.metadata = metadata;
      packageInfo.parsed = true;
    } catch (error) {
      packageInfo.error = `解析失败：${error}`;
      console.error(`[SkillDiscovery] 解析技能包失败 ${skillMdPath}:`, error);
    }

    return packageInfo;
  }

  /**
   * 解析 SKILL.md 内容
   */
  private parseSkillMd(content: string): SkillMetadata | null {
    try {
      // 提取 YAML front matter
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontMatterMatch) {
        return null;
      }

      const yamlContent = frontMatterMatch[1];
      const metadata = this.parseYaml(yamlContent);

      // 提取标签 (从描述中)
      if (metadata.description) {
        metadata.tags = this.extractTags(metadata.description);
      }

      // 提取分类 (从描述中的用途说明)
      metadata.category = this.extractCategory(metadata.description);

      // 提取触发条件
      metadata.trigger = this.extractTrigger(content);

      return metadata;
    } catch (error) {
      console.error('[SkillDiscovery] 解析 SKILL.md 失败:', error);
      return null;
    }
  }

  /**
   * 简易 YAML 解析器
   */
  private parseYaml(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');
    let currentKey: string | null = null;
    let currentObject: Record<string, unknown> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // 检查是否是嵌套对象开始
      if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
        currentKey = trimmed.slice(0, -1);
        currentObject = {};
        result[currentKey] = currentObject;
        continue;
      }

      // 检查是否是键值对
      const match = trimmed.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        
        if (currentObject && line.startsWith('  ')) {
          // 嵌套对象的属性
          currentObject[key] = this.parseValue(value);
        } else {
          // 顶层属性
          result[key] = this.parseValue(value);
          currentKey = null;
          currentObject = null;
        }
      }
    }

    return result;
  }

  /**
   * 解析 YAML 值
   */
  private parseValue(value: string): unknown {
    if (!value) {
      return '';
    }

    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 数字
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    return value;
  }

  /**
   * 从描述中提取标签
   */
  private extractTags(description: string): string[] {
    const tags: string[] = [];
    
    // 从编号中提取 (1) (2) (3)
    const numberMatches = description.match(/\(\d+\)\s*([^()]+?)(?=\s*\(|$)/g);
    if (numberMatches) {
      numberMatches.forEach(match => {
        const tag = match.match(/\d+\)\s*(.+?)(?=\s*\(|$)/)?.[1]?.trim();
        if (tag) {
          tags.push(tag);
        }
      });
    }

    // 从冒号前提取
    const colonMatches = description.match(/([^:：]+)[:：]/g);
    if (colonMatches) {
      colonMatches.forEach(match => {
        const tag = match.slice(0, -1).trim();
        if (tag.length > 0 && tag.length < 20) {
          tags.push(tag);
        }
      });
    }

    return [...new Set(tags)]; // 去重
  }

  /**
   * 提取分类
   */
  private extractCategory(description: string): string | undefined {
    const categoryKeywords: Record<string, string[]> = {
      '开发': ['开发', '编程', '代码', 'API', 'WebSocket'],
      '产品': ['产品', '规划', 'PRD', '需求', '用户'],
      '设计': ['设计', 'UI', '组件', '界面'],
      '测试': ['测试', '质量', 'Bug', '用例'],
      '部署': ['部署', '运维', 'CI/CD', '服务器'],
      '文档': ['文档', '说明', 'RFC', 'TDD'],
      'AI': ['AI', 'Agent', '记忆', '多 Agent'],
      '增长': ['增长', '指标', 'A/B 测试', '转化'],
      '战略': ['战略', '规划', '决策', '资源'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        return category;
      }
    }

    return '其他';
  }

  /**
   * 提取触发条件
   */
  private extractTrigger(content: string): string | undefined {
    const triggerMatch = content.match(/触发[:：]?\s*([^\n]+)/i);
    if (triggerMatch) {
      return triggerMatch[1].trim();
    }

    const whenMatch = content.match(/当 [^(]+?\s*时触发/);
    if (whenMatch) {
      return whenMatch[0].trim();
    }

    return undefined;
  }

  /**
   * 生成技能索引
   */
  async generateIndex(packages?: SkillPackage[]): Promise<SkillIndex> {
    const skillPackages = packages || await this.scanSkills();
    const skills: SkillIndexItem[] = [];
    const byName: Record<string, SkillIndexItem> = {};
    const byTag: Record<string, SkillIndexItem[]> = {};
    const byCategory: Record<string, SkillIndexItem[]> = {};

    for (const pkg of skillPackages) {
      if (!pkg.parsed || !pkg.metadata) {
        continue;
      }

      const statInfo = await stat(pkg.skillMdPath);
      const item: SkillIndexItem = {
        name: pkg.metadata.name,
        description: pkg.metadata.description,
        relativePath: pkg.path.replace(this.config.skillsRootDir, ''),
        absolutePath: pkg.path,
        tags: pkg.metadata.tags || [],
        category: pkg.metadata.category,
        emoji: pkg.metadata.metadata?.openclaw?.emoji as string | undefined,
        enabled: true,
        lastModified: statInfo.mtimeMs,
      };

      skills.push(item);
      byName[item.name] = item;

      // 按标签索引
      item.tags.forEach(tag => {
        if (!byTag[tag]) {
          byTag[tag] = [];
        }
        byTag[tag].push(item);
      });

      // 按分类索引
      if (item.category) {
        if (!byCategory[item.category]) {
          byCategory[item.category] = [];
        }
        byCategory[item.category].push(item);
      }
    }

    this.index = {
      version: '1.0.0',
      generatedAt: Date.now(),
      totalSkills: skills.length,
      enabledCount: skills.filter(s => s.enabled).length,
      skills,
      byName,
      byTag,
      byCategory,
    };

    console.log(`[SkillDiscovery] 生成技能索引：${skills.length} 个技能`);
    return this.index;
  }

  /**
   * 保存索引到文件
   */
  async saveIndex(index?: SkillIndex): Promise<void> {
    const indexToSave = index || this.index;
    
    if (!indexToSave) {
      throw new Error('没有可保存的索引');
    }

    await writeFile(this.config.indexPath, JSON.stringify(indexToSave, null, 2), 'utf-8');
    console.log(`[SkillDiscovery] 索引已保存到：${this.config.indexPath}`);
  }

  /**
   * 加载已保存的索引
   */
  async loadIndex(): Promise<SkillIndex | null> {
    if (!existsSync(this.config.indexPath)) {
      return null;
    }

    try {
      const content = await readFile(this.config.indexPath, 'utf-8');
      this.index = JSON.parse(content);
      console.log(`[SkillDiscovery] 已加载索引：${this.index.totalSkills} 个技能`);
      return this.index;
    } catch (error) {
      console.error('[SkillDiscovery] 加载索引失败:', error);
      return null;
    }
  }

  /**
   * 搜索技能 (按名称)
   */
  searchByName(query: string): SkillIndexItem[] {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }

    const queryLower = query.toLowerCase();
    return this.index.skills.filter(skill =>
      skill.name.toLowerCase().includes(queryLower)
    );
  }

  /**
   * 搜索技能 (按标签)
   */
  searchByTag(tag: string): SkillIndexItem[] {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }

    const tagLower = tag.toLowerCase();
    return this.index.skills.filter(skill =>
      skill.tags.some(t => t.toLowerCase().includes(tagLower))
    );
  }

  /**
   * 搜索技能 (按功能/描述)
   */
  searchByFunction(keywords: string): SkillIndexItem[] {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }

    const keywordsLower = keywords.toLowerCase();
    return this.index.skills.filter(skill =>
      skill.description.toLowerCase().includes(keywordsLower)
    );
  }

  /**
   * 综合搜索
   */
  search(query: string, type: 'name' | 'tag' | 'description' | 'all' = 'all'): SearchResults {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }

    let matches: SkillIndexItem[] = [];

    switch (type) {
      case 'name':
        matches = this.searchByName(query);
        break;
      case 'tag':
        matches = this.searchByTag(query);
        break;
      case 'description':
        matches = this.searchByFunction(query);
        break;
      case 'all':
        const byName = this.searchByName(query);
        const byTag = this.searchByTag(query);
        const byDesc = this.searchByFunction(query);
        matches = [...new Set([...byName, ...byTag, ...byDesc])];
        break;
    }

    return {
      query,
      searchType: type,
      matches,
      total: matches.length,
    };
  }

  /**
   * 生成技能文档
   */
  async generateDocumentation(index?: SkillIndex): Promise<string> {
    const indexToUse = index || this.index;
    
    if (!indexToUse) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }

    let doc = '# 技能列表 (Skills List)\n\n';
    doc += `**生成时间**: ${new Date(indexToUse.generatedAt).toLocaleString('zh-CN')}\n`;
    doc += `**技能总数**: ${indexToUse.totalSkills}\n`;
    doc += `**启用数量**: ${indexToUse.enabledCount}\n\n`;
    doc += `---\n\n`;

    // 按分类组织
    const categories = Object.entries(indexToUse.byCategory);
    
    for (const [category, skills] of categories) {
      doc += `## ${category}\n\n`;

      for (const skill of skills) {
        doc += `### ${skill.emoji || '📦'} ${skill.name}\n\n`;
        doc += `**路径**: \`${skill.relativePath}\`\n\n`;
        doc += `**描述**: ${skill.description}\n\n`;
        
        if (skill.tags.length > 0) {
          doc += `**标签**: ${skill.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
        }

        doc += `---\n\n`;
      }
    }

    // 添加使用示例
    doc += `## 使用示例\n\n`;
    doc += `\`\`\`typescript\n`;
    doc += `import { SkillDiscovery } from './skill-discovery';\n\n`;
    doc += `// 创建发现器\n`;
    doc += `const discovery = new SkillDiscovery({\n`;
    doc += `  skillsRootDir: '/path/to/skills',\n`;
    doc += `});\n\n`;
    doc += `// 扫描技能\n`;
    doc += `const packages = await discovery.scanSkills();\n\n`;
    doc += `// 生成索引\n`;
    doc += `const index = await discovery.generateIndex();\n\n`;
    doc += `// 搜索技能\n`;
    doc += `const results = discovery.search('API', 'all');\n`;
    doc += `\`\`\`\n`;

    // 保存文档
    await writeFile(this.config.docsOutputPath, doc, 'utf-8');
    console.log(`[SkillDiscovery] 文档已生成：${this.config.docsOutputPath}`);

    return doc;
  }

  /**
   * 启用/禁用技能
   */
  setSkillEnabled(skillName: string, enabled: boolean): boolean {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }

    const skill = this.index.byName[skillName];
    if (!skill) {
      console.error(`[SkillDiscovery] 技能 ${skillName} 不存在`);
      return false;
    }

    skill.enabled = enabled;
    console.log(`[SkillDiscovery] 技能 ${skillName} 已${enabled ? '启用' : '禁用'}`);
    return true;
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): SkillIndexItem[] {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }
    return this.index.skills;
  }

  /**
   * 获取启用的技能
   */
  getEnabledSkills(): SkillIndexItem[] {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }
    return this.index.skills.filter(s => s.enabled);
  }

  /**
   * 获取技能详情
   */
  getSkillDetail(skillName: string): SkillIndexItem | undefined {
    if (!this.index) {
      throw new Error('索引未生成，请先调用 generateIndex()');
    }
    return this.index.byName[skillName];
  }

  /**
   * 获取索引
   */
  getIndex(): SkillIndex | null {
    return this.index;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.index = null;
    console.log('[SkillDiscovery] 缓存已清空');
  }
}

// ============ 便捷函数 ============

/**
 * 快速扫描并生成索引
 */
export async function quickScan(skillsRootDir: string): Promise<SkillIndex> {
  const discovery = new SkillDiscovery({ skillsRootDir });
  await discovery.scanSkills();
  return discovery.generateIndex();
}

/**
 * 快速搜索技能
 */
export async function quickSearch(
  skillsRootDir: string,
  query: string,
  type: 'name' | 'tag' | 'description' | 'all' = 'all'
): Promise<SearchResults> {
  const discovery = new SkillDiscovery({ skillsRootDir });
  await discovery.scanSkills();
  await discovery.generateIndex();
  return discovery.search(query, type);
}

// ============ 默认导出 ============

export default SkillDiscovery;

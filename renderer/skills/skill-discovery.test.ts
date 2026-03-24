/**
 * Skill Discovery Tests - 技能发现系统测试
 */

import { SkillDiscovery, quickScan, quickSearch } from './skill-discovery';
import { join } from 'path';

describe('SkillDiscovery', () => {
  let discovery: SkillDiscovery;
  const testSkillsDir = '/Users/nike/.openclaw/skills';

  beforeEach(() => {
    discovery = new SkillDiscovery({
      skillsRootDir: testSkillsDir,
      generateDocs: false,
    });
  });

  describe('扫描技能', () => {
    it('应该扫描到技能包', async () => {
      const packages = await discovery.scanSkills();
      
      expect(packages.length).toBeGreaterThan(0);
      console.log(`发现 ${packages.length} 个技能包`);
    });

    it('应该正确解析 SKILL.md', async () => {
      const packages = await discovery.scanSkills();
      
      const parsedPackages = packages.filter(pkg => pkg.parsed);
      console.log(`成功解析 ${parsedPackages.length} 个技能包`);
      
      expect(parsedPackages.length).toBeGreaterThan(0);
    });

    it('应该提取技能元数据', async () => {
      const packages = await discovery.scanSkills();
      
      const withMetadata = packages.filter(pkg => pkg.metadata);
      console.log(`包含元数据 ${withMetadata.length} 个技能包`);
      
      expect(withMetadata.length).toBeGreaterThan(0);
      
      // 检查元数据字段
      const firstPackage = withMetadata[0];
      expect(firstPackage.metadata?.name).toBeDefined();
      expect(firstPackage.metadata?.description).toBeDefined();
      
      console.log('示例技能:', firstPackage.metadata?.name);
      console.log('描述:', firstPackage.metadata?.description);
    });
  });

  describe('生成索引', () => {
    it('应该生成技能索引', async () => {
      await discovery.scanSkills();
      const index = await discovery.generateIndex();
      
      expect(index.totalSkills).toBeGreaterThan(0);
      expect(index.skills.length).toBe(index.totalSkills);
      
      console.log(`索引包含 ${index.totalSkills} 个技能`);
    });

    it('应该按名称索引', async () => {
      await discovery.scanSkills();
      const index = await discovery.generateIndex();
      
      expect(Object.keys(index.byName).length).toBeGreaterThan(0);
      
      // 检查索引是否包含技能
      const firstSkillName = Object.keys(index.byName)[0];
      expect(index.byName[firstSkillName]).toBeDefined();
    });

    it('应该按标签索引', async () => {
      await discovery.scanSkills();
      const index = await discovery.generateIndex();
      
      expect(Object.keys(index.byTag).length).toBeGreaterThan(0);
      console.log(`索引包含 ${Object.keys(index.byTag).length} 个标签`);
    });

    it('应该按分类索引', async () => {
      await discovery.scanSkills();
      const index = await discovery.generateIndex();
      
      expect(Object.keys(index.byCategory).length).toBeGreaterThan(0);
      console.log(`索引包含分类:`, Object.keys(index.byCategory));
    });
  });

  describe('搜索技能', () => {
    beforeEach(async () => {
      await discovery.scanSkills();
      await discovery.generateIndex();
    });

    it('应该按名称搜索', () => {
      const results = discovery.searchByName('api');
      console.log(`按名称搜索 'api' 找到 ${results.length} 个结果`);
      
      results.forEach(skill => {
        expect(skill.name.toLowerCase()).toContain('api');
      });
    });

    it('应该按标签搜索', () => {
      const results = discovery.searchByTag('API');
      console.log(`按标签搜索 'API' 找到 ${results.length} 个结果`);
      
      results.forEach(skill => {
        expect(skill.tags.some(t => t.includes('API'))).toBe(true);
      });
    });

    it('应该按功能搜索', () => {
      const results = discovery.searchByFunction('设计');
      console.log(`按功能搜索 '设计' 找到 ${results.length} 个结果`);
      
      results.forEach(skill => {
        expect(skill.description).toContain('设计');
      });
    });

    it('应该综合搜索', () => {
      const results = discovery.search('Agent', 'all');
      console.log(`综合搜索 'Agent' 找到 ${results.total} 个结果`);
      
      expect(results.total).toBeGreaterThan(0);
      expect(results.query).toBe('Agent');
      expect(results.searchType).toBe('all');
    });
  });

  describe('技能管理', () => {
    beforeEach(async () => {
      await discovery.scanSkills();
      await discovery.generateIndex();
    });

    it('应该获取所有技能', () => {
      const skills = discovery.getAllSkills();
      expect(skills.length).toBeGreaterThan(0);
      console.log(`所有技能数量: ${skills.length}`);
    });

    it('应该获取启用的技能', () => {
      const skills = discovery.getEnabledSkills();
      expect(skills.length).toBeGreaterThan(0);
      console.log(`启用的技能数量: ${skills.length}`);
    });

    it('应该获取技能详情', () => {
      const skills = discovery.getAllSkills();
      if (skills.length > 0) {
        const firstSkill = skills[0];
        const detail = discovery.getSkillDetail(firstSkill.name);
        
        expect(detail).toBeDefined();
        expect(detail?.name).toBe(firstSkill.name);
      }
    });

    it('应该启用/禁用技能', () => {
      const skills = discovery.getAllSkills();
      if (skills.length > 0) {
        const firstSkill = skills[0];
        
        // 禁用
        const disabled = discovery.setSkillEnabled(firstSkill.name, false);
        expect(disabled).toBe(true);
        
        // 检查是否禁用
        const detail = discovery.getSkillDetail(firstSkill.name);
        expect(detail?.enabled).toBe(false);
        
        // 重新启用
        const enabled = discovery.setSkillEnabled(firstSkill.name, true);
        expect(enabled).toBe(true);
        expect(discovery.getSkillDetail(firstSkill.name)?.enabled).toBe(true);
      }
    });
  });

  describe('便捷函数', () => {
    it('应该提供快速扫描', async () => {
      const index = await quickScan(testSkillsDir);
      expect(index.totalSkills).toBeGreaterThan(0);
    });

    it('应该提供快速搜索', async () => {
      const results = await quickSearch(testSkillsDir, 'API');
      expect(results.total).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============ 使用示例 ============

/**
 * 示例 1: 基础使用
 */
export async function example1_BasicUsage() {
  console.log('=== 示例 1: 基础使用 ===\n');

  const discovery = new SkillDiscovery({
    skillsRootDir: '/Users/nike/.openclaw/skills',
  });

  // 扫描技能
  const packages = await discovery.scanSkills();
  console.log(`发现 ${packages.length} 个技能包\n`);

  // 生成索引
  const index = await discovery.generateIndex();
  console.log(`生成索引：${index.totalSkills} 个技能\n`);

  // 获取所有技能
  const skills = discovery.getAllSkills();
  console.log('技能列表:');
  skills.forEach(skill => {
    console.log(`  ${skill.emoji || '📦'} ${skill.name} - ${skill.description}`);
  });
}

/**
 * 示例 2: 搜索技能
 */
export async function example2_SearchSkills() {
  console.log('\n=== 示例 2: 搜索技能 ===\n');

  const discovery = new SkillDiscovery({
    skillsRootDir: '/Users/nike/.openclaw/skills',
  });

  await discovery.scanSkills();
  await discovery.generateIndex();

  // 按名称搜索
  console.log('按名称搜索 "api":');
  const byName = discovery.searchByName('api');
  byName.forEach(skill => {
    console.log(`  - ${skill.name}`);
  });

  // 按标签搜索
  console.log('\n按标签搜索 "API":');
  const byTag = discovery.searchByTag('API');
  byTag.forEach(skill => {
    console.log(`  - ${skill.name} (标签：${skill.tags.join(', ')})`);
  });

  // 按功能搜索
  console.log('\n按功能搜索 "设计":');
  const byFunc = discovery.searchByFunction('设计');
  byFunc.forEach(skill => {
    console.log(`  - ${skill.name}: ${skill.description}`);
  });

  // 综合搜索
  console.log('\n综合搜索 "Agent":');
  const all = discovery.search('Agent', 'all');
  console.log(`找到 ${all.total} 个结果`);
  all.matches.forEach(skill => {
    console.log(`  - ${skill.name}`);
  });
}

/**
 * 示例 3: 生成文档
 */
export async function example3_GenerateDocs() {
  console.log('\n=== 示例 3: 生成文档 ===\n');

  const discovery = new SkillDiscovery({
    skillsRootDir: '/Users/nike/.openclaw/skills',
    generateDocs: true,
    docsOutputPath: '/Users/nike/.openclaw/workspace/src/renderer/skills/SKILLS-LIST.md',
  });

  await discovery.scanSkills();
  await discovery.generateIndex();
  
  const doc = await discovery.generateDocumentation();
  console.log('文档已生成');
  console.log(`文档长度：${doc.length} 字符`);
}

/**
 * 示例 4: 技能管理
 */
export async function example4_SkillManagement() {
  console.log('\n=== 示例 4: 技能管理 ===\n');

  const discovery = new SkillDiscovery({
    skillsRootDir: '/Users/nike/.openclaw/skills',
  });

  await discovery.scanSkills();
  await discovery.generateIndex();

  // 获取技能详情
  const skills = discovery.getAllSkills();
  if (skills.length > 0) {
    const firstSkill = skills[0];
    console.log('技能详情:');
    console.log(`  名称：${firstSkill.name}`);
    console.log(`  描述：${firstSkill.description}`);
    console.log(`  标签：${firstSkill.tags.join(', ')}`);
    console.log(`  分类：${firstSkill.category}`);
    console.log(`  路径：${firstSkill.relativePath}`);

    // 禁用技能
    console.log('\n禁用技能...');
    discovery.setSkillEnabled(firstSkill.name, false);
    console.log(`启用状态：${discovery.getSkillDetail(firstSkill.name)?.enabled}`);

    // 重新启用
    console.log('\n重新启用技能...');
    discovery.setSkillEnabled(firstSkill.name, true);
    console.log(`启用状态：${discovery.getSkillDetail(firstSkill.name)?.enabled}`);
  }
}

/**
 * 示例 5: 保存和加载索引
 */
export async function example5_SaveLoadIndex() {
  console.log('\n=== 示例 5: 保存和加载索引 ===\n');

  const discovery = new SkillDiscovery({
    skillsRootDir: '/Users/nike/.openclaw/skills',
    indexPath: '/Users/nike/.openclaw/workspace/src/renderer/skills/skill-index.json',
  });

  // 扫描并生成索引
  await discovery.scanSkills();
  const index = await discovery.generateIndex();
  
  // 保存索引
  await discovery.saveIndex();
  console.log('索引已保存');

  // 清空缓存
  discovery.clearCache();

  // 加载索引
  const loadedIndex = await discovery.loadIndex();
  if (loadedIndex) {
    console.log(`索引已加载：${loadedIndex.totalSkills} 个技能`);
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('========================================');
  console.log('  Skill Discovery Examples');
  console.log('========================================\n');

  try {
    await example1_BasicUsage();
    await example2_SearchSkills();
    await example3_GenerateDocs();
    await example4_SkillManagement();
    await example5_SaveLoadIndex();

    console.log('\n========================================');
    console.log('  所有示例运行完成!');
    console.log('========================================');
  } catch (error) {
    console.error('运行示例时出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

/**
 * Skill Discovery Demo - 技能发现系统演示
 * 
 * 运行：npx tsx demo-skill-discovery.ts
 */

import { SkillDiscovery } from './skill-discovery';

async function demo() {
  console.log('========================================');
  console.log('  🜏 Skill Discovery System Demo');
  console.log('========================================\n');

  const discovery = new SkillDiscovery({
    skillsRootDir: '/Users/nike/.openclaw/skills',
    generateDocs: true,
    docsOutputPath: '/Users/nike/.openclaw/workspace/src/renderer/skills/SKILLS-LIST.md',
  });

  // 1. 扫描技能
  console.log('📦 步骤 1: 扫描技能目录...\n');
  const packages = await discovery.scanSkills();
  console.log(`✅ 发现 ${packages.length} 个技能包\n`);

  // 显示解析成功的技能
  const parsedPackages = packages.filter(pkg => pkg.parsed);
  console.log(`✅ 成功解析 ${parsedPackages.length} 个技能包\n`);
  
  if (parsedPackages.length > 0) {
    console.log('示例技能:');
    parsedPackages.slice(0, 3).forEach(pkg => {
      console.log(`  - ${pkg.metadata?.name || 'Unknown'}`);
    });
    console.log();
  }

  // 2. 生成索引
  console.log('📋 步骤 2: 生成技能索引...\n');
  const index = await discovery.generateIndex();
  console.log(`✅ 索引生成完成`);
  console.log(`   总技能数：${index.totalSkills}`);
  console.log(`   启用数量：${index.enabledCount}`);
  console.log(`   标签数量：${Object.keys(index.byTag).length}`);
  console.log(`   分类数量：${Object.keys(index.byCategory).length}\n`);

  // 3. 显示分类
  console.log('📂 步骤 3: 技能分类:\n');
  Object.entries(index.byCategory).forEach(([category, skills]) => {
    console.log(`  ${category}: ${skills.length} 个技能`);
  });
  console.log();

  // 4. 搜索演示
  console.log('🔍 步骤 4: 搜索演示...\n');
  
  console.log('  搜索 "API":');
  const apiResults = discovery.search('API', 'all');
  console.log(`    找到 ${apiResults.total} 个结果`);
  apiResults.matches.slice(0, 3).forEach(skill => {
    console.log(`    - ${skill.name}`);
  });
  console.log();

  console.log('  搜索 "Agent":');
  const agentResults = discovery.search('Agent', 'all');
  console.log(`    找到 ${agentResults.total} 个结果`);
  agentResults.matches.slice(0, 3).forEach(skill => {
    console.log(`    - ${skill.name}`);
  });
  console.log();

  console.log('  搜索 "测试":');
  const testResults = discovery.search('测试', 'all');
  console.log(`    找到 ${testResults.total} 个结果`);
  testResults.matches.slice(0, 3).forEach(skill => {
    console.log(`    - ${skill.name}`);
  });
  console.log();

  // 5. 生成文档
  console.log('📄 步骤 5: 生成技能文档...\n');
  const doc = await discovery.generateDocumentation();
  console.log(`✅ 文档已生成`);
  console.log(`   文档长度：${doc.length} 字符`);
  console.log(`   保存路径：/Users/nike/.openclaw/workspace/src/renderer/skills/SKILLS-LIST.md\n`);

  // 6. 技能管理
  console.log('⚙️  步骤 6: 技能管理演示...\n');
  const allSkills = discovery.getAllSkills();
  if (allSkills.length > 0) {
    const firstSkill = allSkills[0];
    console.log(`  获取技能详情：${firstSkill.name}`);
    const detail = discovery.getSkillDetail(firstSkill.name);
    console.log(`    名称：${detail?.name}`);
    console.log(`    描述：${detail?.description}`);
    console.log(`    标签：${detail?.tags.join(', ')}`);
    console.log(`    分类：${detail?.category}`);
    console.log();

    console.log(`  禁用技能 ${firstSkill.name}...`);
    discovery.setSkillEnabled(firstSkill.name, false);
    console.log(`    启用状态：${discovery.getSkillDetail(firstSkill.name)?.enabled}`);
    console.log();

    console.log(`  重新启用技能 ${firstSkill.name}...`);
    discovery.setSkillEnabled(firstSkill.name, true);
    console.log(`    启用状态：${discovery.getSkillDetail(firstSkill.name)?.enabled}`);
    console.log();
  }

  // 7. 保存索引
  console.log('💾 步骤 7: 保存索引...\n');
  await discovery.saveIndex();
  console.log('✅ 索引已保存到：/Users/nike/.openclaw/workspace/src/renderer/skills/skill-index.json\n');

  console.log('========================================');
  console.log('  ✅ 所有演示完成!');
  console.log('========================================\n');

  console.log('📚 使用示例:\n');
  console.log(`
import { SkillDiscovery } from './skill-discovery';

// 创建发现器
const discovery = new SkillDiscovery({
  skillsRootDir: '/path/to/skills',
});

// 扫描技能
const packages = await discovery.scanSkills();

// 生成索引
const index = await discovery.generateIndex();

// 搜索技能
const results = discovery.search('API', 'all');

// 获取所有技能
const allSkills = discovery.getAllSkills();
  `);
}

// 运行演示
demo().catch(console.error);

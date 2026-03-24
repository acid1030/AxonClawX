/**
 * Simple test for Skill Discovery - 简单测试
 * 
 * 运行：node src/renderer/skills/test-discovery.js
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';

async function testSkillDiscovery() {
  console.log('========================================');
  console.log('  🜏 Skill Discovery Test');
  console.log('========================================\n');

  const skillsRootDir = '/Users/nike/.openclaw/skills';
  
  // 1. 扫描技能目录
  console.log('📦 步骤 1: 扫描技能目录...\n');
  
  async function scanDirectory(dir, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) return [];
    
    const skillMdPaths = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subResults = await scanDirectory(fullPath, depth + 1, maxDepth);
        skillMdPaths.push(...subResults);
      } else if (entry.isFile() && entry.name === 'SKILL.md') {
        skillMdPaths.push(fullPath);
      }
    }
    
    return skillMdPaths;
  }
  
  const skillMdPaths = await scanDirectory(skillsRootDir);
  console.log(`✅ 发现 ${skillMdPaths.length} 个 SKILL.md 文件\n`);
  
  // 2. 解析技能元数据
  console.log('📋 步骤 2: 解析技能元数据...\n');
  
  function parseYaml(yaml) {
    const result = {};
    const lines = yaml.split('\n');
    let currentKey = null;
    let currentObject = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
        currentKey = trimmed.slice(0, -1);
        currentObject = {};
        result[currentKey] = currentObject;
        continue;
      }
      
      const match = trimmed.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (currentObject && line.startsWith('  ')) {
          currentObject[key] = value.replace(/^["']|["']$/g, '');
        } else {
          result[key] = value.replace(/^["']|["']$/g, '');
          currentKey = null;
          currentObject = null;
        }
      }
    }
    
    return result;
  }
  
  const skills = [];
  for (const skillMdPath of skillMdPaths.slice(0, 10)) { // 只显示前 10 个
    try {
      const content = await readFile(skillMdPath, 'utf-8');
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (frontMatterMatch) {
        const yamlContent = frontMatterMatch[1];
        const metadata = parseYaml(yamlContent);
        
        skills.push({
          name: metadata.name || 'Unknown',
          description: metadata.description || '',
          path: dirname(skillMdPath),
          emoji: metadata.metadata?.openclaw?.emoji || '📦',
        });
      }
    } catch (error) {
      console.error(`解析失败 ${skillMdPath}:`, error.message);
    }
  }
  
  console.log(`✅ 成功解析 ${skills.length} 个技能\n`);
  
  // 3. 显示技能列表
  console.log('📂 步骤 3: 技能列表:\n');
  skills.forEach((skill, i) => {
    console.log(`  ${i + 1}. ${skill.emoji} ${skill.name}`);
    console.log(`     ${skill.description.substring(0, 80)}...`);
    console.log();
  });
  
  // 4. 搜索演示
  console.log('🔍 步骤 4: 搜索演示...\n');
  
  const searchQuery = 'API';
  const searchResults = skills.filter(skill => 
    skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    skill.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  console.log(`  搜索 "${searchQuery}":`);
  console.log(`    找到 ${searchResults.length} 个结果`);
  searchResults.forEach(skill => {
    console.log(`    - ${skill.name}`);
  });
  console.log();
  
  // 5. 总结
  console.log('========================================');
  console.log('  ✅ 测试完成!');
  console.log('========================================\n');
  
  console.log('📊 统计:');
  console.log(`  总技能数：${skillMdPaths.length}`);
  console.log(`  成功解析：${skills.length}`);
  console.log(`  搜索 "${searchQuery}" 结果：${searchResults.length}\n`);
  
  console.log('📚 完整实现请查看：src/renderer/skills/skill-discovery.ts\n');
}

// 运行测试
testSkillDiscovery().catch(console.error);

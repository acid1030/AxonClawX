/**
 * Search Skill - 快速测试
 * 
 * 运行：cd /Users/nike/.openclaw/workspace && npx ts-node src/skills/search-skill.test.ts
 */

import SearchSkill from './search-skill';

// ============== 测试数据 ==============

const testDocuments = [
  {
    id: 1,
    title: '项目架构设计',
    content: '本项目采用微服务架构，包含 Gateway、Agent、Channel 三大核心模块。',
    createdAt: 1710316800000,
  },
  {
    id: 2,
    title: '多 Agent 协作机制',
    content: 'Agent 之间通过消息队列进行通信，支持任务分发和结果聚合。',
    createdAt: 1710403200000,
  },
  {
    id: 3,
    title: '性能优化指南',
    content: '使用缓存技能可以显著提升系统响应速度，减少重复计算。',
    createdAt: 1710489600000,
  },
  {
    id: 4,
    title: '搜索技能文档',
    content: '搜索技能支持全文搜索、关键词高亮和智能排序功能。',
    createdAt: 1710576000000,
  },
];

// ============== 测试函数 ==============

function testBasicSearch() {
  console.log('\n🔍 测试 1: 基础文本搜索');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  const text = 'AxonClaw 是一个强大的多 Agent 协作系统，支持实时通信和任务分发。';
  
  const results = search.search('Agent 协作', text);
  
  console.log(`查询："Agent 协作"`);
  console.log(`结果数：${results.length}`);
  if (results.length > 0) {
    console.log(`匹配分数：${results[0].score.toFixed(3)}`);
    console.log(`高亮文本：${results[0].highlightedText}`);
  }
}

function testObjectSearch() {
  console.log('\n🔍 测试 2: 对象数组搜索');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  
  const results = search.search('Agent 通信', testDocuments, {
    searchFields: ['title', 'content'],
    includeContext: true,
    contextLength: 20,
  });
  
  console.log(`查询："Agent 通信"`);
  console.log(`结果数：${results.length}`);
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. [分数：${r.score.toFixed(3)}] ${r.item.title}`);
    console.log(`   匹配词：${r.matchedKeywords.join(', ')}`);
    console.log(`   高亮：${r.highlightedText}`);
    if (r.snippets && r.snippets.length > 0) {
      console.log(`   片段：${r.snippets[0].text}`);
    }
  });
}

function testIndexSearch() {
  console.log('\n🔍 测试 3: 索引搜索');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  
  // 创建索引
  search.createIndex('docs', '文档索引', testDocuments, ['title', 'content']);
  
  // 在索引中搜索
  const results = search.searchInIndex('docs', '微服务架构', {
    limit: 10,
    sortBy: 'relevance',
  });
  
  console.log(`查询："微服务架构"`);
  console.log(`结果数：${results.length}`);
  if (results.length > 0) {
    console.log(`标题：${results[0].item.title}`);
    console.log(`高亮：${results[0].highlightedText}`);
  }
  
  // 列出索引
  const indices = search.listIndices();
  console.log(`\n索引列表：${indices.map(i => i.name).join(', ')}`);
}

function testSorting() {
  console.log('\n🔍 测试 4: 搜索结果排序');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  
  // 按相关性排序
  const byRelevance = search.search('技能 系统', testDocuments, {
    sortBy: 'relevance',
    sortOrder: 'desc',
  });
  
  console.log('按相关性排序:');
  byRelevance.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.item.title} (分数：${r.score.toFixed(3)})`);
  });
  
  // 按时间排序
  const byTime = search.search('技能', testDocuments, {
    sortBy: 'time',
    sortOrder: 'desc',
  });
  
  console.log('\n按时间排序 (最新优先):');
  byTime.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.item.title}`);
  });
}

function testHighlighting() {
  console.log('\n🔍 测试 5: 关键词高亮');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  
  const results = search.search('技能', testDocuments, {
    highlightTag: 'mark',
    searchFields: ['title', 'content'],
  });
  
  console.log(`查询："技能"`);
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.item.title}`);
    console.log(`   高亮：${r.highlightedText}`);
    console.log(`   匹配位置：${r.matchPositions?.map(p => `${p.start}-${p.end}`).join(', ')}`);
  });
}

function testFuzzySearch() {
  console.log('\n🔍 测试 6: 模糊搜索 (容错)');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  
  // 故意拼写错误
  const results = search.fuzzySearch('Agetn 协做', testDocuments, {
    threshold: 0.5,
    searchFields: ['title', 'content'],
  });
  
  console.log(`查询："Agetn 协做" (正确应为 "Agent 协作")`);
  console.log(`结果数：${results.length}`);
  if (results.length > 0) {
    console.log(`最佳匹配：${results[0].item.title} (分数：${results[0].score.toFixed(3)})`);
  }
}

function testMultiSearch() {
  console.log('\n🔍 测试 7: 多条件搜索');
  console.log('=' .repeat(50));

  const search = new SearchSkill();
  
  const results = search.multiSearch(
    ['微服务', 'Agent', '缓存'],
    testDocuments,
    {
      limit: 10,
      sortBy: 'relevance',
      searchFields: ['title', 'content'],
    }
  );
  
  console.log(`查询：["微服务", "Agent", "缓存"]`);
  console.log(`结果数：${results.length}`);
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.item.title}`);
    console.log(`   综合分数：${r.score.toFixed(3)}`);
    console.log(`   匹配词：${r.matchedKeywords.join(', ')}`);
  });
}

function testCustomConfig() {
  console.log('\n🔍 测试 8: 自定义配置');
  console.log('=' .repeat(50));

  const search = new SearchSkill({
    caseSensitive: false,
    defaultSortBy: 'relevance',
    maxResults: 5,
    minScore: 0.2,
  });
  
  const results = search.search('SKILL', testDocuments, {
    searchFields: ['title', 'content'],
  });
  
  console.log(`配置：大小写不敏感，最低分数 0.2`);
  console.log(`查询："SKILL" (实际搜索 "skill")`);
  console.log(`结果数：${results.length}`);
  if (results.length > 0) {
    console.log(`匹配：${results[0].item.title}`);
  }
}

// ============== 运行测试 ==============

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       Search Skill - 功能测试                    ║');
console.log('╚══════════════════════════════════════════════════╝');

testBasicSearch();
testObjectSearch();
testIndexSearch();
testSorting();
testHighlighting();
testFuzzySearch();
testMultiSearch();
testCustomConfig();

console.log('\n✅ 所有测试完成!\n');

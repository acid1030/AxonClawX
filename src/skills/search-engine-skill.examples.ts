/**
 * 全文搜索引擎技能 - 使用示例
 * 
 * 演示如何使用 search-engine-skill.ts
 */

import { createSearchEngine, quickSearch, SearchEngine } from './search-engine-skill';

// ============================================
// 示例 1: 基础使用
// ============================================

function basicExample() {
  console.log('=== 示例 1: 基础使用 ===\n');
  
  // 创建搜索引擎
  const engine = createSearchEngine();
  
  // 建立索引
  engine.index('article-1', 'React 是一个用于构建用户界面的 JavaScript 库');
  engine.index('article-2', 'Vue.js 是渐进式 JavaScript 框架');
  engine.index('article-3', 'Angular 是 Google 维护的前端框架');
  
  // 搜索
  const results = engine.search('JavaScript 框架');
  
  results.forEach((result, idx) => {
    console.log(`${idx + 1}. [${result.id}] 分数：${result.score.toFixed(4)}`);
    console.log(`   ${result.content}\n`);
  });
}

// ============================================
// 示例 2: 批量索引
// ============================================

function bulkIndexExample() {
  console.log('=== 示例 2: 批量索引 ===\n');
  
  const engine = createSearchEngine();
  
  // 批量添加文档
  const documents = [
    { id: 'blog-1', content: 'TypeScript 为 JavaScript 添加了类型系统' },
    { id: 'blog-2', content: 'ES6 引入了箭头函数、解构赋值等新特性' },
    { id: 'blog-3', content: 'Node.js 让 JavaScript 可以运行在服务器端' },
    { id: 'blog-4', content: 'Webpack 是模块打包工具，支持 TypeScript' },
    { id: 'blog-5', content: 'Vite 是新一代前端构建工具，速度更快' }
  ];
  
  engine.bulkIndex(documents);
  
  // 查看统计
  const stats = engine.getStats();
  console.log(`文档数：${stats.documentCount}`);
  console.log(`词元数：${stats.totalTerms}`);
  console.log(`唯一词元：${stats.uniqueTerms}\n`);
  
  // 搜索 TypeScript
  const results = engine.search('TypeScript', 3);
  console.log('搜索 "TypeScript":');
  results.forEach(r => {
    console.log(`- [${r.id}] ${r.content}`);
  });
}

// ============================================
// 示例 3: 高亮显示
// ============================================

function highlightExample() {
  console.log('\n=== 示例 3: 高亮显示 ===\n');
  
  const engine = createSearchEngine();
  engine.index('doc-1', '人工智能和机器学习是当前最热门的技术领域');
  
  const results = engine.search('人工智能');
  
  if (results.length > 0) {
    const result = results[0];
    const highlighted = engine.highlight(result.content, result.matchedTerms);
    
    console.log('原始内容:');
    console.log(result.content);
    console.log('\n高亮内容:');
    console.log(highlighted);
  }
}

// ============================================
// 示例 4: 快速搜索
// ============================================

function quickSearchExample() {
  console.log('\n=== 示例 4: 快速搜索 ===\n');
  
  const documents = [
    { id: '1', content: 'Python 是数据科学的首选语言' },
    { id: '2', content: 'Java 是企业级应用的主流选择' },
    { id: '3', content: 'Go 语言在云原生领域广泛应用' },
    { id: '4', content: 'Rust 提供内存安全的系统编程' }
  ];
  
  // 一行代码完成索引和搜索
  const results = quickSearch(documents, '数据科学', 2);
  
  console.log('快速搜索 "数据科学":');
  results.forEach(r => {
    console.log(`[${r.id}] 分数：${r.score.toFixed(4)} - ${r.content}`);
  });
}

// ============================================
// 示例 5: 文档管理
// ============================================

function documentManagementExample() {
  console.log('\n=== 示例 5: 文档管理 ===\n');
  
  const engine = createSearchEngine();
  
  // 添加文档
  engine.index('temp-1', '临时文档 1');
  engine.index('temp-2', '临时文档 2');
  engine.index('keep-1', '永久文档 1');
  
  console.log(`初始文档数：${engine.getStats().documentCount}`);
  
  // 删除文档
  engine.delete('temp-1');
  console.log(`删除 temp-1 后：${engine.getStats().documentCount}`);
  
  // 清除所有
  engine.clear();
  console.log(`清除所有后：${engine.getStats().documentCount}`);
}

// ============================================
// 示例 6: 实际应用场景 - 文档搜索系统
// ============================================

function realWorldExample() {
  console.log('\n=== 示例 6: 文档搜索系统 ===\n');
  
  const engine = createSearchEngine();
  
  // 模拟文档数据库
  const docs = [
    { id: 'api-1', content: 'GET /api/users - 获取用户列表，支持分页和筛选' },
    { id: 'api-2', content: 'POST /api/users - 创建新用户，需要 username 和 email' },
    { id: 'api-3', content: 'PUT /api/users/:id - 更新用户信息' },
    { id: 'api-4', content: 'DELETE /api/users/:id - 删除用户' },
    { id: 'guide-1', content: '认证指南：使用 JWT token 进行 API 认证' },
    { id: 'guide-2', content: '错误处理：所有错误返回统一格式 { code, message }' }
  ];
  
  engine.bulkIndex(docs);
  
  // 用户搜索
  const queries = ['users', 'API', '认证'];
  
  for (const query of queries) {
    console.log(`🔍 搜索 "${query}":`);
    const results = engine.search(query, 2);
    
    if (results.length === 0) {
      console.log('   无结果\n');
    } else {
      results.forEach((r, idx) => {
        const highlighted = engine.highlight(r.content, r.matchedTerms);
        console.log(`   ${idx + 1}. [${r.id}] ${highlighted}`);
      });
      console.log();
    }
  }
}

// ============================================
// 运行所有示例
// ============================================

if (require.main === module) {
  basicExample();
  bulkIndexExample();
  highlightExample();
  quickSearchExample();
  documentManagementExample();
  realWorldExample();
  
  console.log('\n✅ 所有示例运行完成!');
}

// 导出示例函数供其他模块使用
export {
  basicExample,
  bulkIndexExample,
  highlightExample,
  quickSearchExample,
  documentManagementExample,
  realWorldExample
};

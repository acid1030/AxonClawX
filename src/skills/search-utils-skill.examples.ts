/**
 * Search Utils Skill - 使用示例
 * 
 * 演示如何使用搜索工具技能的各种功能
 */

import {
  searchText,
  highlightText,
  highlightMultiple,
  searchWithContext,
  countMatches,
  replaceMatches,
  type SearchOptions,
} from "./search-utils-skill";

// ==================== 示例 1: 基础文本搜索 ====================

console.log("=== 示例 1: 基础文本搜索 ===");

const sampleText = `
  JavaScript 是一门强大的编程语言。
  它可以用于前端开发、后端开发、移动应用开发等多种场景。
  JavaScript 的生态系统非常庞大，有无数的库和框架可供选择。
`;

// 精确搜索
const exactResults = searchText(sampleText, "JavaScript");
console.log(`精确匹配 "JavaScript": ${exactResults.length} 处`);
exactResults.forEach((r, i) => {
  console.log(`  [${i + 1}] 位置：${r.index}, 得分：${r.score}`);
});

// 大小写敏感搜索
const caseSensitiveResults = searchText(sampleText, "javascript", {
  caseSensitive: true,
});
console.log(`大小写敏感匹配 "javascript": ${caseSensitiveResults.length} 处`);

// 完整单词匹配
const wholeWordResults = searchText("Hello HelloWorld Hello", "Hello", {
  wholeWord: true,
});
console.log(`完整单词匹配 "Hello": ${wholeWordResults.length} 处 (排除 HelloWorld)`);

// ==================== 示例 2: 模糊搜索 ====================

console.log("\n=== 示例 2: 模糊搜索 ===");

const typoText = "The quick brown fox jumps over the lazy dog";

// 搜索带拼写错误的词
const fuzzyResults = searchText(typoText, "quik", {
  fuzzy: true,
  fuzzyThreshold: 0.7,
});
console.log(`模糊搜索 "quik" (实际是 "quick"): ${fuzzyResults.length} 处`);
fuzzyResults.forEach((r) => {
  console.log(`  匹配："${r.text}", 得分：${r.score.toFixed(2)}`);
});

// 更宽松的模糊匹配
const looseFuzzy = searchText(typoText, "lzy", {
  fuzzy: true,
  fuzzyThreshold: 0.5,
});
console.log(`模糊搜索 "lzy" (实际是 "lazy"): ${looseFuzzy.length} 处`);

// ==================== 示例 3: 高亮显示 ====================

console.log("\n=== 示例 3: 高亮显示 ===");

const article = `
  React 是一个用于构建用户界面的 JavaScript 库。
  React 由 Facebook 开发并开源，现已成为最流行的前端框架之一。
  使用 React 可以创建可复用的 UI 组件，提高开发效率。
`;

// 高亮单个搜索词
const reactResults = searchText(article, "React");
const highlighted = highlightText(article, reactResults);
console.log("高亮 'React':");
console.log(highlighted);

// 高亮多个搜索词
const multiHighlighted = highlightMultiple(article, ["React", "JavaScript", "UI"], {
  caseSensitive: false,
});
console.log("\n高亮多个词 ['React', 'JavaScript', 'UI']:");
console.log(multiHighlighted);

// 自定义高亮标签
const customHighlight = highlightText(article, reactResults, "span", "highlight-red");
console.log("\n自定义高亮标签 (span.highlight-red):");
console.log(customHighlight);

// ==================== 示例 4: 带上下文的搜索 ====================

console.log("\n=== 示例 4: 带上下文的搜索 ===");

const longText = `
  在软件开发中，设计模式是解决常见问题的可复用方案。
  单例模式确保一个类只有一个实例，并提供全局访问点。
  工厂模式提供创建对象的接口，而不指定具体类。
  观察者模式定义对象间的一对多依赖，当一个对象改变状态时，所有依赖者都会收到通知。
  设计模式分为创建型、结构型和行为型三大类。
`;

const contextResults = searchWithContext(longText, "模式", 30);
console.log(`搜索 "模式" 并显示上下文 (每侧 30 字符):`);
contextResults.forEach((r, i) => {
  console.log(`\n  [${i + 1}] 得分：${r.score.toFixed(2)}, 位置：${r.position}`);
  console.log(`  上下文：${r.context}`);
});

// ==================== 示例 5: 统计与替换 ====================

console.log("\n=== 示例 5: 统计与替换 ===");

const code = `
  function hello() {
    console.log("Hello, World!");
  }
  
  function helloAgain() {
    console.log("Hello again!");
  }
  
  // Say hello to everyone
  hello();
`;

// 统计匹配
const helloCount = countMatches(code, "hello", { caseSensitive: false });
console.log(`"hello" 出现次数：${helloCount}`);

const consoleCount = countMatches(code, "console.log");
console.log(`"console.log" 出现次数：${consoleCount}`);

// 替换匹配
const replaced = replaceMatches(code, "hello", "greet", {
  caseSensitive: false,
  wholeWord: true,
});
console.log("\n替换 'hello' → 'greet':");
console.log(replaced);

// ==================== 示例 6: 实际应用场景 ====================

console.log("\n=== 示例 6: 实际应用场景 ===");

// 场景 1: 日志文件搜索
const logFile = `
  [2024-01-15 10:23:45] INFO: Server started on port 3000
  [2024-01-15 10:24:12] ERROR: Database connection failed
  [2024-01-15 10:24:15] WARN: Retrying database connection
  [2024-01-15 10:24:18] INFO: Database connected successfully
  [2024-01-15 10:25:00] ERROR: Invalid user input detected
`;

const errors = searchWithContext(logFile, "ERROR", 50);
console.log("查找所有 ERROR 日志:");
errors.forEach((e) => {
  console.log(`  ${e.context.trim()}`);
});

// 场景 2: 代码审查 - 查找 TODO 注释
const sourceCode = `
  // TODO: Implement error handling
  function processData(data) {
    // FIXME: This is a temporary solution
    return data.map(item => item.value);
  }
  
  // TODO: Add unit tests
  // TODO: Optimize performance
`;

const todos = searchWithContext(sourceCode, "TODO", 20);
console.log(`\n查找所有 TODO 注释：${todos.length} 个`);
todos.forEach((t, i) => {
  console.log(`  [${i + 1}] ${t.context.trim()}`);
});

// 场景 3: 文档搜索 - 模糊匹配用户输入
const documentation = `
  配置文件的扩展名应该是 .json 或 .yaml。
  确保配置文件位于项目的根目录下。
  配置项包括：port, host, database, logging。
`;

// 用户可能输入错误的配置项名称
const userQuery = "confiuration"; // 拼写错误
const fuzzyMatches = searchText(documentation, userQuery, {
  fuzzy: true,
  fuzzyThreshold: 0.6,
  maxResults: 3,
});
console.log(`\n用户搜索 "confiuration" (模糊匹配):`);
fuzzyMatches.forEach((m) => {
  console.log(`  匹配："${m.text}", 得分：${m.score.toFixed(2)}`);
});

// ==================== 示例 7: 性能测试 ====================

console.log("\n=== 示例 7: 性能测试 ===");

const largeText = "Lorem ipsum dolor sit amet. ".repeat(10000); // 约 280KB 文本

const startTime = Date.now();
const largeResults = searchText(largeText, "ipsum", { maxResults: 1000 });
const endTime = Date.now();

console.log(`在 ${largeText.length} 字符中搜索 "ipsum":`);
console.log(`  找到 ${largeResults.length} 个匹配`);
console.log(`  耗时：${endTime - startTime}ms`);

// ==================== 示例 8: CSS 样式示例 ====================

console.log("\n=== 示例 8: 配套 CSS 样式 ===");

const cssStyles = `
/* 在您的 CSS 文件中添加以下样式 */

.search-highlight {
  background-color: #fef08a; /* 浅黄色背景 */
  color: #854d0e; /* 深棕色文字 */
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
  box-shadow: 0 0 0 2px #fde047;
}

/* 高亮红色变体 */
.highlight-red {
  background-color: #fecaca;
  color: #991b1b;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
}

/* 高亮绿色变体 */
.highlight-green {
  background-color: #bbf7d0;
  color: #166534;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
}

/* 高亮蓝色变体 */
.highlight-blue {
  background-color: #bfdbfe;
  color: #1e40af;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: 600;
}

/* 动画效果 - 脉冲高亮 */
@keyframes highlight-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.highlight-pulse {
  animation: highlight-pulse 1.5s infinite;
}
`;

console.log(cssStyles);

// ==================== 完成提示 ====================

console.log("\n✅ 所有示例执行完成！");
console.log("\n📚 下一步:");
console.log("  1. 在项目中导入 search-utils-skill");
console.log("  2. 根据需求调用相应函数");
console.log("  3. 添加 CSS 样式以美化高亮显示");
console.log("  4. 根据需要调整搜索选项");

/**
 * Search Utils Skill - 全文搜索工具
 * 
 * 功能:
 * 1. 文本搜索 - 基础字符串匹配
 * 2. 模糊匹配 - Levenshtein 距离算法
 * 3. 高亮显示 - HTML 标记匹配内容
 * 
 * @module search-utils-skill
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  fuzzy?: boolean;
  fuzzyThreshold?: number; // 0-1, 1=完全匹配
  maxResults?: number;
}

export interface SearchResult {
  text: string;
  index: number;
  score: number; // 匹配得分 (0-1)
  highlights: HighlightRange[];
}

export interface HighlightRange {
  start: number;
  end: number;
}

// ==================== 核心搜索功能 ====================

/**
 * 基础文本搜索
 * @param text - 待搜索文本
 * @param query - 搜索词
 * @param options - 搜索选项
 */
export function searchText(
  text: string,
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const {
    caseSensitive = false,
    wholeWord = false,
    fuzzy = false,
    fuzzyThreshold = 0.8,
    maxResults = 100,
  } = options;

  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  if (fuzzy) {
    // 模糊搜索
    return fuzzySearch(text, query, fuzzyThreshold, maxResults);
  }

  // 精确搜索
  let index = 0;
  while (index < searchText.length && results.length < maxResults) {
    const foundIndex = searchText.indexOf(searchQuery, index);
    if (foundIndex === -1) break;

    // 检查是否 whole word
    if (wholeWord && !isWholeWord(text, foundIndex, query.length)) {
      index = foundIndex + 1;
      continue;
    }

    results.push({
      text: text.substring(foundIndex, foundIndex + query.length),
      index: foundIndex,
      score: 1.0,
      highlights: [{ start: foundIndex, end: foundIndex + query.length }],
    });

    index = foundIndex + query.length;
  }

  return results;
}

/**
 * 模糊搜索 - 使用滑动窗口 + Levenshtein 距离
 * @param text - 待搜索文本
 * @param query - 搜索词
 * @param threshold - 匹配阈值 (0-1)
 * @param maxResults - 最大结果数
 */
function fuzzySearch(
  text: string,
  query: string,
  threshold: number,
  maxResults: number
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLen = query.length;
  const minLen = Math.max(3, Math.floor(queryLen * 0.5));
  const maxLen = Math.ceil(queryLen * 1.5);

  for (let i = 0; i < text.length && results.length < maxResults; i++) {
    for (let len = minLen; len <= maxLen && i + len <= text.length; len++) {
      const chunk = text.substring(i, i + len);
      const distance = levenshteinDistance(chunk.toLowerCase(), query.toLowerCase());
      const maxDist = Math.max(chunk.length, query.length);
      const score = 1 - distance / maxDist;

      if (score >= threshold) {
        results.push({
          text: chunk,
          index: i,
          score,
          highlights: [{ start: i, end: i + len }],
        });
      }
    }
  }

  // 按得分排序
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Levenshtein 距离计算
 * @param s1 - 字符串 1
 * @param s2 - 字符串 2
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 删除
          dp[i][j - 1] + 1, // 插入
          dp[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 检查是否为完整单词匹配
 */
function isWholeWord(text: string, index: number, length: number): boolean {
  const before = index === 0 ? true : !/\w/.test(text[index - 1]);
  const after =
    index + length === text.length ? true : !/\w/.test(text[index + length]);
  return before && after;
}

// ==================== 高亮显示功能 ====================

/**
 * 高亮显示匹配内容
 * @param text - 原始文本
 * @param results - 搜索结果
 * @param highlightTag - HTML 标签 (默认：<mark>)
 * @param highlightClass - CSS 类名
 */
export function highlightText(
  text: string,
  results: SearchResult[],
  highlightTag: string = "mark",
  highlightClass: string = "search-highlight"
): string {
  if (results.length === 0) return text;

  // 按位置排序，避免重叠
  const sorted = [...results].sort((a, b) => a.index - b.index);

  let result = "";
  let lastIndex = 0;

  for (const match of sorted) {
    // 添加未匹配部分
    result += text.substring(lastIndex, match.index);

    // 添加高亮部分
    const matchedText = text.substring(match.index, match.index + match.text.length);
    result += `<${highlightTag} class="${highlightClass}" data-score="${match.score.toFixed(2)}">${matchedText}</${highlightTag}>`;

    lastIndex = match.index + match.text.length;
  }

  // 添加剩余部分
  result += text.substring(lastIndex);

  return result;
}

/**
 * 高亮显示 (支持多个搜索词)
 * @param text - 原始文本
 * @param queries - 搜索词数组
 * @param options - 搜索选项
 */
export function highlightMultiple(
  text: string,
  queries: string[],
  options: SearchOptions = {}
): string {
  let highlighted = text;

  for (const query of queries) {
    const results = searchText(text, query, options);
    highlighted = highlightText(highlighted, results);
  }

  return highlighted;
}

// ==================== 实用工具函数 ====================

/**
 * 搜索并返回上下文片段
 * @param text - 原始文本
 * @param query - 搜索词
 * @param contextLength - 上下文长度 (每侧字符数)
 */
export function searchWithContext(
  text: string,
  query: string,
  contextLength: number = 50,
  options: SearchOptions = {}
): Array<{
  context: string;
  match: string;
  position: number;
  score: number;
}> {
  const results = searchText(text, query, options);

  return results.map((result) => {
    const start = Math.max(0, result.index - contextLength);
    const end = Math.min(text.length, result.index + result.text.length + contextLength);
    const context = text.substring(start, end);

    return {
      context: start > 0 ? "..." + context + (end < text.length ? "..." : "") : context,
      match: result.text,
      position: result.index,
      score: result.score,
    };
  });
}

/**
 * 统计匹配次数
 */
export function countMatches(text: string, query: string, options: SearchOptions = {}): number {
  return searchText(text, query, options).length;
}

/**
 * 替换匹配内容
 */
export function replaceMatches(
  text: string,
  query: string,
  replacement: string,
  options: SearchOptions = {}
): string {
  const results = searchText(text, query, options);
  if (results.length === 0) return text;

  let result = "";
  let lastIndex = 0;

  for (const match of results) {
    result += text.substring(lastIndex, match.index);
    result += replacement;
    lastIndex = match.index + match.text.length;
  }

  result += text.substring(lastIndex);
  return result;
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * // 1. 基础搜索
 * const text = "Hello World, Hello Universe";
 * const results = searchText(text, "Hello");
 * console.log(results); // 2 个匹配
 * 
 * @example
 * // 2. 模糊搜索
 * const fuzzyResults = searchText("The quick brown fox", "quik", { fuzzy: true, fuzzyThreshold: 0.7 });
 * console.log(fuzzyResults); // 匹配 "quick"
 * 
 * @example
 * // 3. 高亮显示
 * const highlighted = highlightText(text, results);
 * console.log(highlighted); // "Hello World, <mark>Hello</mark> Universe"
 * 
 * @example
 * // 4. 带上下文的搜索
 * const contextResults = searchWithContext(longText, "keyword", 100);
 * contextResults.forEach(({ context, score }) => {
 *   console.log(`Score: ${score}, Context: ${context}`);
 * });
 * 
 * @example
 * // 5. 统计匹配
 * const count = countMatches(text, "Hello", { caseSensitive: true });
 * console.log(`Found ${count} matches`);
 * 
 * @example
 * // 6. 替换匹配
 * const replaced = replaceMatches(text, "Hello", "Hi", { wholeWord: true });
 * console.log(replaced); // "Hi World, Hi Universe"
 */

// ==================== 导出 ====================

export default {
  searchText,
  highlightText,
  highlightMultiple,
  searchWithContext,
  countMatches,
  replaceMatches,
  fuzzySearch,
  levenshteinDistance,
};

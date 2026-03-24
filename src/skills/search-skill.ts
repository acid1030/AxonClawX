/**
 * 搜索技能 - Search Skill
 * 
 * 功能:
 * 1. 内存搜索 - 在内存数据中进行全文搜索
 * 2. 关键词高亮 - 支持搜索结果中的关键词高亮标记
 * 3. 搜索结果排序 - 按相关性、时间、匹配度等多维度排序
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface SearchConfig {
  /** 是否启用大小写敏感 */
  caseSensitive: boolean;
  /** 是否启用正则表达式搜索 */
  enableRegex: boolean;
  /** 默认排序方式 */
  defaultSortBy: SortBy;
  /** 默认排序方向 */
  defaultSortOrder: SortOrder;
  /** 最大返回结果数 */
  maxResults: number;
  /** 最小匹配分数阈值 */
  minScore: number;
}

export type SortBy = 'relevance' | 'time' | 'alphabetical' | 'length';
export type SortOrder = 'asc' | 'desc';

export interface SearchOptions {
  /** 是否大小写敏感 */
  caseSensitive?: boolean;
  /** 是否使用正则表达式 */
  useRegex?: boolean;
  /** 排序方式 */
  sortBy?: SortBy;
  /** 排序方向 */
  sortOrder?: SortOrder;
  /** 最大返回结果数 */
  limit?: number;
  /** 最小匹配分数 */
  minScore?: number;
  /** 高亮标签 */
  highlightTag?: string;
  /** 搜索字段 (针对对象) */
  searchFields?: string[];
  /** 是否包含片段上下文 */
  includeContext?: boolean;
  /** 上下文长度 (字符数) */
  contextLength?: number;
}

export interface SearchResult<T = any> {
  /** 原始数据 */
  item: T;
  /** 匹配分数 (0-1) */
  score: number;
  /** 匹配的关键词列表 */
  matchedKeywords: string[];
  /** 高亮后的文本 */
  highlightedText?: string;
  /** 匹配片段 (带上下文) */
  snippets?: SearchSnippet[];
  /** 匹配位置信息 */
  matchPositions?: MatchPosition[];
  /** 数据 ID 或索引 */
  id?: string | number;
  /** 时间戳 (如果有) */
  timestamp?: number;
}

export interface SearchSnippet {
  /** 片段文本 */
  text: string;
  /** 片段起始位置 */
  start: number;
  /** 片段结束位置 */
  end: number;
  /** 是否有前缀上下文 */
  hasPrefix: boolean;
  /** 是否有后缀上下文 */
  hasSuffix: boolean;
}

export interface MatchPosition {
  /** 起始位置 */
  start: number;
  /** 结束位置 */
  end: number;
  /** 匹配的关键词 */
  keyword: string;
}

export interface SearchIndex {
  /** 索引 ID */
  id: string;
  /** 索引名称 */
  name: string;
  /** 索引数据 */
  data: any[];
  /** 索引字段映射 */
  fieldMap: Map<string, number>;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

// ============== 搜索技能实现 ==============

/**
 * 搜索技能类
 */
export class SearchSkill {
  private config: SearchConfig;
  private indices: Map<string, SearchIndex> = new Map();

  constructor(config?: Partial<SearchConfig>) {
    this.config = {
      caseSensitive: false,
      enableRegex: false,
      defaultSortBy: 'relevance',
      defaultSortOrder: 'desc',
      maxResults: 100,
      minScore: 0.1,
      ...config,
    };
  }

  // ============== 索引管理 ==============

  /**
   * 创建索引
   */
  createIndex(id: string, name: string, data: any[], fields?: string[]): SearchIndex {
    const fieldMap = new Map<string, number>();
    if (fields) {
      fields.forEach((field, index) => fieldMap.set(field, index));
    }

    const index: SearchIndex = {
      id,
      name,
      data,
      fieldMap,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.indices.set(id, index);
    return index;
  }

  /**
   * 更新索引数据
   */
  updateIndex(id: string, data: any[]): boolean {
    const index = this.indices.get(id);
    if (!index) return false;

    index.data = data;
    index.updatedAt = Date.now();
    return true;
  }

  /**
   * 删除索引
   */
  deleteIndex(id: string): boolean {
    return this.indices.delete(id);
  }

  /**
   * 获取索引
   */
  getIndex(id: string): SearchIndex | undefined {
    return this.indices.get(id);
  }

  /**
   * 列出所有索引
   */
  listIndices(): SearchIndex[] {
    return Array.from(this.indices.values());
  }

  // ============== 核心搜索功能 ==============

  /**
   * 全文搜索
   */
  search<T = any>(
    query: string,
    data: T[] | string,
    options?: SearchOptions
  ): SearchResult<T>[] {
    const opts = this.mergeOptions(options);
    const results: SearchResult<T>[] = [];

    // 处理字符串搜索
    if (typeof data === 'string') {
      return this.searchInText(query, data, opts);
    }

    // 处理数组搜索
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const result = this.searchInItem(query, item, i, opts);
      if (result && result.score >= opts.minScore!) {
        results.push(result);
      }
    }

    // 排序
    this.sortResults(results, opts);

    // 限制结果数
    return results.slice(0, opts.limit);
  }

  /**
   * 在索引中搜索
   */
  searchInIndex<T = any>(
    indexId: string,
    query: string,
    options?: SearchOptions
  ): SearchResult<T>[] {
    const index = this.indices.get(indexId);
    if (!index) {
      throw new Error(`Index '${indexId}' not found`);
    }

    return this.search(query, index.data as T[], options);
  }

  // ============== 搜索实现 ==============

  /**
   * 在文本中搜索
   */
  private searchInText<T>(
    query: string,
    text: string,
    options: SearchOptions
  ): SearchResult<T>[] {
    const keywords = this.tokenizeQuery(query);
    const positions: MatchPosition[] = [];
    const matchedKeywords: string[] = [];
    let score = 0;

    const searchText = options.caseSensitive ? text : text.toLowerCase();

    for (const keyword of keywords) {
      const searchKeyword = options.caseSensitive ? keyword : keyword.toLowerCase();
      let index = 0;

      while ((index = searchText.indexOf(searchKeyword, index)) !== -1) {
        positions.push({
          start: index,
          end: index + keyword.length,
          keyword,
        });
        matchedKeywords.push(keyword);
        score += 1;
        index += keyword.length;
      }
    }

    if (positions.length === 0) {
      return [];
    }

    // 计算归一化分数
    score = Math.min(1, score / keywords.length);

    // 生成高亮文本
    const highlightedText = this.highlightText(text, positions, options.highlightTag);

    // 生成片段
    const snippets = options.includeContext
      ? this.generateSnippets(text, positions, options.contextLength)
      : undefined;

    return [
      {
        item: text as any,
        score,
        matchedKeywords: Array.from(new Set(matchedKeywords)),
        highlightedText,
        snippets,
        matchPositions: positions,
      },
    ];
  }

  /**
   * 在单个数据项中搜索
   */
  private searchInItem<T>(
    query: string,
    item: T,
    index: number,
    options: SearchOptions
  ): SearchResult<T> | null {
    const keywords = this.tokenizeQuery(query);
    const searchText = this.extractText(item, options.searchFields);
    const positions: MatchPosition[] = [];
    const matchedKeywords: string[] = [];
    let score = 0;

    const caseSearchText = options.caseSensitive ? searchText : searchText.toLowerCase();

    for (const keyword of keywords) {
      const searchKeyword = options.caseSensitive ? keyword : keyword.toLowerCase();
      let searchIndex = 0;

      while ((searchIndex = caseSearchText.indexOf(searchKeyword, searchIndex)) !== -1) {
        positions.push({
          start: searchIndex,
          end: searchIndex + keyword.length,
          keyword,
        });
        matchedKeywords.push(keyword);
        score += 1;
        searchIndex += keyword.length;
      }
    }

    if (positions.length === 0) {
      return null;
    }

    // 计算分数
    const keywordMatchScore = Math.min(1, matchedKeywords.length / keywords.length);
    const densityScore = Math.min(1, positions.length / searchText.length * 100);
    score = keywordMatchScore * 0.7 + densityScore * 0.3;

    // 生成高亮文本
    const highlightedText = this.highlightText(searchText, positions, options.highlightTag);

    // 生成片段
    const snippets = options.includeContext
      ? this.generateSnippets(searchText, positions, options.contextLength)
      : undefined;

    // 提取时间戳 (如果有)
    const timestamp = this.extractTimestamp(item);

    return {
      item,
      score,
      matchedKeywords: Array.from(new Set(matchedKeywords)),
      highlightedText,
      snippets,
      matchPositions: positions,
      id: (item as any).id ?? index,
      timestamp,
    };
  }

  // ============== 辅助方法 ==============

  /**
   * 分词查询
   */
  private tokenizeQuery(query: string): string[] {
    // 支持引号包裹的短语
    const phraseRegex = /"([^"]+)"/g;
    const phrases: string[] = [];
    let match;

    let processedQuery = query;
    while ((match = phraseRegex.exec(query)) !== null) {
      phrases.push(match[1]);
      processedQuery = processedQuery.replace(match[0], '');
    }

    // 剩余部分按空格分词
    const words = processedQuery
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    return [...phrases, ...words];
  }

  /**
   * 从对象中提取文本
   */
  private extractText(item: any, searchFields?: string[]): string {
    if (typeof item === 'string') {
      return item;
    }

    if (typeof item === 'object' && item !== null) {
      if (searchFields && searchFields.length > 0) {
        return searchFields
          .map((field) => {
            const value = this.getNestedValue(item, field);
            return typeof value === 'string' ? value : JSON.stringify(value);
          })
          .join(' ');
      }

      // 默认提取所有字符串字段
      return Object.values(item)
        .filter((v) => typeof v === 'string')
        .join(' ');
    }

    return String(item);
  }

  /**
   * 获取嵌套对象值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => {
      return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
  }

  /**
   * 提取时间戳
   */
  private extractTimestamp(item: any): number | undefined {
    if (typeof item !== 'object' || item === null) return undefined;

    const timestampFields = ['timestamp', 'createdAt', 'updatedAt', 'time', 'date'];
    for (const field of timestampFields) {
      if (item[field]) {
        const value = item[field];
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = Date.parse(value);
          if (!isNaN(parsed)) return parsed;
        }
      }
    }

    return undefined;
  }

  /**
   * 高亮文本
   */
  private highlightText(
    text: string,
    positions: MatchPosition[],
    tag?: string
  ): string {
    if (positions.length === 0) return text;

    const highlightTag = tag || 'mark';
    
    // 按位置排序
    const sortedPositions = [...positions].sort((a, b) => a.start - b.start);

    // 去重和合并重叠位置
    const mergedPositions = this.mergePositions(sortedPositions);

    // 构建高亮文本
    let result = '';
    let lastIndex = 0;

    for (const pos of mergedPositions) {
      result += text.slice(lastIndex, pos.start);
      result += `<${highlightTag}>${text.slice(pos.start, pos.end)}</${highlightTag}>`;
      lastIndex = pos.end;
    }

    result += text.slice(lastIndex);
    return result;
  }

  /**
   * 合并重叠的位置
   */
  private mergePositions(positions: MatchPosition[]): MatchPosition[] {
    if (positions.length === 0) return [];

    const merged: MatchPosition[] = [];
    let current = { ...positions[0] };

    for (let i = 1; i < positions.length; i++) {
      const next = positions[i];
      if (next.start <= current.end) {
        // 重叠，扩展当前区间
        current.end = Math.max(current.end, next.end);
        current.keyword = `${current.keyword}|${next.keyword}`;
      } else {
        // 不重叠，保存当前并开始新的
        merged.push(current);
        current = { ...next };
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * 生成搜索片段
   */
  private generateSnippets(
    text: string,
    positions: MatchPosition[],
    contextLength: number = 50
  ): SearchSnippet[] {
    const snippets: SearchSnippet[] = [];
    const seen = new Set<number>();

    for (const pos of positions) {
      // 避免重复片段
      if (seen.has(pos.start)) continue;
      seen.add(pos.start);

      const start = Math.max(0, pos.start - contextLength);
      const end = Math.min(text.length, pos.end + contextLength);

      snippets.push({
        text: text.slice(start, end),
        start,
        end,
        hasPrefix: start > 0,
        hasSuffix: end < text.length,
      });
    }

    return snippets;
  }

  /**
   * 排序结果
   */
  private sortResults<T>(results: SearchResult<T>[], options: SearchOptions): void {
    const sortBy = options.sortBy || this.config.defaultSortBy;
    const sortOrder = options.sortOrder || this.config.defaultSortOrder;

    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = a.score - b.score;
          break;
        case 'time':
          comparison = (a.timestamp || 0) - (b.timestamp || 0);
          break;
        case 'alphabetical':
          comparison = String(a.highlightedText || '').localeCompare(
            String(b.highlightedText || '')
          );
          break;
        case 'length':
          comparison =
            (a.highlightedText?.length || 0) - (b.highlightedText?.length || 0);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * 合并选项
   */
  private mergeOptions(options?: SearchOptions): Required<SearchOptions> {
    return {
      caseSensitive: options?.caseSensitive ?? this.config.caseSensitive,
      useRegex: options?.useRegex ?? this.config.enableRegex,
      sortBy: options?.sortBy ?? this.config.defaultSortBy,
      sortOrder: options?.sortOrder ?? this.config.defaultSortOrder,
      limit: options?.limit ?? this.config.maxResults,
      minScore: options?.minScore ?? this.config.minScore,
      highlightTag: options?.highlightTag ?? 'mark',
      searchFields: options?.searchFields ?? [],
      includeContext: options?.includeContext ?? false,
      contextLength: options?.contextLength ?? 50,
    };
  }

  // ============== 高级搜索功能 ==============

  /**
   * 模糊搜索 (支持拼写错误)
   */
  fuzzySearch<T = any>(
    query: string,
    data: T[],
    options?: SearchOptions & { threshold?: number }
  ): SearchResult<T>[] {
    const keywords = this.tokenizeQuery(query);
    const threshold = options?.threshold ?? 0.6;
    const results: SearchResult<T>[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const searchText = this.extractText(item, options?.searchFields);
      let totalScore = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of keywords) {
        const score = this.fuzzyMatch(keyword, searchText);
        if (score >= threshold) {
          totalScore += score;
          matchedKeywords.push(keyword);
        }
      }

      if (matchedKeywords.length > 0) {
        const avgScore = totalScore / keywords.length;
        if (avgScore >= (options?.minScore ?? this.config.minScore)) {
          results.push({
            item,
            score: avgScore,
            matchedKeywords,
            id: (item as any).id ?? i,
          });
        }
      }
    }

    this.sortResults(results, options || {});
    return results.slice(0, options?.limit ?? this.config.maxResults);
  }

  /**
   * 模糊匹配 (简单实现)
   */
  private fuzzyMatch(keyword: string, text: string): number {
    const lowerKeyword = keyword.toLowerCase();
    const lowerText = text.toLowerCase();

    // 精确匹配
    if (lowerText.includes(lowerKeyword)) {
      return 1.0;
    }

    // 简单编辑距离
    const distance = this.levenshteinDistance(lowerKeyword, lowerText.slice(0, keyword.length + 2));
    const maxLen = Math.max(lowerKeyword.length, lowerText.length);
    return 1 - distance / maxLen;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(s1: string, s2: string): number {
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
   * 多条件搜索
   */
  multiSearch<T = any>(
    queries: string[],
    data: T[],
    options?: SearchOptions
  ): SearchResult<T>[] {
    const allResults = new Map<string | number, SearchResult<T>>();

    for (const query of queries) {
      const results = this.search(query, data, options);
      for (const result of results) {
        const key = result.id !== undefined ? result.id : String(result.item);
        const existing = allResults.get(key);

        if (existing) {
          // 合并结果
          existing.score = Math.max(existing.score, result.score);
          existing.matchedKeywords = Array.from(
            new Set([...existing.matchedKeywords, ...result.matchedKeywords])
          );
        } else {
          allResults.set(key, result);
        }
      }
    }

    const results = Array.from(allResults.values());
    this.sortResults(results, options || {});
    return results;
  }
}

// ============== 导出 ==============

export default SearchSkill;

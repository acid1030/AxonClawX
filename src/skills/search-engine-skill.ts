/**
 * 全文搜索引擎技能 - ACE
 * 
 * 提供完整的全文搜索功能：
 * 1. 索引建立 - 构建倒排索引
 * 2. 全文搜索 - 支持多关键词搜索
 * 3. 相关性排序 - 基于 TF-IDF 算法
 */

// ============================================
// 类型定义
// ============================================

/**
 * 文档索引项
 */
interface DocumentIndex {
  id: string;
  content: string;
  tokens: string[];
  termFrequency: Map<string, number>;
}

/**
 * 倒排索引项
 */
interface InvertedIndexItem {
  docIds: string[];
  positions: Map<string, number[]>;
}

/**
 * 搜索结果
 */
interface SearchResult {
  id: string;
  content: string;
  score: number;
  matchedTerms: string[];
}

// ============================================
// 搜索引擎类
// ============================================

export class SearchEngine {
  private documents: Map<string, DocumentIndex> = new Map();
  private invertedIndex: Map<string, InvertedIndexItem> = new Map();
  private documentCount: number = 0;

  /**
   * 分词器 - 将文本分割成词元
   * 支持中文分词（按字符）和英文分词（按空格）
   * 
   * @param text - 待分词的文本
   * @returns 词元数组
   */
  private tokenize(text: string): string[] {
    // 转换为小写
    const normalized = text.toLowerCase();
    
    // 提取所有字母数字和中文字符
    const tokens: string[] = [];
    const regex = /[a-z0-9]+|[\u4e00-\u9fff]/g;
    let match;
    
    while ((match = regex.exec(normalized)) !== null) {
      tokens.push(match[0]);
    }
    
    return tokens;
  }

  /**
   * 计算词频 (Term Frequency)
   * 
   * @param tokens - 文档词元列表
   * @returns 词频映射
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    
    // 归一化：除以总词数
    const totalTokens = tokens.length;
    if (totalTokens > 0) {
      for (const [term, count] of tf.entries()) {
        tf.set(term, count / totalTokens);
      }
    }
    
    return tf;
  }

  /**
   * 建立索引 - 将文档添加到搜索引擎
   * 
   * @param id - 文档唯一标识
   * @param content - 文档内容
   * 
   * @example
   * engine.index('doc1', '这是一篇关于人工智能的文章');
   * engine.index('doc2', 'Machine learning is a subset of AI');
   */
  index(id: string, content: string): void {
    // 分词
    const tokens = this.tokenize(content);
    
    // 计算词频
    const termFrequency = this.calculateTF(tokens);
    
    // 创建文档索引
    const docIndex: DocumentIndex = {
      id,
      content,
      tokens,
      termFrequency
    };
    
    this.documents.set(id, docIndex);
    this.documentCount++;
    
    // 更新倒排索引
    for (const [term, tf] of termFrequency.entries()) {
      if (!this.invertedIndex.has(term)) {
        this.invertedIndex.set(term, {
          docIds: [],
          positions: new Map()
        });
      }
      
      const indexItem = this.invertedIndex.get(term)!;
      if (!indexItem.docIds.includes(id)) {
        indexItem.docIds.push(id);
      }
      
      // 记录位置
      const positions: number[] = [];
      tokens.forEach((token, idx) => {
        if (token === term) {
          positions.push(idx);
        }
      });
      indexItem.positions.set(id, positions);
    }
  }

  /**
   * 批量建立索引
   * 
   * @param documents - 文档数组，每个文档包含 id 和 content
   * 
   * @example
   * engine.bulkIndex([
   *   { id: 'doc1', content: '人工智能改变世界' },
   *   { id: 'doc2', content: '机器学习是 AI 的分支' },
   *   { id: 'doc3', content: '深度学习在图像识别中应用广泛' }
   * ]);
   */
  bulkIndex(documents: Array<{ id: string; content: string }>): void {
    for (const doc of documents) {
      this.index(doc.id, doc.content);
    }
  }

  /**
   * 计算逆文档频率 (Inverse Document Frequency)
   * 
   * @param term - 词元
   * @returns IDF 值
   */
  private calculateIDF(term: string): number {
    const indexItem = this.invertedIndex.get(term);
    
    if (!indexItem || indexItem.docIds.length === 0) {
      return 0;
    }
    
    // IDF = log(N / df)
    const docFrequency = indexItem.docIds.length;
    return Math.log(this.documentCount / docFrequency);
  }

  /**
   * 计算 TF-IDF 分数
   * 
   * @param term - 词元
   * @param docId - 文档 ID
   * @returns TF-IDF 分数
   */
  private calculateTFIDF(term: string, docId: string): number {
    const doc = this.documents.get(docId);
    
    if (!doc) {
      return 0;
    }
    
    const tf = doc.termFrequency.get(term) || 0;
    const idf = this.calculateIDF(term);
    
    return tf * idf;
  }

  /**
   * 全文搜索 - 支持多关键词
   * 
   * @param query - 搜索查询（空格分隔多个关键词）
   * @param limit - 返回结果数量限制，默认 10
   * @returns 搜索结果数组（按相关性排序）
   * 
   * @example
   * const results = engine.search('人工智能 机器学习');
   * results.forEach(r => {
   *   console.log(`[${r.id}] 分数：${r.score.toFixed(4)} - ${r.content}`);
   * });
   */
  search(query: string, limit: number = 10): SearchResult[] {
    // 分词查询
    const queryTokens = this.tokenize(query);
    
    if (queryTokens.length === 0) {
      return [];
    }
    
    // 计算每个文档的相关性分数
    const scores: Map<string, { score: number; matchedTerms: string[] }> = new Map();
    
    for (const term of queryTokens) {
      const indexItem = this.invertedIndex.get(term);
      
      if (!indexItem) {
        continue;
      }
      
      // 对包含该词的所有文档计算 TF-IDF
      for (const docId of indexItem.docIds) {
        if (!scores.has(docId)) {
          scores.set(docId, { score: 0, matchedTerms: [] });
        }
        
        const tfidf = this.calculateTFIDF(term, docId);
        const entry = scores.get(docId)!;
        entry.score += tfidf;
        
        if (!entry.matchedTerms.includes(term)) {
          entry.matchedTerms.push(term);
        }
      }
    }
    
    // 转换为结果数组并排序
    const results: SearchResult[] = [];
    
    for (const [docId, { score, matchedTerms }] of scores.entries()) {
      const doc = this.documents.get(docId);
      
      if (doc) {
        results.push({
          id: docId,
          content: doc.content,
          score,
          matchedTerms
        });
      }
    }
    
    // 按分数降序排序
    results.sort((a, b) => b.score - a.score);
    
    // 限制返回数量
    return results.slice(0, limit);
  }

  /**
   * 高亮显示匹配词
   * 
   * @param content - 原始内容
   * @param terms - 要高亮的词元列表
   * @param highlightTag - 高亮标签，默认为 <mark>
   * @returns 高亮后的内容
   * 
   * @example
   * const highlighted = engine.highlight(content, ['人工智能', 'AI']);
   * console.log(highlighted); // 包含 <mark>人工智能</mark> 的文本
   */
  highlight(content: string, terms: string[], highlightTag: string = '<mark>'): string {
    let result = content;
    
    // 先尝试匹配原始查询词（如果包含中文连续词）
    const originalTerms = new Set(terms);
    
    for (const term of terms) {
      // 如果词元是单个字符，尝试组合成连续词
      if (term.length === 1 && /[\u4e00-\u9fff]/.test(term)) {
        // 跳过单字符中文，避免过度高亮
        continue;
      }
      
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      result = result.replace(regex, `${highlightTag}$1${highlightTag.replace('<', '</')}>`);
    }
    
    return result;
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 获取索引统计信息
   * 
   * @returns 统计信息对象
   * 
   * @example
   * const stats = engine.getStats();
   * console.log(`文档数：${stats.documentCount}, 词元数：${stats.totalTerms}`);
   */
  getStats(): { documentCount: number; totalTerms: number; uniqueTerms: number } {
    const uniqueTerms = this.invertedIndex.size;
    let totalTerms = 0;
    
    for (const doc of this.documents.values()) {
      totalTerms += doc.tokens.length;
    }
    
    return {
      documentCount: this.documentCount,
      totalTerms,
      uniqueTerms
    };
  }

  /**
   * 清除索引
   */
  clear(): void {
    this.documents.clear();
    this.invertedIndex.clear();
    this.documentCount = 0;
  }

  /**
   * 删除指定文档
   * 
   * @param id - 文档 ID
   * @returns 是否成功删除
   */
  delete(id: string): boolean {
    const doc = this.documents.get(id);
    
    if (!doc) {
      return false;
    }
    
    // 从倒排索引中移除
    for (const term of doc.termFrequency.keys()) {
      const indexItem = this.invertedIndex.get(term);
      
      if (indexItem) {
        indexItem.docIds = indexItem.docIds.filter(docId => docId !== id);
        indexItem.positions.delete(id);
        
        // 如果没有文档包含该词，删除倒排索引项
        if (indexItem.docIds.length === 0) {
          this.invertedIndex.delete(term);
        }
      }
    }
    
    // 删除文档
    this.documents.delete(id);
    this.documentCount--;
    
    return true;
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建搜索引擎实例
 * 
 * @returns 新的 SearchEngine 实例
 * 
 * @example
 * const engine = createSearchEngine();
 */
export function createSearchEngine(): SearchEngine {
  return new SearchEngine();
}

/**
 * 快速搜索 - 一行代码完成索引和搜索
 * 
 * @param documents - 文档数组
 * @param query - 搜索查询
 * @param limit - 结果数量限制
 * @returns 搜索结果
 * 
 * @example
 * const results = quickSearch(
 *   [
 *     { id: '1', content: '人工智能技术' },
 *     { id: '2', content: '机器学习算法' }
 *   ],
 *   '人工智能',
 *   5
 * );
 */
export function quickSearch(
  documents: Array<{ id: string; content: string }>,
  query: string,
  limit: number = 10
): SearchResult[] {
  const engine = new SearchEngine();
  engine.bulkIndex(documents);
  return engine.search(query, limit);
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 全文搜索引擎技能 - 使用示例 ===\n');
  
  // 创建搜索引擎
  const engine = createSearchEngine();
  
  // 1. 建立索引
  console.log('1️⃣ 建立索引:');
  const documents = [
    { id: 'doc1', content: '人工智能正在改变世界，机器学习是 AI 的核心技术' },
    { id: 'doc2', content: '深度学习在图像识别和自然语言处理中应用广泛' },
    { id: 'doc3', content: '神经网络模仿人脑结构，是深度学习的基础' },
    { id: 'doc4', content: '机器学习算法包括监督学习、无监督学习和强化学习' },
    { id: 'doc5', content: '人工智能的应用场景包括医疗、金融、交通等领域' }
  ];
  
  engine.bulkIndex(documents);
  console.log(`   已索引 ${documents.length} 篇文档`);
  
  // 获取统计信息
  const stats = engine.getStats();
  console.log(`   文档数：${stats.documentCount}, 词元数：${stats.totalTerms}, 唯一词元：${stats.uniqueTerms}\n`);
  
  // 2. 全文搜索
  console.log('2️⃣ 全文搜索 "人工智能":');
  const results1 = engine.search('人工智能', 3);
  results1.forEach((result, idx) => {
    console.log(`   ${idx + 1}. [${result.id}] 分数：${result.score.toFixed(4)}`);
    console.log(`      内容：${result.content}`);
    console.log(`      匹配词：${result.matchedTerms.join(', ')}\n`);
  });
  
  // 3. 多关键词搜索
  console.log('3️⃣ 多关键词搜索 "机器学习 深度学习":');
  const results2 = engine.search('机器学习 深度学习', 3);
  results2.forEach((result, idx) => {
    console.log(`   ${idx + 1}. [${result.id}] 分数：${result.score.toFixed(4)}`);
    console.log(`      内容：${result.content}`);
    console.log(`      匹配词：${result.matchedTerms.join(', ')}\n`);
  });
  
  // 4. 高亮显示
  console.log('4️⃣ 高亮显示:');
  const sampleDoc = documents[0];
  const highlighted = engine.highlight(sampleDoc.content, ['人工智能', '机器学习']);
  console.log(`   原始：${sampleDoc.content}`);
  console.log(`   高亮：${highlighted}\n`);
  
  // 5. 快速搜索
  console.log('5️⃣ 快速搜索 (一行代码):');
  const quickResults = quickSearch(documents, '神经网络', 2);
  quickResults.forEach((result, idx) => {
    console.log(`   ${idx + 1}. [${result.id}] 分数：${result.score.toFixed(4)} - ${result.content}\n`);
  });
  
  // 6. 删除文档
  console.log('6️⃣ 删除文档:');
  engine.delete('doc5');
  console.log(`   删除后文档数：${engine.getStats().documentCount}\n`);
  
  console.log('✅ 搜索引擎技能演示完成!');
}

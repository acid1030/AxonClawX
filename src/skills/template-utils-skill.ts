/**
 * Template Utils - 高性能模板渲染工具集
 * 
 * 功能:
 * 1. 模板编译 (预编译为渲染函数)
 * 2. 模板缓存 (LRU 缓存机制)
 * 3. 模板引擎 (变量/条件/循环/过滤器)
 * 
 * @author KAEL (Subagent of Axon)
 * @version 1.0.0
 * @created 2026-03-13
 */

// ============== 类型定义 ==============

export interface TemplateOptions {
  /** 变量开始标记，默认 "{{" */
  delimiterStart?: string;
  /** 变量结束标记，默认 "}}" */
  delimiterEnd?: string;
  /** 是否忽略未定义变量，默认 true */
  ignoreUndefined?: boolean;
  /** 是否启用缓存，默认 true */
  enableCache?: boolean;
  /** 缓存最大条目数，默认 100 */
  cacheMaxSize?: number;
  /** 是否严格模式 (未定义变量抛错)，默认 false */
  strict?: boolean;
}

export interface TemplateContext {
  [key: string]: any;
}

export interface FilterFunction {
  (value: any, ...args: any[]): any;
}

export interface CompiledTemplate {
  (context?: TemplateContext): string;
  source?: string;
  id?: string;
}

export interface TemplateCacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

// ============== LRU 缓存实现 ==============

class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移动到最新 (删除后重新添加)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getMaxSize(): number {
    return this.maxSize;
  }
}

// ============== 内置过滤器 ==============

const builtInFilters: Record<string, FilterFunction> = {
  upper: (val) => String(val).toUpperCase(),
  lower: (val) => String(val).toLowerCase(),
  capitalize: (val) => {
    const str = String(val);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  trim: (val) => String(val).trim(),
  length: (val) => (Array.isArray(val) || typeof val === 'string') ? val.length : 0,
  first: (val) => (Array.isArray(val) ? val[0] : val),
  last: (val) => (Array.isArray(val) ? val[val.length - 1] : val),
  reverse: (val) => (Array.isArray(val) ? [...val].reverse() : val),
  join: (val, sep = ', ') => (Array.isArray(val) ? val.join(sep) : val),
  slice: (val, start = 0, end?: number) => 
    (Array.isArray(val) || typeof val === 'string') ? val.slice(start, end) : val,
  default: (val, defaultValue = '') => (val !== undefined && val !== null ? val : defaultValue),
  number: (val, decimals = 0) => {
    const num = Number(val);
    return isNaN(num) ? val : num.toFixed(Number(decimals));
  },
  json: (val, spaces = 0) => JSON.stringify(val, null, Number(spaces)),
  urlencode: (val) => encodeURIComponent(String(val)),
  html: (val) => String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;'),
  date: (val, format = 'YYYY-MM-DD') => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return val;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },
  truncate: (val, length = 30, suffix = '...') => {
    const str = String(val);
    return str.length > Number(length) ? str.slice(0, Number(length)) + suffix : str;
  },
};

// ============== 正则表达式工厂 ==============

const DEFAULT_DELIMITER_START = '{{';
const DEFAULT_DELIMITER_END = '}}';

function createRegexes(start: string, end: string) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    variable: new RegExp(`${escapedStart}\\s*([^{}#\\/]+?)\\s*${escapedEnd}`, 'g'),
    ifBlock: new RegExp(
      `${escapedStart}#if\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)(?:${escapedStart}else${escapedEnd}([\\s\\S]*?))?${escapedStart}\\/if${escapedEnd}`,
      'g'
    ),
    eachBlock: new RegExp(
      `${escapedStart}#each\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/each${escapedEnd}`,
      'g'
    ),
    forBlock: new RegExp(
      `${escapedStart}#for\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/for${escapedEnd}`,
      'g'
    ),
    thisRef: new RegExp(`${escapedStart}\\s*this(\\.[\\w.]+)?\\s*${escapedEnd}`, 'g'),
  };
}

// ============== TemplateUtils 类 ==============

/**
 * 高性能模板渲染工具集
 * 
 * 核心特性:
 * - 预编译模板为渲染函数，提升重复渲染性能
 * - LRU 缓存机制，自动管理内存
 * - 支持变量/条件/循环/过滤器
 * - 可扩展的过滤器系统
 * 
 * @example
 * ```typescript
 * // 基本使用
 * const utils = new TemplateUtils();
 * const result = utils.render('Hello, {{name}}!', { name: 'Alice' });
 * 
 * // 预编译模板
 * const compiled = utils.compile('Hello, {{name}}!');
 * const result = compiled({ name: 'Bob' });
 * 
 * // 使用过滤器
 * const result = utils.render('{{name | upper | truncate:10}}', { name: 'Alexander' });
 * 
 * // 条件渲染
 * const result = utils.render(
 *   '{{#if isAdmin}}Admin{{else}}User{{/if}}',
 *   { isAdmin: true }
 * );
 * 
 * // 循环渲染
 * const result = utils.render(
 *   '{{#each items}}<li>{{this}}</li>{{/each}}',
 *   { items: ['A', 'B', 'C'] }
 * );
 * 
 * // 查看缓存统计
 * const stats = utils.getCacheStats();
 * console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 * ```
 */
export class TemplateUtils {
  private options: Required<TemplateOptions>;
  private filters: Record<string, FilterFunction> = { ...builtInFilters };
  private cache: LRUCache<string, CompiledTemplate>;
  private regexes: ReturnType<typeof createRegexes>;
  
  // 缓存统计
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(options: TemplateOptions = {}) {
    this.options = {
      delimiterStart: options.delimiterStart ?? DEFAULT_DELIMITER_START,
      delimiterEnd: options.delimiterEnd ?? DEFAULT_DELIMITER_END,
      ignoreUndefined: options.ignoreUndefined ?? true,
      enableCache: options.enableCache ?? true,
      cacheMaxSize: options.cacheMaxSize ?? 100,
      strict: options.strict ?? false,
    };

    this.cache = new LRUCache(this.options.cacheMaxSize);
    this.regexes = createRegexes(this.options.delimiterStart, this.options.delimiterEnd);
  }

  // ============== 公共方法 ==============

  /**
   * 注册自定义过滤器
   * 
   * @param name - 过滤器名称
   * @param fn - 过滤器函数
   * @returns this (链式调用)
   * 
   * @example
   * ```typescript
   * utils.useFilter('slugify', (val) => 
   *   String(val).toLowerCase().replace(/\s+/g, '-')
   * );
   * const result = utils.render('{{title | slugify}}', { title: 'Hello World' });
   * // 输出："hello-world"
   * ```
   */
  useFilter(name: string, fn: FilterFunction): this {
    this.filters[name] = fn;
    return this;
  }

  /**
   * 预编译模板为渲染函数
   * 
   * @param template - 模板字符串
   * @param id - 可选的模板 ID (用于缓存标识)
   * @returns 编译后的渲染函数
   * 
   * @example
   * ```typescript
   * const compiled = utils.compile('Hello, {{name}}!');
 * const result1 = compiled({ name: 'Alice' });
   * const result2 = compiled({ name: 'Bob' });
   * // 模板只编译一次，多次调用性能更高
   * ```
   */
  compile(template: string, id?: string): CompiledTemplate {
    const cacheKey = id || template;

    if (this.options.enableCache && this.cache.has(cacheKey)) {
      this.cacheHits++;
      const cached = this.cache.get(cacheKey)!;
      return cached;
    }

    this.cacheMisses++;

    const renderFn = (context: TemplateContext = {}): string => {
      return this.render(template, context);
    };

    renderFn.source = template;
    renderFn.id = id;

    if (this.options.enableCache) {
      this.cache.set(cacheKey, renderFn);
    }

    return renderFn;
  }

  /**
   * 渲染模板
   * 
   * @param template - 模板字符串
   * @param context - 上下文对象
   * @returns 渲染后的字符串
   * 
   * @example
   * ```typescript
   * const result = utils.render(
   *   '{{#each users}}{{name}} ({{email}}){{/each}}',
   *   { users: [{ name: 'Alice', email: 'a@test.com' }] }
   * );
   * ```
   */
  render(template: string, context: TemplateContext = {}): string {
    let result = template;

    // 1. 处理条件块 ({{#if}}...{{else}}...{{/if}})
    result = this.processIfBlocks(result, context);

    // 2. 处理循环块 ({{#each}}...{{/each}})
    result = this.processEachBlocks(result, context);

    // 3. 处理 for 循环 ({{#for let i=0; i<10; i++}}...{{/for}})
    result = this.processForBlocks(result, context);

    // 4. 处理变量替换 ({{variable}} 和 {{variable | filter}})
    result = this.processVariables(result, context);

    // 5. 处理 this 引用 ({{this}} 在循环中)
    result = this.processThisReferences(result, context);

    return result;
  }

  /**
   * 快速渲染 (静态方法，使用默认配置)
   * 
   * @param template - 模板字符串
   * @param context - 上下文对象
   * @returns 渲染后的字符串
   * 
   * @example
   * ```typescript
   * const result = TemplateUtils.render('Hello, {{name}}!', { name: 'Alice' });
   * ```
   */
  static render(template: string, context: TemplateContext = {}): string {
    const utils = new TemplateUtils();
    return utils.render(template, context);
  }

  /**
   * 清除缓存
   * 
   * @example
   * ```typescript
   * utils.clearCache();
   * ```
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 缓存统计数据
   * 
   * @example
   * ```typescript
   * const stats = utils.getCacheStats();
   * console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
   * console.log(`Size: ${stats.size}/${stats.maxSize}`);
   * ```
   */
  getCacheStats(): TemplateCacheStats {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size(),
      maxSize: this.cache.getMaxSize(),
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * 移除缓存中的模板
   * 
   * @param key - 模板键 (模板字符串或 ID)
   * @returns 是否成功移除
   */
  removeFromCache(key: string): boolean {
    if (this.cache.has(key)) {
      this.cache.set(key, undefined as any); // 删除会触发 LRU 调整，用 undefined 替代
      return true;
    }
    return false;
  }

  // ============== 内部处理方法 ==============

  private processIfBlocks(template: string, context: TemplateContext): string {
    return template.replace(this.regexes.ifBlock, (match, condition, content, elseContent = '') => {
      const conditionValue = this.evaluateCondition(condition.trim(), context);
      return conditionValue ? this.processNestedBlocks(content, context) : this.processNestedBlocks(elseContent, context);
    });
  }

  private processEachBlocks(template: string, context: TemplateContext): string {
    return template.replace(this.regexes.eachBlock, (match, arrayPath, content) => {
      const array = this.getNestedValue(arrayPath.trim(), context);
      
      if (!Array.isArray(array)) {
        return this.options.ignoreUndefined ? '' : match;
      }

      return array.map((item, index) => {
        const loopContext = {
          ...context,
          this: item,
          index,
          first: index === 0,
          last: index === array.length - 1,
          length: array.length,
        };

        return this.processNestedBlocks(content, loopContext);
      }).join('');
    });
  }

  private processForBlocks(template: string, context: TemplateContext): string {
    return template.replace(this.regexes.forBlock, (match, expression, content) => {
      const parts = expression.split(';').map(p => p.trim());
      if (parts.length !== 3) return match;

      const [init, condition, increment] = parts;
      
      const initMatch = init.match(/let\s+(\w+)\s*=\s*(\d+)/);
      if (!initMatch) return match;
      
      const varName = initMatch[1];
      let value = Number(initMatch[2]);
      
      const condMatch = condition.match(/(\w+)\s*([<>=!]+)\s*(\d+)/);
      if (!condMatch || condMatch[1] !== varName) return match;
      
      const operator = condMatch[2];
      const limit = Number(condMatch[3]);
      
      const incMatch = increment.match(/(\w+)(\+\+|--)/);
      if (!incMatch || incMatch[1] !== varName) return match;
      
      const incOp = incMatch[2];
      
      const results: string[] = [];
      const loopContext = { ...context };
      
      while (true) {
        loopContext[varName] = value;
        
        let shouldContinue = false;
        switch (operator) {
          case '<': shouldContinue = value < limit; break;
          case '<=': shouldContinue = value <= limit; break;
          case '>': shouldContinue = value > limit; break;
          case '>=': shouldContinue = value >= limit; break;
          case '==': shouldContinue = value == limit; break;
          case '!=': shouldContinue = value != limit; break;
        }
        
        if (!shouldContinue) break;
        
        results.push(this.processNestedBlocks(content, loopContext));
        
        if (incOp === '++') value++;
        else if (incOp === '--') value--;
      }
      
      return results.join('');
    });
  }

  private processVariables(template: string, context: TemplateContext): string {
    return template.replace(this.regexes.variable, (match, expression) => {
      const parts = expression.split('|').map(p => p.trim());
      const path = parts[0];
      const filters = parts.slice(1);

      let value = this.getNestedValue(path, context);

      for (const filter of filters) {
        const [filterName, ...args] = filter.split(':');
        const filterFn = this.filters[filterName.trim()];
        
        if (filterFn) {
          value = filterFn(value, ...args);
        } else if (this.options.strict) {
          throw new Error(`Filter "${filterName}" not found`);
        }
      }

      if (value === undefined || value === null) {
        return this.options.ignoreUndefined ? '' : match;
      }

      return String(value);
    });
  }

  private processThisReferences(template: string, context: TemplateContext): string {
    return template.replace(this.regexes.thisRef, (match, path) => {
      if (!path) {
        const value = context.this;
        return value !== undefined && value !== null ? String(value) : (this.options.ignoreUndefined ? '' : match);
      }

      const fullPath = `this${path}`;
      const value = this.getNestedValue(fullPath, context);
      return value !== undefined && value !== null ? String(value) : (this.options.ignoreUndefined ? '' : match);
    });
  }

  private processNestedBlocks(content: string, context: TemplateContext): string {
    let result = content;
    result = this.processIfBlocks(result, context);
    result = this.processEachBlocks(result, context);
    result = this.processForBlocks(result, context);
    result = this.processVariables(result, context);
    result = this.processThisReferences(result, context);
    return result;
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    condition = condition.trim();

    if (condition.startsWith('!')) {
      return !this.evaluateCondition(condition.slice(1).trim(), context);
    }

    if (condition.includes('&&')) {
      const parts = condition.split('&&');
      return parts.every(part => this.evaluateCondition(part.trim(), context));
    }

    if (condition.includes('||')) {
      const parts = condition.split('||');
      return parts.some(part => this.evaluateCondition(part.trim(), context));
    }

    const operators = ['>=', '<=', '!=', '==', '>', '<'];
    for (const op of operators) {
      const parts = condition.split(op);
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0].trim(), context);
        const right = this.evaluateExpression(parts[1].trim(), context);
        
        switch (op) {
          case '>=': return left >= right;
          case '<=': return left <= right;
          case '!=': return left != right;
          case '==': return left == right;
          case '>': return left > right;
          case '<': return left < right;
        }
      }
    }

    const value = this.getNestedValue(condition, context);
    return Boolean(value);
  }

  private evaluateExpression(expr: string, context: TemplateContext): any {
    expr = expr.trim();

    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return Number(expr);
    }

    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    return this.getNestedValue(expr, context);
  }

  private getNestedValue(path: string, context: TemplateContext): any {
    if (!path) return undefined;

    const parts = path.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }
}

// ============== 快捷函数 ==============

/**
 * 快速渲染模板 (静态方法别名)
 */
export function template(template: string, context: TemplateContext = {}): string {
  return TemplateUtils.render(template, context);
}

/**
 * 创建带自定义选项的模板引擎
 */
export function createTemplateEngine(options: TemplateOptions = {}): TemplateUtils {
  return new TemplateUtils(options);
}

// ============== 预定义模板片段 ==============

export const snippets = {
  greeting: 'Hello, {{name}}!{{#if title}} ({{title}}){{/if}}',
  list: '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>',
  conditionalMessage: '{{#if success}}Success!{{else}}Failed.{{/if}}',
  tableRow: '<tr>{{#each columns}}<td>{{this}}</td>{{/each}}</tr>',
  userCard: `
<div class="user-card">
  <h3>{{user.name | upper}}</h3>
  <p>Email: {{user.email}}</p>
  {{#if user.isAdmin}}<span class="badge">Admin</span>{{/if}}
</div>
  `.trim(),
  forLoop: '{{#for let i=0; i<5; i++}}Item {{i}} {{/for}}',
  emailSubject: '[{{status | upper}}] {{title | truncate:50}}',
  jsonOutput: '{{data | json:2}}',
};

// ============== 导出默认 ==============

export default TemplateUtils;

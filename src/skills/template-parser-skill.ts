/**
 * Template Parser - 高性能模板渲染引擎
 * 
 * 功能:
 * 1. 模板编译 (预编译为渲染函数)
 * 2. 变量插值 (支持嵌套路径、过滤器)
 * 3. 条件渲染 (if/else/elseif)
 * 4. 循环渲染 (each/for)
 * 5. 模板继承 (extends/block/include)
 * 6. 自定义指令和过滤器
 * 
 * @author Axon
 * @version 2.0.0
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
  /** 是否严格模式 (未定义变量抛错)，默认 false */
  strict?: boolean;
}

export interface TemplateContext {
  [key: string]: any;
}

export interface FilterFunction {
  (value: any, ...args: any[]): any;
}

export interface DirectiveFunction {
  (value: any, context: TemplateContext, ...args: any[]): string;
}

export interface CompiledTemplate {
  (context?: TemplateContext): string;
  source?: string;
}

export interface TemplateBlock {
  name: string;
  content: string;
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
};

// ============== 正则表达式 ==============

const DEFAULT_DELIMITER_START = '{{';
const DEFAULT_DELIMITER_END = '}}';

/**
 * 匹配变量：{{ variable }} 或 {{ nested.path | filter:arg1:arg2 }}
 */
const createVariableRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}\\s*([^{}#\\/]+?)\\s*${escapedEnd}`, 'g');
};

/**
 * 匹配条件块：{{#if condition}}...{{else}}...{{/if}}
 */
const createIfBlockRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `${escapedStart}#if\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)(?:${escapedStart}else${escapedEnd}([\\s\\S]*?))?${escapedStart}\\/if${escapedEnd}`,
    'g'
  );
};

/**
 * 匹配 elseif: {{elseif condition}}
 */
const createElseifRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}elseif\\s+([^}]+?)\\s*${escapedEnd}`, 'g');
};

/**
 * 匹配循环块：{{#each array}}...{{/each}}
 */
const createEachBlockRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `${escapedStart}#each\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/each${escapedEnd}`,
    'g'
  );
};

/**
 * 匹配 for 循环：{{#for let i=0; i<10; i++}}...{{/for}}
 */
const createForBlockRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `${escapedStart}#for\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/for${escapedEnd}`,
    'g'
  );
};

/**
 * 匹配 this 引用：{{this}} 或 {{this.property}}
 */
const createThisRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}\\s*this(\\.[\\w.]+)?\\s*${escapedEnd}`, 'g');
};

/**
 * 匹配 block 定义：{{#block name}}...{{/block}}
 */
const createBlockRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `${escapedStart}#block\\s+(\\w+)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/block${escapedEnd}`,
    'g'
  );
};

/**
 * 匹配 extends: {{extends "template"}}
 */
const createExtendsRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}extends\\s+["']([^"']+)["']\\s*${escapedEnd}`, 'g');
};

/**
 * 匹配 include: {{include "template"}}
 */
const createIncludeRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}include\\s+["']([^"']+)["']\\s*${escapedEnd}`, 'g');
};

// ============== TemplateParser 类 ==============

/**
 * 高性能模板渲染引擎
 * 
 * @example
 * ```typescript
 * // 基本变量替换
 * const parser = new TemplateParser();
 * const result = parser.render('Hello, {{name}}!', { name: 'Alice' });
 * 
 * // 使用过滤器
 * const result = parser.render('{{name | upper}}', { name: 'alice' });
 * // 输出："ALICE"
 * 
 * // 预编译模板
 * const compiled = parser.compile('Hello, {{name}}!');
 * const result = compiled({ name: 'Bob' });
 * 
 * // 条件渲染
 * const result = parser.render(
 *   '{{#if isAdmin}}Admin{{else}}User{{/if}}',
 *   { isAdmin: true }
 * );
 * 
 * // 循环渲染
 * const result = parser.render(
 *   '{{#each items}}{{this}}, {{/each}}',
 *   { items: ['A', 'B', 'C'] }
 * );
 * ```
 */
export class TemplateParser {
  private options: Required<TemplateOptions>;
  private filters: Record<string, FilterFunction> = { ...builtInFilters };
  private directives: Record<string, DirectiveFunction> = {};
  private cache: Map<string, CompiledTemplate> = new Map();
  private templates: Map<string, string> = new Map();
  
  private variableRegex!: RegExp;
  private ifBlockRegex!: RegExp;
  private elseifRegex!: RegExp;
  private eachBlockRegex!: RegExp;
  private forBlockRegex!: RegExp;
  private thisRegex!: RegExp;
  private blockRegex!: RegExp;
  private extendsRegex!: RegExp;
  private includeRegex!: RegExp;

  constructor(options: TemplateOptions = {}) {
    this.options = {
      delimiterStart: options.delimiterStart ?? DEFAULT_DELIMITER_START,
      delimiterEnd: options.delimiterEnd ?? DEFAULT_DELIMITER_END,
      ignoreUndefined: options.ignoreUndefined ?? true,
      enableCache: options.enableCache ?? true,
      strict: options.strict ?? false,
    };

    this.compileRegexes();
  }

  private compileRegexes() {
    const { delimiterStart, delimiterEnd } = this.options;
    this.variableRegex = createVariableRegex(delimiterStart, delimiterEnd);
    this.ifBlockRegex = createIfBlockRegex(delimiterStart, delimiterEnd);
    this.elseifRegex = createElseifRegex(delimiterStart, delimiterEnd);
    this.eachBlockRegex = createEachBlockRegex(delimiterStart, delimiterEnd);
    this.forBlockRegex = createForBlockRegex(delimiterStart, delimiterEnd);
    this.thisRegex = createThisRegex(delimiterStart, delimiterEnd);
    this.blockRegex = createBlockRegex(delimiterStart, delimiterEnd);
    this.extendsRegex = createExtendsRegex(delimiterStart, delimiterEnd);
    this.includeRegex = createIncludeRegex(delimiterStart, delimiterEnd);
  }

  // ============== 公共方法 ==============

  /**
   * 注册自定义过滤器
   */
  useFilter(name: string, fn: FilterFunction): this {
    this.filters[name] = fn;
    return this;
  }

  /**
   * 注册自定义指令
   */
  useDirective(name: string, fn: DirectiveFunction): this {
    this.directives[name] = fn;
    return this;
  }

  /**
   * 注册模板 (用于 extends/include)
   */
  useTemplate(name: string, content: string): this {
    this.templates.set(name, content);
    return this;
  }

  /**
   * 预编译模板为渲染函数
   */
  compile(template: string): CompiledTemplate {
    const cacheKey = template;
    
    if (this.options.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const renderFn = (context: TemplateContext = {}): string => {
      return this.render(template, context);
    };

    renderFn.source = template;

    if (this.options.enableCache) {
      this.cache.set(cacheKey, renderFn);
    }

    return renderFn;
  }

  /**
   * 渲染模板
   */
  render(template: string, context: TemplateContext = {}): string {
    let result = template;

    // 1. 处理 extends (模板继承)
    result = this.processExtends(result, context);

    // 2. 处理 include (模板包含)
    result = this.processIncludes(result, context);

    // 3. 处理条件块
    result = this.processIfBlocks(result, context);

    // 4. 处理循环块
    result = this.processEachBlocks(result, context);
    result = this.processForBlocks(result, context);

    // 5. 处理变量替换
    result = this.processVariables(result, context);

    // 6. 处理 this 引用
    result = this.processThisReferences(result, context);

    return result;
  }

  /**
   * 静态方法：快速渲染
   */
  static render(template: string, context: TemplateContext = {}): string {
    const parser = new TemplateParser();
    return parser.render(template, context);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ============== 内部处理方法 ==============

  private processExtends(template: string, context: TemplateContext): string {
    const match = this.extendsRegex.exec(template);
    if (!match) return template;

    const [, templateName] = match;
    const parentTemplate = this.templates.get(templateName);
    
    if (!parentTemplate) {
      return this.options.strict ? 
        new Error(`Template "${templateName}" not found`) as any : 
        template;
    }

    // 提取子模板的 blocks
    const blocks: Record<string, string> = {};
    template.replace(this.blockRegex, (_, name, content) => {
      blocks[name] = content;
      return '';
    });

    // 将子模板的 blocks 替换到父模板
    let result = parentTemplate;
    for (const [name, content] of Object.entries(blocks)) {
      const blockRegex = new RegExp(
        `${this.options.delimiterStart}#block\\s+${name}\\s*${this.options.delimiterEnd}[\\s\\S]*?${this.options.delimiterStart}\\/block${this.options.delimiterEnd}`,
        'g'
      );
      result = result.replace(blockRegex, content);
    }

    return result;
  }

  private processIncludes(template: string, context: TemplateContext): string {
    return template.replace(this.includeRegex, (match, templateName) => {
      const includedTemplate = this.templates.get(templateName);
      if (!includedTemplate) {
        return this.options.strict ? 
          new Error(`Template "${templateName}" not found`) as any : 
          match;
      }
      return this.render(includedTemplate, context);
    });
  }

  private processIfBlocks(template: string, context: TemplateContext): string {
    // 处理 elseif
    template = template.replace(this.elseifRegex, (match, condition) => {
      return `{{__ELSEIF__${condition}__}}`;
    });

    return template.replace(this.ifBlockRegex, (match, condition, content, elseContent = '') => {
      // 分割 elseif 分支
      const parts = this.splitElseifBlocks(content, elseContent);
      
      for (const part of parts) {
        if (part.condition === '__ELSE__' || this.evaluateCondition(part.condition, context)) {
          return this.processNestedBlocks(part.content, context);
        }
      }
      
      return '';
    });
  }

  private splitElseifBlocks(ifContent: string, elseContent: string): Array<{condition: string, content: string}> {
    const parts: Array<{condition: string, content: string}> = [];
    const elseifMarker = '{{__ELSEIF__';
    const elseifEndMarker = '__}}';
    
    // 第一个条件是 if 的条件 (由外层处理)
    // 这里只处理 elseif 和 else
    
    let currentContent = ifContent;
    let currentIndex = 0;
    
    // 查找 elseif
    while (true) {
      const elseifIndex = currentContent.indexOf(elseifMarker);
      if (elseifIndex === -1) break;
      
      const conditionStart = elseifIndex + elseifMarker.length;
      const conditionEnd = currentContent.indexOf(elseifEndMarker, conditionStart);
      if (conditionEnd === -1) break;
      
      const condition = currentContent.substring(conditionStart, conditionEnd);
      parts.push({ condition, content: '' });
      
      currentContent = currentContent.substring(conditionEnd + elseifEndMarker.length);
    }
    
    // 最后一个部分是 else 内容
    if (currentContent) {
      parts.push({ condition: '__ELSE__', content: elseContent || currentContent });
    }
    
    return parts;
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

  private processEachBlocks(template: string, context: TemplateContext): string {
    return template.replace(this.eachBlockRegex, (match, arrayPath, content) => {
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
    return template.replace(this.forBlockRegex, (match, expression, content) => {
      // 解析 for 表达式：let i=0; i<10; i++
      const parts = expression.split(';').map(p => p.trim());
      if (parts.length !== 3) return match;

      const [init, condition, increment] = parts;
      
      // 解析初始化
      const initMatch = init.match(/let\s+(\w+)\s*=\s*(\d+)/);
      if (!initMatch) return match;
      
      const varName = initMatch[1];
      let value = Number(initMatch[2]);
      
      // 解析条件
      const condMatch = condition.match(/(\w+)\s*([<>=!]+)\s*(\d+)/);
      if (!condMatch || condMatch[1] !== varName) return match;
      
      const operator = condMatch[2];
      const limit = Number(condMatch[3]);
      
      // 解析增量
      const incMatch = increment.match(/(\w+)(\+\+|--)/);
      if (!incMatch || incMatch[1] !== varName) return match;
      
      const incOp = incMatch[2];
      
      // 执行循环
      const results: string[] = [];
      const loopContext = { ...context };
      
      while (true) {
        loopContext[varName] = value;
        
        // 检查条件
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
        
        // 增量
        if (incOp === '++') value++;
        else if (incOp === '--') value--;
      }
      
      return results.join('');
    });
  }

  private processVariables(template: string, context: TemplateContext): string {
    return template.replace(this.variableRegex, (match, expression) => {
      // 跳过特殊标记
      if (expression.trim().startsWith('__')) {
        return match;
      }

      // 检查是否包含过滤器
      const parts = expression.split('|').map(p => p.trim());
      const path = parts[0];
      const filters = parts.slice(1);

      let value = this.getNestedValue(path, context);

      // 应用过滤器
      for (const filter of filters) {
        const [filterName, ...args] = filter.split(':');
        const filterFn = this.filters[filterName.trim()] || this.directives[filterName.trim()];
        
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
    return template.replace(this.thisRegex, (match, path) => {
      if (!path) {
        const value = context.this;
        return value !== undefined && value !== null ? String(value) : (this.options.ignoreUndefined ? '' : match);
      }

      const fullPath = `this${path}`;
      const value = this.getNestedValue(fullPath, context);
      return value !== undefined && value !== null ? String(value) : (this.options.ignoreUndefined ? '' : match);
    });
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    condition = condition.trim();

    // 处理否定
    if (condition.startsWith('!')) {
      return !this.evaluateCondition(condition.slice(1).trim(), context);
    }

    // 处理逻辑与
    if (condition.includes('&&')) {
      const parts = condition.split('&&');
      return parts.every(part => this.evaluateCondition(part.trim(), context));
    }

    // 处理逻辑或
    if (condition.includes('||')) {
      const parts = condition.split('||');
      return parts.some(part => this.evaluateCondition(part.trim(), context));
    }

    // 处理比较运算符
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

    // 简单变量检查
    const value = this.getNestedValue(condition, context);
    return Boolean(value);
  }

  private evaluateExpression(expr: string, context: TemplateContext): any {
    expr = expr.trim();

    // 字符串字面量
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // 数字字面量
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return Number(expr);
    }

    // 布尔字面量
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    // 变量引用
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
 * 快速渲染模板
 */
export function parse(template: string, context: TemplateContext = {}): string {
  return TemplateParser.render(template, context);
}

/**
 * 创建带自定义选项的模板引擎
 */
export function createParser(options: TemplateOptions = {}): TemplateParser {
  return new TemplateParser(options);
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
};

// ============== 导出默认 ==============

export default TemplateParser;

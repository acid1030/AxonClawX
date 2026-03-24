/**
 * Template Lite - 轻量级字符串模板引擎
 * 
 * 功能:
 * 1. 模板变量替换 ({{ variable }})
 * 2. 条件渲染 ({{#if condition}}...{{/if}})
 * 3. 循环渲染 ({{#each array}}...{{/each}})
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface TemplateLiteOptions {
  /** 变量开始标记，默认 "{{" */
  delimiterStart?: string;
  /** 变量结束标记，默认 "}}" */
  delimiterEnd?: string;
  /** 是否忽略未定义变量，默认 true (替换为空字符串) */
  ignoreUndefined?: boolean;
}

export interface TemplateContext {
  [key: string]: any;
}

// ============== 正则表达式 ==============

const DEFAULT_DELIMITER_START = '{{';
const DEFAULT_DELIMITER_END = '}}';

/**
 * 匹配变量：{{ variable }} 或 {{ nested.path }}
 */
const createVariableRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}\\s*([^{}#\\/]+?)\\s*${escapedEnd}`, 'g');
};

/**
 * 匹配条件块：{{#if condition}}...{{/if}}
 */
const createIfBlockRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `${escapedStart}#if\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/if${escapedEnd}`,
    'g'
  );
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
 * 匹配 this 引用：{{this}} 或 {{this.property}}
 */
const createThisRegex = (start: string, end: string) => {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escapedStart}\\s*this(\\.[\\w.]+)?\\s*${escapedEnd}`, 'g');
};

// ============== TemplateLite 类 ==============

/**
 * 轻量级字符串模板引擎
 * 
 * @example
 * ```typescript
 * // 基本变量替换
 * const template = 'Hello, {{name}}!';
 * const result = TemplateLite.render(template, { name: 'Alice' });
 * // 输出："Hello, Alice!"
 * 
 * // 条件渲染
 * const template = '{{#if isAdmin}}Admin Panel{{/if}}';
 * const result = TemplateLite.render(template, { isAdmin: true });
 * // 输出："Admin Panel"
 * 
 * // 循环渲染
 * const template = '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>';
 * const result = TemplateLite.render(template, { items: ['A', 'B', 'C'] });
 * // 输出："<ul><li>A</li><li>B</li><li>C</li></ul>"
 * ```
 */
export class TemplateLite {
  private options: Required<TemplateLiteOptions>;
  private variableRegex: RegExp;
  private ifBlockRegex: RegExp;
  private eachBlockRegex: RegExp;
  private thisRegex: RegExp;

  constructor(options: TemplateLiteOptions = {}) {
    this.options = {
      delimiterStart: options.delimiterStart ?? DEFAULT_DELIMITER_START,
      delimiterEnd: options.delimiterEnd ?? DEFAULT_DELIMITER_END,
      ignoreUndefined: options.ignoreUndefined ?? true,
    };

    this.variableRegex = createVariableRegex(this.options.delimiterStart, this.options.delimiterEnd);
    this.ifBlockRegex = createIfBlockRegex(this.options.delimiterStart, this.options.delimiterEnd);
    this.eachBlockRegex = createEachBlockRegex(this.options.delimiterStart, this.options.delimiterEnd);
    this.thisRegex = createThisRegex(this.options.delimiterStart, this.options.delimiterEnd);
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
   * const template = new TemplateLite();
   * const result = template.render('Hello, {{name}}!', { name: 'Bob' });
   * ```
   */
  render(template: string, context: TemplateContext = {}): string {
    let result = template;

    // 1. 处理条件块 ({{#if}}...{{/if}})
    result = this.processIfBlocks(result, context);

    // 2. 处理循环块 ({{#each}}...{{/each}})
    result = this.processEachBlocks(result, context);

    // 3. 处理变量替换 ({{variable}})
    result = this.processVariables(result, context);

    return result;
  }

  /**
   * 静态方法：快速渲染 (使用默认配置)
   * 
   * @param template - 模板字符串
   * @param context - 上下文对象
   * @returns 渲染后的字符串
   * 
   * @example
   * ```typescript
   * const result = TemplateLite.render('Hello, {{name}}!', { name: 'Alice' });
   * ```
   */
  static render(template: string, context: TemplateContext = {}): string {
    const engine = new TemplateLite();
    return engine.render(template, context);
  }

  /**
   * 处理条件块
   */
  private processIfBlocks(template: string, context: TemplateContext): string {
    return template.replace(this.ifBlockRegex, (match, condition, content) => {
      const conditionValue = this.evaluateCondition(condition.trim(), context);
      return conditionValue ? content : '';
    });
  }

  /**
   * 处理循环块
   */
  private processEachBlocks(template: string, context: TemplateContext): string {
    return template.replace(this.eachBlockRegex, (match, arrayPath, content) => {
      const array = this.getNestedValue(arrayPath.trim(), context);
      
      if (!Array.isArray(array)) {
        return this.options.ignoreUndefined ? '' : match;
      }

      return array.map((item, index) => {
        // 创建循环上下文
        const loopContext = {
          ...context,
          this: item,
          index,
          first: index === 0,
          last: index === array.length - 1,
        };

        // 递归渲染内容 (处理嵌套的变量和条件)
        let rendered = content;
        rendered = this.processIfBlocks(rendered, loopContext);
        rendered = this.processEachBlocks(rendered, loopContext);
        rendered = this.processVariables(rendered, loopContext);
        rendered = this.processThisReferences(rendered, loopContext);

        return rendered;
      }).join('');
    });
  }

  /**
   * 处理变量替换
   */
  private processVariables(template: string, context: TemplateContext): string {
    return template.replace(this.variableRegex, (match, path) => {
      // 跳过 this 引用 (由 processThisReferences 处理)
      if (path.trim() === 'this' || path.trim().startsWith('this.')) {
        return match;
      }

      const value = this.getNestedValue(path.trim(), context);
      
      if (value === undefined || value === null) {
        return this.options.ignoreUndefined ? '' : match;
      }

      return String(value);
    });
  }

  /**
   * 处理 this 引用
   */
  private processThisReferences(template: string, context: TemplateContext): string {
    return template.replace(this.thisRegex, (match, path) => {
      if (!path) {
        // {{this}}
        const value = context.this;
        return value !== undefined && value !== null ? String(value) : (this.options.ignoreUndefined ? '' : match);
      }

      // {{this.property}}
      const fullPath = `this${path}`;
      const value = this.getNestedValue(fullPath, context);
      return value !== undefined && value !== null ? String(value) : (this.options.ignoreUndefined ? '' : match);
    });
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    // 支持的条件语法:
    // - 变量名：{{#if isAdmin}}
    // - 否定：{{#if !isAdmin}}
    // - 比较：{{#if count > 0}}, {{#if name == "Alice"}}
    // - 逻辑运算：{{#if isAdmin && isActive}}

    condition = condition.trim();

    // 处理否定
    if (condition.startsWith('!')) {
      return !this.evaluateCondition(condition.slice(1).trim(), context);
    }

    // 处理逻辑与 (&&)
    if (condition.includes('&&')) {
      const parts = condition.split('&&');
      return parts.every(part => this.evaluateCondition(part.trim(), context));
    }

    // 处理逻辑或 (||)
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

  /**
   * 评估表达式 (用于条件比较)
   */
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

  /**
   * 获取嵌套值 (支持点号路径：user.profile.name)
   */
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
 * 
 * @param template - 模板字符串
 * @param context - 上下文对象
 * @returns 渲染后的字符串
 * 
 * @example
 * ```typescript
 * const result = template('Hello, {{name}}!', { name: 'Alice' });
 * ```
 */
export function template(template: string, context: TemplateContext = {}): string {
  return TemplateLite.render(template, context);
}

/**
 * 创建带自定义选项的模板引擎
 * 
 * @param options - 模板选项
 * @returns TemplateLite 实例
 * 
 * @example
 * ```typescript
 * const engine = createTemplate({
 *   delimiterStart: '<%',
 *   delimiterEnd: '%>',
 * });
 * const result = engine.render('<% name %>', { name: 'Bob' });
 * ```
 */
export function createTemplate(options: TemplateLiteOptions = {}): TemplateLite {
  return new TemplateLite(options);
}

// ============== 预定义模板片段 ==============

/**
 * 常用模板片段
 */
export const snippets = {
  /** 问候语 */
  greeting: 'Hello, {{name}}!{{#if title}} ({{title}}){{/if}}',
  
  /** 列表渲染 */
  list: '<ul>{{#each items}}<li>{{this}}</li>{{/each}}</ul>',
  
  /** 条件消息 */
  conditionalMessage: '{{#if success}}Operation completed successfully!{{/if}}{{#if !success}}Operation failed.{{/if}}',
  
  /** 表格行 */
  tableRow: '<tr>{{#each columns}}<td>{{this}}</td>{{/each}}</tr>',
  
  /** 用户卡片 */
  userCard: `
<div class="user-card">
  <h3>{{user.name}}</h3>
  <p>Email: {{user.email}}</p>
  {{#if user.isAdmin}}<span class="badge">Admin</span>{{/if}}
</div>
  `.trim(),
};

// ============== 导出默认 ==============

export default TemplateLite;

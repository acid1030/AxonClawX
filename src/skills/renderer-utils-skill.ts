/**
 * Renderer Utils - HTML 模板渲染引擎
 * 
 * 功能:
 * 1. 模板编译 - 预编译模板为渲染函数
 * 2. 变量插值 - 支持嵌套路径和表达式
 * 3. 部分模板 - 支持模板片段复用和嵌套
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface RendererOptions {
  /** 变量开始标记，默认 "{{" */
  delimiterStart?: string;
  /** 变量结束标记，默认 "}}" */
  delimiterEnd?: string;
  /** 是否忽略未定义变量，默认 true */
  ignoreUndefined?: boolean;
  /** 是否转义 HTML，默认 false */
  escapeHtml?: boolean;
  /** 部分模板注册表 */
  partials?: Record<string, string>;
}

export interface RenderContext {
  [key: string]: any;
}

export interface CompiledTemplate {
  /** 渲染函数 */
  render: (context: RenderContext) => string;
  /** 模板来源 */
  source: string;
  /** 编译时间 */
  compiledAt: Date;
}

export interface PartialRegistry {
  register(name: string, template: string): void;
  unregister(name: string): void;
  get(name: string): string | undefined;
  clear(): void;
}

// ============== 工具函数 ==============

/**
 * HTML 转义
 */
function escapeHtmlContent(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return str.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
}

/**
 * 获取嵌套值 (支持点号路径：user.profile.name)
 */
function getNestedValue(path: string, context: RenderContext): any {
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

/**
 * 设置嵌套值
 */
function setNestedValue(path: string, value: any, context: RenderContext): void {
  const parts = path.split('.');
  const last = parts.pop()!;
  
  let obj: any = context;
  for (const part of parts) {
    if (!(part in obj)) {
      obj[part] = {};
    }
    obj = obj[part];
  }
  obj[last] = value;
}

// ============== 正则表达式工厂 ==============

function createRegexes(delimiterStart: string, delimiterEnd: string) {
  const escapedStart = delimiterStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedEnd = delimiterEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    // 变量：{{ variable }}
    variable: new RegExp(`${escapedStart}\\s*([^{}#\\/>&]+?)\\s*${escapedEnd}`, 'g'),
    
    // 转义变量：{{> variable }}
    escapedVariable: new RegExp(`${escapedStart}>\\s*([^{}#\\/]+?)\\s*${escapedEnd}`, 'g'),
    
    // 条件块：{{#if condition}}...{{/if}}
    ifBlock: new RegExp(
      `${escapedStart}#if\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/if${escapedEnd}`,
      'g'
    ),
    
    // 除非块：{{#unless condition}}...{{/unless}}
    unlessBlock: new RegExp(
      `${escapedStart}#unless\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/unless${escapedEnd}`,
      'g'
    ),
    
    // 循环块：{{#each array}}...{{/each}}
    eachBlock: new RegExp(
      `${escapedStart}#each\\s+([^}]+?)\\s*${escapedEnd}([\\s\\S]*?)${escapedStart}\\/each${escapedEnd}`,
      'g'
    ),
    
    // 部分模板：{{> partialName }}
    partial: new RegExp(
      `${escapedStart}>\\s*([\\w.-]+)\\s*${escapedEnd}`,
      'g'
    ),
    
    // this 引用：{{this}} 或 {{this.property}}
    thisRef: new RegExp(`${escapedStart}\\s*this(\\.[\\w.]+)?\\s*${escapedEnd}`, 'g'),
    
    // 注释：{{! comment }} 或 {{!-- comment --}}
    comment: new RegExp(`${escapedStart}(!|--)[\\s\\S]*?(\\1)${escapedEnd}`, 'g'),
  };
}

// ============== 部分模板注册表 ==============

/**
 * 全局部分模板注册表
 */
export class PartialRegistryImpl implements PartialRegistry {
  private registry: Map<string, string> = new Map();

  register(name: string, template: string): void {
    this.registry.set(name, template);
  }

  unregister(name: string): void {
    this.registry.delete(name);
  }

  get(name: string): string | undefined {
    return this.registry.get(name);
  }

  clear(): void {
    this.registry.clear();
  }

  list(): string[] {
    return Array.from(this.registry.keys());
  }
}

// 全局注册表实例
const globalPartials = new PartialRegistryImpl();

// ============== Renderer 类 ==============

/**
 * HTML 模板渲染引擎
 * 
 * 支持:
 * - 变量插值：{{ variable }}
 * - 转义变量：{{> variable }} (自动 HTML 转义)
 * - 条件渲染：{{#if condition}}...{{/if}}
 * - 否定条件：{{#unless condition}}...{{/unless}}
 * - 循环渲染：{{#each array}}...{{/each}}
 * - 部分模板：{{> partialName }}
 * - 注释：{{! comment }}
 * 
 * @example
 * ```typescript
 * // 基本使用
 * const renderer = new Renderer();
 * const result = renderer.render('Hello, {{name}}!', { name: 'Alice' });
 * 
 * // 使用部分模板
 * renderer.registerPartial('header', '<header>{{title}}</header>');
 * const result = renderer.render('{{> header}}', { title: 'My App' });
 * 
 * // 预编译模板
 * const compiled = renderer.compile('Hello, {{name}}!');
 * const result1 = compiled.render({ name: 'Bob' });
 * const result2 = compiled.render({ name: 'Carol' });
 * ```
 */
export class Renderer {
  private options: Required<RendererOptions>;
  private regexes: ReturnType<typeof createRegexes>;
  private partials: Map<string, string> = new Map();

  constructor(options: RendererOptions = {}) {
    this.options = {
      delimiterStart: options.delimiterStart ?? '{{',
      delimiterEnd: options.delimiterEnd ?? '}}',
      ignoreUndefined: options.ignoreUndefined ?? true,
      escapeHtml: options.escapeHtml ?? false,
      partials: options.partials ?? {},
    };

    this.regexes = createRegexes(this.options.delimiterStart, this.options.delimiterEnd);

    // 注册传入的部分模板
    if (this.options.partials) {
      Object.entries(this.options.partials).forEach(([name, template]) => {
        this.registerPartial(name, template);
      });
    }
  }

  /**
   * 注册部分模板
   */
  registerPartial(name: string, template: string): void {
    this.partials.set(name, template);
  }

  /**
   * 注销部分模板
   */
  unregisterPartial(name: string): void {
    this.partials.delete(name);
  }

  /**
   * 获取部分模板
   */
  getPartial(name: string): string | undefined {
    return this.partials.get(name) || globalPartials.get(name);
  }

  /**
   * 编译模板为可重用的渲染函数
   * 
   * @param template - 模板字符串
   * @returns 编译后的模板对象
   * 
   * @example
   * ```typescript
   * const compiled = renderer.compile('<div>{{name}}</div>');
   * const html1 = compiled.render({ name: 'Alice' });
   * const html2 = compiled.render({ name: 'Bob' });
   * ```
   */
  compile(template: string): CompiledTemplate {
    const compiledAt = new Date();

    const render = (context: RenderContext = {}): string => {
      return this.render(template, context);
    };

    return {
      render,
      source: template,
      compiledAt,
    };
  }

  /**
   * 渲染模板
   * 
   * @param template - 模板字符串
   * @param context - 上下文对象
   * @returns 渲染后的 HTML 字符串
   * 
   * @example
   * ```typescript
   * const html = renderer.render(
   *   '<h1>{{title}}</h1>{{#each items}}<p>{{this}}</p>{{/each}}',
   *   { title: 'My List', items: ['A', 'B', 'C'] }
   * );
   * ```
   */
  render(template: string, context: RenderContext = {}): string {
    let result = template;

    // 1. 移除注释
    result = this.removeComments(result);

    // 2. 处理部分模板
    result = this.processPartials(result, context);

    // 3. 处理条件块
    result = this.processIfBlocks(result, context);
    result = this.processUnlessBlocks(result, context);

    // 4. 处理循环块
    result = this.processEachBlocks(result, context);

    // 5. 处理 this 引用
    result = this.processThisReferences(result, context);

    // 6. 处理转义变量
    result = this.processEscapedVariables(result, context);

    // 7. 处理普通变量
    result = this.processVariables(result, context);

    return result;
  }

  /**
   * 静态方法：快速渲染 (使用默认配置)
   */
  static render(template: string, context: RenderContext = {}): string {
    const renderer = new Renderer();
    return renderer.render(template, context);
  }

  /**
   * 静态方法：快速编译
   */
  static compile(template: string): CompiledTemplate {
    const renderer = new Renderer();
    return renderer.compile(template);
  }

  /**
   * 移除注释
   */
  private removeComments(template: string): string {
    return template.replace(this.regexes.comment, '');
  }

  /**
   * 处理部分模板
   */
  private processPartials(template: string, context: RenderContext): string {
    return template.replace(this.regexes.partial, (match, partialName) => {
      const partialTemplate = this.getPartial(partialName.trim());
      
      if (!partialTemplate) {
        return this.options.ignoreUndefined ? '' : match;
      }

      // 递归渲染部分模板
      return this.render(partialTemplate, context);
    });
  }

  /**
   * 处理条件块
   */
  private processIfBlocks(template: string, context: RenderContext): string {
    return template.replace(this.regexes.ifBlock, (match, condition, content) => {
      const conditionValue = this.evaluateCondition(condition.trim(), context);
      return conditionValue ? content : '';
    });
  }

  /**
   * 处理除非块
   */
  private processUnlessBlocks(template: string, context: RenderContext): string {
    return template.replace(this.regexes.unlessBlock, (match, condition, content) => {
      const conditionValue = this.evaluateCondition(condition.trim(), context);
      return !conditionValue ? content : '';
    });
  }

  /**
   * 处理循环块
   */
  private processEachBlocks(template: string, context: RenderContext): string {
    return template.replace(this.regexes.eachBlock, (match, arrayPath, content) => {
      const array = getNestedValue(arrayPath.trim(), context);
      
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

        // 递归渲染内容
        let rendered = content;
        rendered = this.processPartials(rendered, loopContext);
        rendered = this.processIfBlocks(rendered, loopContext);
        rendered = this.processUnlessBlocks(rendered, loopContext);
        rendered = this.processEachBlocks(rendered, loopContext);
        rendered = this.processThisReferences(rendered, loopContext);
        rendered = this.processEscapedVariables(rendered, loopContext);
        rendered = this.processVariables(rendered, loopContext);

        return rendered;
      }).join('');
    });
  }

  /**
   * 处理变量替换
   */
  private processVariables(template: string, context: RenderContext): string {
    return template.replace(this.regexes.variable, (match, path) => {
      // 跳过 this 引用 (由 processThisReferences 处理)
      if (path.trim() === 'this' || path.trim().startsWith('this.')) {
        return match;
      }

      // 跳过部分模板语法
      if (path.trim().startsWith('>')) {
        return match;
      }

      const value = getNestedValue(path.trim(), context);
      
      if (value === undefined || value === null) {
        return this.options.ignoreUndefined ? '' : match;
      }

      const strValue = String(value);
      return this.options.escapeHtml ? escapeHtmlContent(strValue) : strValue;
    });
  }

  /**
   * 处理转义变量 ({{> var }} 或配置了 escapeHtml)
   */
  private processEscapedVariables(template: string, context: RenderContext): string {
    return template.replace(this.regexes.escapedVariable, (match, path) => {
      const value = getNestedValue(path.trim(), context);
      
      if (value === undefined || value === null) {
        return this.options.ignoreUndefined ? '' : match;
      }

      return escapeHtmlContent(String(value));
    });
  }

  /**
   * 处理 this 引用
   */
  private processThisReferences(template: string, context: RenderContext): string {
    return template.replace(this.regexes.thisRef, (match, path) => {
      if (!path) {
        // {{this}}
        const value = context.this;
        return value !== undefined && value !== null 
          ? (this.options.escapeHtml ? escapeHtmlContent(String(value)) : String(value))
          : (this.options.ignoreUndefined ? '' : match);
      }

      // {{this.property}}
      const fullPath = `this${path}`;
      const value = getNestedValue(fullPath, context);
      return value !== undefined && value !== null 
        ? (this.options.escapeHtml ? escapeHtmlContent(String(value)) : String(value))
        : (this.options.ignoreUndefined ? '' : match);
    });
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, context: RenderContext): boolean {
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
    const operators = ['>=', '<=', '!=', '!==', '==', '===', '>', '<'];
    for (const op of operators) {
      const parts = condition.split(op);
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0].trim(), context);
        const right = this.evaluateExpression(parts[1].trim(), context);
        
        switch (op) {
          case '>=': return left >= right;
          case '<=': return left <= right;
          case '!=': return left != right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '===': return left === right;
          case '>': return left > right;
          case '<': return left < right;
        }
      }
    }

    // 简单变量检查
    const value = getNestedValue(condition, context);
    return Boolean(value);
  }

  /**
   * 评估表达式
   */
  private evaluateExpression(expr: string, context: RenderContext): any {
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
    return getNestedValue(expr, context);
  }
}

// ============== 快捷函数 ==============

/**
 * 快速渲染模板
 */
export function render(template: string, context: RenderContext = {}): string {
  return Renderer.render(template, context);
}

/**
 * 编译模板
 */
export function compile(template: string): CompiledTemplate {
  return Renderer.compile(template);
}

/**
 * 创建带自定义选项的渲染器
 */
export function createRenderer(options: RendererOptions = {}): Renderer {
  return new Renderer(options);
}

/**
 * 注册全局部分模板
 */
export function registerPartial(name: string, template: string): void {
  globalPartials.register(name, template);
}

/**
 * 获取全局部分模板
 */
export function getPartial(name: string): string | undefined {
  return globalPartials.get(name);
}

// ============== 预定义模板片段 ==============

export const htmlSnippets = {
  /** 基础 HTML 骨架 */
  html5: `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  {{> head }}
</head>
<body>
  {{> body }}
</body>
</html>`,

  /** 导航栏 */
  navbar: `<nav class="navbar">
  <div class="container">
    <a href="/" class="brand">{{brand}}</a>
    <ul class="nav-links">
      {{#each links}}
      <li><a href="{{this.href}}">{{this.label}}</a></li>
      {{/each}}
    </ul>
  </div>
</nav>`,

  /** 卡片组件 */
  card: `<div class="card">
  {{#if image}}<img src="{{image}}" alt="{{title}}" class="card-image">{{/if}}
  <div class="card-body">
    <h3 class="card-title">{{title}}</h3>
    <p class="card-text">{{content}}</p>
    {{#if action}}<a href="{{action.href}}" class="btn">{{action.label}}</a>{{/if}}
  </div>
</div>`,

  /** 表格 */
  table: `<table class="table">
  <thead>
    <tr>
      {{#each columns}}
      <th>{{this}}</th>
      {{/each}}
    </tr>
  </thead>
  <tbody>
    {{#each rows}}
    <tr>
      {{#each this}}
      <td>{{this}}</td>
      {{/each}}
    </tr>
    {{/each}}
  </tbody>
</table>`,

  /** 分页 */
  pagination: `<ul class="pagination">
  {{#if showPrev}}<li><a href="?page={{prevPage}}">&laquo; Prev</a></li>{{/if}}
  {{#each pages}}
  <li class="{{#if this.active}}active{{/if}}">
    <a href="?page={{this.num}}">{{this.num}}</a>
  </li>
  {{/each}}
  {{#if showNext}}<li><a href="?page={{nextPage}}">Next &raquo;</a></li>{{/if}}
</ul>`,

  /** 警告框 */
  alert: `<div class="alert alert-{{type}}">
  {{#if dismissible}}<button class="close">&times;</button>{{/if}}
  {{message}}
</div>`,

  /** 表单输入 */
  input: `<div class="form-group">
  <label for="{{id}}">{{label}}</label>
  <input type="{{type}}" id="{{id}}" name="{{name}}" {{#if required}}required{{/if}} {{#if value}}value="{{value}}"{{/if}}>
  {{#if error}}<span class="error">{{error}}</span>{{/if}}
</div>`,

  /** 列表组 */
  listGroup: `<ul class="list-group">
  {{#each items}}
  <li class="list-group-item {{#if this.active}}active{{/if}}">
    {{this.content}}
    {{#if this.badge}}<span class="badge">{{this.badge}}</span>{{/if}}
  </li>
  {{/each}}
</ul>`,
};

// ============== 导出默认 ==============

export default Renderer;

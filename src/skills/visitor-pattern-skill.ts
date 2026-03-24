/**
 * 访问者模式工具技能 - ACE (Advanced Constructor Engine)
 * 
 * 提供访问者模式的核心实现:
 * 1. 访问者定义 (Visitor Definition) - 定义访问者接口和具体访问者
 * 2. 元素接受 (Element Accept) - 元素接口和 accept 方法实现
 * 3. 双重分派 (Double Dispatch) - 运行时类型分派机制
 * 
 * @author Axon
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 访问者接口基类
 */
export interface Visitor<TElement, TReturn = void> {
  visit(element: TElement): TReturn;
}

/**
 * 元素接口 - 必须实现 accept 方法
 */
export interface IElement<TVisitor> {
  accept(visitor: TVisitor): void;
}

/**
 * 可访问元素接口 - 带返回值
 */
export interface IElementWithReturn<TVisitor, TReturn> {
  accept(visitor: TVisitor): TReturn;
}

/**
 * 访问者模式配置选项
 */
export interface VisitorPatternOptions {
  debug?: boolean;
  onBeforeVisit?: (element: any, visitor: any) => void;
  onAfterVisit?: (element: any, visitor: any, result: any) => void;
}

// ============================================
// 1. 访问者定义 (Visitor Definition)
// ============================================

/**
 * 创建基础访问者
 */
export function createVisitor<T extends Record<string, Function>>(
  visitMethods: T
): T {
  return visitMethods;
}

/**
 * 抽象访问者基类
 */
export abstract class BaseVisitor<TElement, TReturn = void> {
  protected options: VisitorPatternOptions;

  constructor(options: VisitorPatternOptions = {}) {
    this.options = { debug: false, ...options };
  }

  abstract visit(element: TElement): TReturn;

  protected log(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[Visitor] ${message}`, ...args);
    }
  }
}

/**
 * 组合访问者
 */
export class CompositeVisitor<TElement, TReturn = void> {
  private visitors: Visitor<TElement, TReturn>[] = [];

  add(visitor: Visitor<TElement, TReturn>): this {
    this.visitors.push(visitor);
    return this;
  }

  remove(visitor: Visitor<TElement, TReturn>): this {
    const index = this.visitors.indexOf(visitor);
    if (index > -1) this.visitors.splice(index, 1);
    return this;
  }

  visit(element: TElement): TReturn[] {
    return this.visitors.map(v => v.visit(element));
  }
}

// ============================================
// 2. 元素接受 (Element Accept)
// ============================================

/**
 * 抽象元素基类
 */
export abstract class BaseElement<TVisitor> implements IElement<TVisitor> {
  abstract readonly type: string;
  readonly id: string;

  constructor(id?: string) {
    this.id = id || `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  accept(visitor: TVisitor): void {
    const methodName = `visit${this.type.charAt(0).toUpperCase() + this.type.slice(1)}`;
    const method = (visitor as any)[methodName];
    if (typeof method === 'function') {
      method.call(visitor, this);
    } else {
      throw new Error(`Visitor does not implement ${methodName}`);
    }
  }
}

/**
 * 带返回值的元素基类
 */
export abstract class BaseElementWithReturn<TVisitor, TReturn> 
  implements IElementWithReturn<TVisitor, TReturn> {
  
  abstract readonly type: string;
  readonly id: string;

  constructor(id?: string) {
    this.id = id || `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  accept(visitor: TVisitor): TReturn {
    const methodName = `visit${this.type.charAt(0).toUpperCase() + this.type.slice(1)}`;
    const method = (visitor as any)[methodName];
    if (typeof method === 'function') {
      return method.call(visitor, this);
    }
    throw new Error(`Visitor does not implement ${methodName}`);
  }
}

/**
 * 元素集合
 */
export class ElementCollection<TElement extends IElement<any>> {
  private elements: TElement[] = [];

  add(element: TElement): this {
    this.elements.push(element);
    return this;
  }

  addAll(elements: TElement[]): this {
    this.elements.push(...elements);
    return this;
  }

  acceptAll(visitor: Parameters<TElement['accept']>[0]): void {
    this.elements.forEach(el => el.accept(visitor));
  }

  getElements(): TElement[] {
    return [...this.elements];
  }

  filterByType(type: string): TElement[] {
    return this.elements.filter(el => (el as any).type === type);
  }
}

// ============================================
// 3. 双重分派 (Double Dispatch)
// ============================================

/**
 * 双重分派调度器
 */
export class DoubleDispatchScheduler {
  private options: VisitorPatternOptions;

  constructor(options: VisitorPatternOptions = {}) {
    this.options = options;
  }

  dispatch<TElement extends IElement<TVisitor>, TVisitor, TReturn>(
    element: TElement,
    visitor: TVisitor
  ): TReturn {
    const { onBeforeVisit, onAfterVisit, debug } = this.options;

    if (debug) {
      console.log(`[DoubleDispatch] ${element.constructor.name} -> ${visitor.constructor.name}`);
    }

    if (onBeforeVisit) onBeforeVisit(element, visitor);
    const result = element.accept(visitor) as unknown as TReturn;
    if (onAfterVisit) onAfterVisit(element, visitor, result);

    return result;
  }

  dispatchAll<TElement extends IElement<TVisitor>, TVisitor>(
    elements: TElement[],
    visitor: TVisitor
  ): void {
    elements.forEach(el => this.dispatch(el, visitor));
  }
}

/**
 * 访问者注册表
 */
export class VisitorRegistry<TElementMap extends Record<string, any>> {
  private visitors: Map<string, any> = new Map();

  register<K extends keyof TElementMap>(elementType: K, visitor: any): this {
    this.visitors.set(String(elementType), visitor);
    return this;
  }

  get<K extends keyof TElementMap>(elementType: K): any {
    const visitor = this.visitors.get(String(elementType));
    if (!visitor) {
      throw new Error(`No visitor for: ${elementType}`);
    }
    return visitor;
  }

  has(elementType: keyof TElementMap): boolean {
    return this.visitors.has(String(elementType));
  }

  unregister(elementType: keyof TElementMap): this {
    this.visitors.delete(String(elementType));
    return this;
  }

  getAll(): Map<string, any> {
    return new Map(this.visitors);
  }
}

/**
 * 访问者模式构建器
 */
export class VisitorPatternBuilder<TElementMap extends Record<string, any>> {
  private visitors: Map<string, any> = new Map();
  private options: VisitorPatternOptions = {};

  withOptions(options: VisitorPatternOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  registerVisitor<K extends keyof TElementMap>(type: K, visitor: any): this {
    this.visitors.set(String(type), visitor);
    return this;
  }

  build(): { scheduler: DoubleDispatchScheduler; registry: VisitorRegistry<TElementMap> } {
    const scheduler = new DoubleDispatchScheduler(this.options);
    const registry = new VisitorRegistry<TElementMap>();
    this.visitors.forEach((v, t) => registry.register(t as keyof TElementMap, v));
    return { scheduler, registry };
  }
}

// ============================================
// 4. 内置访问者
// ============================================

/**
 * JSON 序列化访问者
 */
export class JsonVisitor<TElement extends { [key: string]: any }> 
  extends BaseVisitor<TElement, string> {
  
  visit(element: TElement): string {
    this.log('JSON serialize', element);
    return JSON.stringify(element, null, 2);
  }
}

/**
 * 克隆访问者
 */
export class CloneVisitor<TElement extends { [key: string]: any }> 
  extends BaseVisitor<TElement, TElement> {
  
  visit(element: TElement): TElement {
    this.log('Clone', element);
    return JSON.parse(JSON.stringify(element)) as TElement;
  }
}

/**
 * 验证访问者
 */
export class ValidationVisitor<TElement extends { [key: string]: any }> 
  extends BaseVisitor<TElement, { valid: boolean; errors: string[] }> {
  
  private rules: Array<(element: TElement) => string | null> = [];

  addRule(rule: (element: TElement) => string | null): this {
    this.rules.push(rule);
    return this;
  }

  visit(element: TElement): { valid: boolean; errors: string[] } {
    this.log('Validate', element);
    const errors: string[] = [];
    for (const rule of this.rules) {
      const error = rule(element);
      if (error) errors.push(error);
    }
    return { valid: errors.length === 0, errors };
  }
}

/**
 * 打印访问者
 */
export class PrintVisitor<TElement extends { [key: string]: any }> 
  extends BaseVisitor<TElement, void> {
  
  private prefix: string;

  constructor(prefix?: string, options?: VisitorPatternOptions) {
    super(options);
    this.prefix = prefix || '';
  }

  visit(element: TElement): void {
    this.log('Print', element);
    console.log(`${this.prefix}Element:`, element);
  }
}

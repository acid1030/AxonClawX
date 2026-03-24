/**
 * Iterator Pattern Skill - KAEL
 * 
 * 功能:
 * 1. 迭代器接口 (Iterator)
 * 2. 聚合接口 (Aggregate)
 * 3. 自定义遍历 (正向/反向/过滤/转换)
 * 
 * 设计模式:
 * - Iterator: 提供统一的集合遍历接口
 * - Aggregate: 定义创建迭代器的接口
 * - ConcreteIterator: 具体迭代器实现
 * - ConcreteAggregate: 具体聚合实现
 */

// ==================== 类型定义 ====================

/**
 * 迭代器接口
 */
export interface Iterator<T> {
  /** 是否有下一个元素 */
  hasNext(): boolean;
  /** 获取下一个元素 */
  next(): T | null;
  /** 重置到起始位置 */
  reset(): void;
  /** 获取当前索引 */
  getIndex(): number;
  /** 获取剩余元素数量 */
  remaining(): number;
}

/**
 * 可反向迭代器接口
 */
export interface ReverseIterator<T> extends Iterator<T> {
  /** 是否有前一个元素 */
  hasPrevious(): boolean;
  /** 获取前一个元素 */
  previous(): T | null;
}

/**
 * 过滤迭代器接口
 */
export interface FilterIterator<T> extends Iterator<T> {
  /** 设置过滤条件 */
  setFilter(predicate: (item: T) => boolean): void;
  /** 清除过滤条件 */
  clearFilter(): void;
}

/**
 * 聚合接口
 */
export interface Aggregate<T> {
  /** 创建迭代器 */
  createIterator(): Iterator<T>;
  /** 创建反向迭代器 */
  createReverseIterator?(): ReverseIterator<T>;
  /** 获取集合大小 */
  size(): number;
  /** 获取指定索引的元素 */
  get(index: number): T | null;
  /** 转换为数组 */
  toArray(): T[];
}

/**
 * 迭代器选项
 */
export interface IteratorOptions {
  /** 是否反向遍历 */
  reverse?: boolean;
  /** 过滤函数 */
  filter?: (item: any) => boolean;
  /** 转换函数 */
  transform?: (item: any) => any;
  /** 起始索引 */
  startIndex?: number;
  /** 结束索引 */
  endIndex?: number;
  /** 步长 */
  step?: number;
}

// ==================== 具体迭代器实现 ====================

/**
 * 数组迭代器 - 基础实现
 */
export class ArrayIterator<T> implements Iterator<T> {
  private collection: T[];
  private position: number = 0;

  constructor(collection: T[]) {
    this.collection = collection;
  }

  hasNext(): boolean {
    return this.position < this.collection.length;
  }

  next(): T | null {
    if (!this.hasNext()) {
      return null;
    }
    return this.collection[this.position++];
  }

  reset(): void {
    this.position = 0;
  }

  getIndex(): number {
    return this.position;
  }

  remaining(): number {
    return this.collection.length - this.position;
  }
}

/**
 * 反向数组迭代器
 */
export class ReverseArrayIterator<T> implements ReverseIterator<T> {
  private collection: T[];
  private position: number;

  constructor(collection: T[]) {
    this.collection = collection;
    this.position = collection.length - 1;
  }

  hasNext(): boolean {
    return this.position >= 0;
  }

  next(): T | null {
    if (!this.hasNext()) {
      return null;
    }
    return this.collection[this.position--];
  }

  hasPrevious(): boolean {
    return this.position < this.collection.length - 1;
  }

  previous(): T | null {
    if (!this.hasPrevious()) {
      return null;
    }
    return this.collection[++this.position];
  }

  reset(): void {
    this.position = this.collection.length - 1;
  }

  getIndex(): number {
    return this.position;
  }

  remaining(): number {
    return this.position + 1;
  }
}

/**
 * 过滤迭代器 - 支持条件过滤
 */
export class FilterArrayIterator<T> implements FilterIterator<T> {
  private collection: T[];
  private position: number = 0;
  private filterPredicate: ((item: T) => boolean) | null = null;

  constructor(collection: T[], filter?: (item: T) => boolean) {
    this.collection = collection;
    this.filterPredicate = filter || null;
  }

  setFilter(predicate: (item: T) => boolean): void {
    this.filterPredicate = predicate;
    this.reset();
  }

  clearFilter(): void {
    this.filterPredicate = null;
    this.reset();
  }

  hasNext(): boolean {
    const originalPosition = this.position;
    while (this.position < this.collection.length) {
      if (!this.filterPredicate || this.filterPredicate(this.collection[this.position])) {
        return true;
      }
      this.position++;
    }
    return false;
  }

  next(): T | null {
    while (this.position < this.collection.length) {
      const item = this.collection[this.position++];
      if (!this.filterPredicate || this.filterPredicate(item)) {
        return item;
      }
    }
    return null;
  }

  reset(): void {
    this.position = 0;
  }

  getIndex(): number {
    return this.position;
  }

  remaining(): number {
    let count = 0;
    const tempPos = this.position;
    for (let i = tempPos; i < this.collection.length; i++) {
      if (!this.filterPredicate || this.filterPredicate(this.collection[i])) {
        count++;
      }
    }
    return count;
  }
}

/**
 * 转换迭代器 - 支持数据转换
 */
export class TransformIterator<T, R> implements Iterator<R> {
  private baseIterator: Iterator<T>;
  private transformFn: (item: T) => R;

  constructor(baseIterator: Iterator<T>, transformFn: (item: T) => R) {
    this.baseIterator = baseIterator;
    this.transformFn = transformFn;
  }

  hasNext(): boolean {
    return this.baseIterator.hasNext();
  }

  next(): R | null {
    const item = this.baseIterator.next();
    if (item === null) {
      return null;
    }
    return this.transformFn(item);
  }

  reset(): void {
    this.baseIterator.reset();
  }

  getIndex(): number {
    return this.baseIterator.getIndex();
  }

  remaining(): number {
    return this.baseIterator.remaining();
  }
}

// ==================== 具体聚合实现 ====================

/**
 * 数组聚合 - 基础实现
 */
export class ArrayAggregate<T> implements Aggregate<T> {
  private collection: T[];

  constructor(collection: T[] = []) {
    this.collection = [...collection];
  }

  createIterator(): Iterator<T> {
    return new ArrayIterator(this.collection);
  }

  createReverseIterator?(): ReverseIterator<T> {
    return new ReverseArrayIterator(this.collection);
  }

  size(): number {
    return this.collection.length;
  }

  get(index: number): T | null {
    if (index < 0 || index >= this.collection.length) {
      return null;
    }
    return this.collection[index];
  }

  toArray(): T[] {
    return [...this.collection];
  }

  add(item: T): void {
    this.collection.push(item);
  }

  remove(index: number): boolean {
    if (index < 0 || index >= this.collection.length) {
      return false;
    }
    this.collection.splice(index, 1);
    return true;
  }

  clear(): void {
    this.collection = [];
  }
}

/**
 * 链表节点
 */
export class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

/**
 * 链表聚合
 */
export class LinkedListAggregate<T> implements Aggregate<T> {
  private head: ListNode<T> | null = null;
  private sizeValue: number = 0;

  add(value: T): void {
    const newNode = new ListNode(value);
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.sizeValue++;
  }

  createIterator(): Iterator<T> {
    return new LinkedListIterator(this.head);
  }

  size(): number {
    return this.sizeValue;
  }

  get(index: number): T | null {
    if (index < 0 || index >= this.sizeValue) {
      return null;
    }
    let current = this.head;
    for (let i = 0; i < index && current; i++) {
      current = current.next;
    }
    return current ? current.value : null;
  }

  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }
}

/**
 * 链表迭代器
 */
export class LinkedListIterator<T> implements Iterator<T> {
  private currentNode: ListNode<T> | null;
  private index: number = 0;

  constructor(head: ListNode<T> | null) {
    this.currentNode = head;
  }

  hasNext(): boolean {
    return this.currentNode !== null;
  }

  next(): T | null {
    if (!this.currentNode) {
      return null;
    }
    const value = this.currentNode.value;
    this.currentNode = this.currentNode.next;
    this.index++;
    return value;
  }

  reset(): void {
    // 链表无法重置，除非保存头节点引用
    this.index = 0;
  }

  getIndex(): number {
    return this.index;
  }

  remaining(): number {
    let count = 0;
    let current = this.currentNode;
    while (current) {
      count++;
      current = current.next;
    }
    return count;
  }
}

// ==================== 迭代器工具类 ====================

/**
 * 迭代器工具类 - 提供高级遍历功能
 */
export class IteratorUtils {
  /**
   * 创建带选项的迭代器
   */
  static createIterator<T>(
    collection: T[],
    options: IteratorOptions = {}
  ): Iterator<any> {
    let iterator: Iterator<T> = new ArrayIterator(collection);

    // 应用反向
    if (options.reverse) {
      iterator = new ReverseArrayIterator(collection);
    }

    // 应用过滤
    if (options.filter) {
      iterator = new FilterArrayIterator(collection, options.filter);
    }

    // 应用转换
    if (options.transform) {
      iterator = new TransformIterator(iterator, options.transform);
    }

    return iterator;
  }

  /**
   * 遍历集合并执行操作
   */
  static forEach<T>(
    aggregate: Aggregate<T>,
    callback: (item: T, index: number) => void
  ): void {
    const iterator = aggregate.createIterator();
    let index = 0;
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item !== null) {
        callback(item, index++);
      }
    }
  }

  /**
   * 映射集合
   */
  static map<T, R>(
    aggregate: Aggregate<T>,
    transformFn: (item: T) => R
  ): R[] {
    const result: R[] = [];
    const iterator = aggregate.createIterator();
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item !== null) {
        result.push(transformFn(item));
      }
    }
    return result;
  }

  /**
   * 过滤集合
   */
  static filter<T>(
    aggregate: Aggregate<T>,
    predicate: (item: T) => boolean
  ): T[] {
    const result: T[] = [];
    const iterator = new FilterArrayIterator(aggregate.toArray(), predicate);
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item !== null) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * 查找第一个匹配项
   */
  static find<T>(
    aggregate: Aggregate<T>,
    predicate: (item: T) => boolean
  ): T | null {
    const iterator = aggregate.createIterator();
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item !== null && predicate(item)) {
        return item;
      }
    }
    return null;
  }

  /**
   * 检查是否所有元素都满足条件
   */
  static every<T>(
    aggregate: Aggregate<T>,
    predicate: (item: T) => boolean
  ): boolean {
    const iterator = aggregate.createIterator();
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item === null || !predicate(item)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查是否有元素满足条件
   */
  static some<T>(
    aggregate: Aggregate<T>,
    predicate: (item: T) => boolean
  ): boolean {
    const iterator = aggregate.createIterator();
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item !== null && predicate(item)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 收集迭代器结果为数组
   */
  static collect<T>(iterator: Iterator<T>): T[] {
    const result: T[] = [];
    while (iterator.hasNext()) {
      const item = iterator.next();
      if (item !== null) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * 限制迭代器返回数量
   */
  static take<T>(iterator: Iterator<T>, count: number): T[] {
    const result: T[] = [];
    let taken = 0;
    while (iterator.hasNext() && taken < count) {
      const item = iterator.next();
      if (item !== null) {
        result.push(item);
        taken++;
      }
    }
    return result;
  }

  /**
   * 跳过指定数量的元素
   */
  static skip<T>(iterator: Iterator<T>, count: number): Iterator<T> {
    let skipped = 0;
    while (iterator.hasNext() && skipped < count) {
      iterator.next();
      skipped++;
    }
    return iterator;
  }
}

// ==================== 主技能类 ====================

export class IteratorPatternSkill {
  private aggregates: Map<string, Aggregate<any>>;

  constructor() {
    this.aggregates = new Map();
  }

  // ==================== 聚合管理 ====================

  /**
   * 创建数组聚合
   */
  createArrayAggregate<T>(name: string, collection: T[]): boolean {
    if (this.aggregates.has(name)) {
      return false;
    }
    this.aggregates.set(name, new ArrayAggregate(collection));
    return true;
  }

  /**
   * 创建链表聚合
   */
  createLinkedListAggregate<T>(name: string): boolean {
    if (this.aggregates.has(name)) {
      return false;
    }
    this.aggregates.set(name, new LinkedListAggregate<T>());
    return true;
  }

  /**
   * 获取聚合
   */
  getAggregate<T>(name: string): Aggregate<T> | null {
    return (this.aggregates.get(name) as Aggregate<T>) || null;
  }

  /**
   * 删除聚合
   */
  deleteAggregate(name: string): boolean {
    return this.aggregates.delete(name);
  }

  /**
   * 列出所有聚合
   */
  listAggregates(): string[] {
    return Array.from(this.aggregates.keys());
  }

  // ==================== 迭代器创建 ====================

  /**
   * 创建基础迭代器
   */
  createIterator<T>(aggregateName: string): Iterator<T> | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return aggregate.createIterator();
  }

  /**
   * 创建反向迭代器
   */
  createReverseIterator<T>(aggregateName: string): ReverseIterator<T> | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate || !aggregate.createReverseIterator) {
      return null;
    }
    return aggregate.createReverseIterator();
  }

  /**
   * 创建过滤迭代器
   */
  createFilterIterator<T>(
    aggregateName: string,
    predicate: (item: T) => boolean
  ): FilterIterator<T> | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return new FilterArrayIterator(aggregate.toArray(), predicate);
  }

  /**
   * 创建自定义迭代器 (带选项)
   */
  createCustomIterator<T>(
    aggregateName: string,
    options: IteratorOptions
  ): Iterator<any> | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return IteratorUtils.createIterator(aggregate.toArray(), options);
  }

  // ==================== 遍历操作 ====================

  /**
   * 遍历聚合并执行操作
   */
  forEach<T>(
    aggregateName: string,
    callback: (item: T, index: number) => void
  ): boolean {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return false;
    }
    IteratorUtils.forEach(aggregate, callback);
    return true;
  }

  /**
   * 映射聚合
   */
  map<T, R>(
    aggregateName: string,
    transformFn: (item: T) => R
  ): R[] | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return IteratorUtils.map(aggregate, transformFn);
  }

  /**
   * 过滤聚合
   */
  filter<T>(
    aggregateName: string,
    predicate: (item: T) => boolean
  ): T[] | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return IteratorUtils.filter(aggregate, predicate);
  }

  /**
   * 查找元素
   */
  find<T>(
    aggregateName: string,
    predicate: (item: T) => boolean
  ): T | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return IteratorUtils.find(aggregate, predicate);
  }

  /**
   * 检查所有元素
   */
  every<T>(
    aggregateName: string,
    predicate: (item: T) => boolean
  ): boolean | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return IteratorUtils.every(aggregate, predicate);
  }

  /**
   * 检查是否有匹配元素
   */
  some<T>(
    aggregateName: string,
    predicate: (item: T) => boolean
  ): boolean | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return IteratorUtils.some(aggregate, predicate);
  }

  /**
   * 获取前 N 个元素
   */
  take<T>(aggregateName: string, count: number): T[] | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    const iterator = aggregate.createIterator();
    return IteratorUtils.take(iterator, count);
  }

  /**
   * 跳过前 N 个元素后获取剩余
   */
  skip<T>(aggregateName: string, count: number): T[] | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    const iterator = aggregate.createIterator();
    IteratorUtils.skip(iterator, count);
    return IteratorUtils.collect(iterator);
  }

  // ==================== 工具方法 ====================

  /**
   * 收集迭代器结果
   */
  collect<T>(iterator: Iterator<T>): T[] {
    return IteratorUtils.collect(iterator);
  }

  /**
   * 获取聚合大小
   */
  size(aggregateName: string): number | null {
    const aggregate = this.getAggregate(aggregateName);
    if (!aggregate) {
      return null;
    }
    return aggregate.size();
  }

  /**
   * 转换为数组
   */
  toArray<T>(aggregateName: string): T[] | null {
    const aggregate = this.getAggregate<T>(aggregateName);
    if (!aggregate) {
      return null;
    }
    return aggregate.toArray();
  }

  /**
   * 清空所有聚合
   */
  clear(): void {
    this.aggregates.clear();
  }
}

// ==================== 导出 ====================

export default IteratorPatternSkill;

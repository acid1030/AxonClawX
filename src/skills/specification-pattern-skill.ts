/**
 * 规约模式技能 - Specification Pattern Skill
 * 
 * 业务规约模式实现，用于复杂业务规则的组合与验证
 * 
 * 功能:
 * 1. 规约定义 - 创建可复用的业务规则规约
 * 2. 规约组合 - 通过 AND/OR/NOT 组合多个规约
 * 3. 规约验证 - 验证对象是否满足规约条件
 * 
 * @author Axon
 * @version 1.0.0
 * @module skills/specification-pattern
 */

// ============== 类型定义 ==============

/**
 * 规约接口
 * 定义业务规则的标准接口
 */
export interface Specification<T> {
  /**
   * 验证对象是否满足规约
   * @param candidate - 待验证的对象
   * @returns 是否满足规约
   */
  isSatisfiedBy(candidate: T): boolean;

  /**
   * 获取规约描述
   * @returns 规约描述字符串
   */
  getDescription(): string;
}

/**
 * 规约类型枚举
 */
export enum SpecificationType {
  /** 简单规约 */
  SIMPLE = 'simple',
  /** AND 组合规约 */
  AND = 'and',
  /** OR 组合规约 */
  OR = 'or',
  /** NOT 规约 */
  NOT = 'not',
}

/**
 * 规约元数据
 */
export interface SpecificationMeta {
  /** 规约 ID */
  id: string;
  /** 规约名称 */
  name: string;
  /** 规约描述 */
  description: string;
  /** 规约类型 */
  type: SpecificationType;
  /** 创建时间 */
  createdAt: number;
  /** 标签 */
  tags?: string[];
}

/**
 * 简单规约配置
 */
export interface SimpleSpecificationConfig<T> {
  /** 规约名称 */
  name: string;
  /** 规约描述 */
  description: string;
  /** 验证函数 */
  predicate: (candidate: T) => boolean;
  /** 标签 */
  tags?: string[];
}

/**
 * 规约验证结果
 */
export interface ValidationReport {
  /** 是否通过验证 */
  passed: boolean;
  /** 规约 ID */
  specificationId: string;
  /** 规约名称 */
  specificationName: string;
  /** 验证详情 */
  details: ValidationDetail[];
  /** 验证时间戳 */
  timestamp: number;
}

/**
 * 验证详情
 */
export interface ValidationDetail {
  /** 规约 ID */
  id: string;
  /** 规约名称 */
  name: string;
  /** 是否通过 */
  passed: boolean;
  /** 失败原因 */
  failureReason?: string;
  /** 子详情 (组合规约) */
  children?: ValidationDetail[];
}

// ============== 简单规约 ==============

/**
 * 简单规约类
 * 
 * 基于单个谓词函数的基础规约实现
 */
export class SimpleSpecification<T> implements Specification<T> {
  private readonly _meta: SpecificationMeta;
  private readonly _predicate: (candidate: T) => boolean;

  /**
   * 创建简单规约
   * @param config - 规约配置
   */
  constructor(config: SimpleSpecificationConfig<T>) {
    this._meta = {
      id: this.generateId(),
      name: config.name,
      description: config.description,
      type: SpecificationType.SIMPLE,
      createdAt: Date.now(),
      tags: config.tags,
    };
    this._predicate = config.predicate;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证对象是否满足规约
   */
  isSatisfiedBy(candidate: T): boolean {
    try {
      return this._predicate(candidate);
    } catch (error) {
      console.error(`[Specification] Validation error in ${this._meta.name}:`, error);
      return false;
    }
  }

  /**
   * 获取规约描述
   */
  getDescription(): string {
    return this._meta.description;
  }

  /**
   * 获取规约元数据
   */
  getMeta(): SpecificationMeta {
    return { ...this._meta };
  }

  /**
   * 获取规约 ID
   */
  getId(): string {
    return this._meta.id;
  }

  /**
   * 获取规约名称
   */
  getName(): string {
    return this._meta.name;
  }
}

// ============== 组合规约 ==============

/**
 * AND 组合规约
 * 
 * 所有子规约都必须满足
 */
export class AndSpecification<T> implements Specification<T> {
  private readonly _left: Specification<T>;
  private readonly _right: Specification<T>;

  constructor(left: Specification<T>, right: Specification<T>) {
    this._left = left;
    this._right = right;
  }

  isSatisfiedBy(candidate: T): boolean {
    return this._left.isSatisfiedBy(candidate) && this._right.isSatisfiedBy(candidate);
  }

  getDescription(): string {
    return `(${this._left.getDescription()}) AND (${this._right.getDescription()})`;
  }

  /**
   * 获取左规约
   */
  getLeft(): Specification<T> {
    return this._left;
  }

  /**
   * 获取右规约
   */
  getRight(): Specification<T> {
    return this._right;
  }
}

/**
 * OR 组合规约
 * 
 * 至少一个子规约满足即可
 */
export class OrSpecification<T> implements Specification<T> {
  private readonly _left: Specification<T>;
  private readonly _right: Specification<T>;

  constructor(left: Specification<T>, right: Specification<T>) {
    this._left = left;
    this._right = right;
  }

  isSatisfiedBy(candidate: T): boolean {
    return this._left.isSatisfiedBy(candidate) || this._right.isSatisfiedBy(candidate);
  }

  getDescription(): string {
    return `(${this._left.getDescription()}) OR (${this._right.getDescription()})`;
  }

  /**
   * 获取左规约
   */
  getLeft(): Specification<T> {
    return this._left;
  }

  /**
   * 获取右规约
   */
  getRight(): Specification<T> {
    return this._right;
  }
}

/**
 * NOT 规约
 * 
 * 对原规约取反
 */
export class NotSpecification<T> implements Specification<T> {
  private readonly _original: Specification<T>;

  constructor(original: Specification<T>) {
    this._original = original;
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this._original.isSatisfiedBy(candidate);
  }

  getDescription(): string {
    return `NOT (${this._original.getDescription()})`;
  }

  /**
   * 获取原始规约
   */
  getOriginal(): Specification<T> {
    return this._original;
  }
}

// ============== 规约构建器 ==============

/**
 * 规约构建器
 * 
 * 提供流式 API 创建和组合规约
 */
export class SpecificationBuilder<T> {
  private specification?: Specification<T>;

  /**
   * 创建简单规约
   */
  create(name: string, description: string, predicate: (candidate: T) => boolean): this {
    this.specification = new SimpleSpecification({
      name,
      description,
      predicate,
    });
    return this;
  }

  /**
   * AND 组合
   */
  and(other: Specification<T>): this {
    if (!this.specification) {
      throw new Error('必须先创建基础规约');
    }
    this.specification = new AndSpecification(this.specification, other);
    return this;
  }

  /**
   * OR 组合
   */
  or(other: Specification<T>): this {
    if (!this.specification) {
      throw new Error('必须先创建基础规约');
    }
    this.specification = new OrSpecification(this.specification, other);
    return this;
  }

  /**
   * NOT 取反
   */
  not(): this {
    if (!this.specification) {
      throw new Error('必须先创建基础规约');
    }
    this.specification = new NotSpecification(this.specification);
    return this;
  }

  /**
   * 构建并返回规约
   */
  build(): Specification<T> {
    if (!this.specification) {
      throw new Error('未创建任何规约');
    }
    return this.specification;
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.specification = undefined;
    return this;
  }
}

// ============== 规约验证器 ==============

/**
 * 规约验证器
 * 
 * 提供详细的验证报告和调试信息
 */
export class SpecificationValidator<T> {
  /**
   * 验证对象并生成详细报告
   */
  static validate<T>(
    specification: Specification<T>,
    candidate: T
  ): ValidationReport {
    const details: ValidationDetail[] = [];
    const passed = this.validateRecursive(specification, candidate, details);

    return {
      passed,
      specificationId: this.getSpecId(specification),
      specificationName: this.getSpecName(specification),
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * 递归验证
   */
  private static validateRecursive<T>(
    spec: Specification<T>,
    candidate: T,
    details: ValidationDetail[]
  ): boolean {
    const passed = spec.isSatisfiedBy(candidate);
    
    const detail: ValidationDetail = {
      id: this.getSpecId(spec),
      name: this.getSpecName(spec),
      passed,
      failureReason: passed ? undefined : `不满足规约：${spec.getDescription()}`,
    };

    // 处理组合规约
    if (spec instanceof AndSpecification) {
      detail.children = [];
      const leftPassed = this.validateRecursive(spec.getLeft(), candidate, detail.children!);
      const rightPassed = this.validateRecursive(spec.getRight(), candidate, detail.children!);
      detail.passed = leftPassed && rightPassed;
      if (!detail.passed) {
        detail.failureReason = 'AND 规约要求所有子规约都满足';
      }
    } else if (spec instanceof OrSpecification) {
      detail.children = [];
      const leftPassed = this.validateRecursive(spec.getLeft(), candidate, detail.children!);
      const rightPassed = this.validateRecursive(spec.getRight(), candidate, detail.children!);
      detail.passed = leftPassed || rightPassed;
      if (!detail.passed) {
        detail.failureReason = 'OR 规约要求至少一个子规约满足';
      }
    } else if (spec instanceof NotSpecification) {
      detail.children = [];
      this.validateRecursive(spec.getOriginal(), candidate, detail.children!);
      detail.passed = !detail.children[0]?.passed;
      if (!detail.passed) {
        detail.failureReason = 'NOT 规约要求原规约不满足';
      }
    }

    details.push(detail);
    return passed;
  }

  /**
   * 获取规约 ID
   */
  private static getSpecId<T>(spec: Specification<T>): string {
    if (spec instanceof SimpleSpecification) {
      return spec.getId();
    }
    return 'composite_' + Date.now().toString();
  }

  /**
   * 获取规约名称
   */
  private static getSpecName<T>(spec: Specification<T>): string {
    if (spec instanceof SimpleSpecification) {
      return spec.getName();
    }
    return 'Composite Specification';
  }

  /**
   * 批量验证
   */
  static validateBatch<T>(
    specification: Specification<T>,
    candidates: T[]
  ): ValidationReport[] {
    return candidates.map(candidate => this.validate(specification, candidate));
  }

  /**
   * 过滤满足规约的对象
   */
  static filter<T>(specification: Specification<T>, candidates: T[]): T[] {
    return candidates.filter(candidate => specification.isSatisfiedBy(candidate));
  }

  /**
   * 查找第一个满足规约的对象
   */
  static find<T>(specification: Specification<T>, candidates: T[]): T | undefined {
    return candidates.find(candidate => specification.isSatisfiedBy(candidate));
  }
}

// ============== 预定义业务规约 ==============

/**
 * 常用业务规约工厂
 */
export class BusinessSpecifications {
  /**
   * 数值范围规约
   */
  static numberRange(min: number, max: number, fieldName: string = 'value') {
    return new SimpleSpecification<{ [key: string]: any }>({
      name: `数值范围 [${min}, ${max}]`,
      description: `${fieldName} 必须在 ${min} 到 ${max} 之间`,
      predicate: (obj) => {
        const value = obj[fieldName];
        return typeof value === 'number' && value >= min && value <= max;
      },
      tags: ['number', 'range'],
    });
  }

  /**
   * 字符串长度规约
   */
  static stringLength(minLength: number, maxLength: number, fieldName: string = 'value') {
    return new SimpleSpecification<{ [key: string]: any }>({
      name: `字符串长度 [${minLength}, ${maxLength}]`,
      description: `${fieldName} 长度必须在 ${minLength} 到 ${maxLength} 之间`,
      predicate: (obj) => {
        const value = obj[fieldName];
        return typeof value === 'string' && value.length >= minLength && value.length <= maxLength;
      },
      tags: ['string', 'length'],
    });
  }

  /**
   * 必填字段规约
   */
  static required(fieldName: string) {
    return new SimpleSpecification<{ [key: string]: any }>({
      name: `必填字段：${fieldName}`,
      description: `${fieldName} 不能为空`,
      predicate: (obj) => {
        const value = obj[fieldName];
        return value !== null && value !== undefined && value !== '';
      },
      tags: ['required'],
    });
  }

  /**
   * 邮箱格式规约
   */
  static email(fieldName: string = 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return new SimpleSpecification<{ [key: string]: any }>({
      name: '邮箱格式验证',
      description: `${fieldName} 必须是有效的邮箱地址`,
      predicate: (obj) => {
        const value = obj[fieldName];
        return typeof value === 'string' && emailRegex.test(value);
      },
      tags: ['email', 'format'],
    });
  }

  /**
   * 手机号格式规约 (中国)
   */
  static phoneCN(fieldName: string = 'phone') {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return new SimpleSpecification<{ [key: string]: any }>({
      name: '手机号格式验证 (中国)',
      description: `${fieldName} 必须是中国有效的手机号`,
      predicate: (obj) => {
        const value = obj[fieldName];
        return typeof value === 'string' && phoneRegex.test(value);
      },
      tags: ['phone', 'format', 'cn'],
    });
  }

  /**
   * 日期范围规约
   */
  static dateRange(startDate: Date, endDate: Date, fieldName: string = 'date') {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return new SimpleSpecification<{ [key: string]: any }>({
      name: `日期范围 [${startDate.toISOString()}, ${endDate.toISOString()}]`,
      description: `${fieldName} 必须在指定日期范围内`,
      predicate: (obj) => {
        const value = obj[fieldName];
        if (!(value instanceof Date)) return false;
        const time = value.getTime();
        return time >= start && time <= end;
      },
      tags: ['date', 'range'],
    });
  }

  /**
   * 枚举值规约
   */
  static oneOf<T extends { [key: string]: any }>(allowedValues: any[], fieldName: string = 'value') {
    return new SimpleSpecification<T>({
      name: `枚举值 [${allowedValues.join(', ')}]`,
      description: `${fieldName} 必须是以下值之一：${allowedValues.join(', ')}`,
      predicate: (obj) => {
        const value = obj[fieldName];
        return allowedValues.includes(value);
      },
      tags: ['enum'],
    });
  }

  /**
   * 年龄范围规约
   */
  static ageRange(minAge: number, maxAge: number, fieldName: string = 'age') {
    return new SimpleSpecification<{ [key: string]: any }>({
      name: `年龄范围 [${minAge}, ${maxAge}]`,
      description: `年龄必须在 ${minAge} 到 ${maxAge} 岁之间`,
      predicate: (obj) => {
        const age = obj[fieldName];
        return typeof age === 'number' && age >= minAge && age <= maxAge;
      },
      tags: ['age', 'range'],
    });
  }
}

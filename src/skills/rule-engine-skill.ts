/**
 * ACE Rule Engine Skill
 * 
 * 业务规则引擎 - 支持规则定义、匹配和执行
 * 
 * @module rule-engine
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/**
 * 规则条件操作符
 */
export type Operator = 
  | 'eq'      // 等于
  | 'neq'     // 不等于
  | 'gt'      // 大于
  | 'gte'     // 大于等于
  | 'lt'      // 小于
  | 'lte'     // 小于等于
  | 'in'      // 包含在
  | 'nin'     // 不包含在
  | 'contains' // 包含
  | 'startsWith' // 开头是
  | 'endsWith' // 结尾是
  | 'regex'   // 正则匹配
  | 'exists'  // 字段存在
  | 'notExists' // 字段不存在
  | 'and'     // 与
  | 'or'      // 或
  | 'not';    // 非

/**
 * 规则条件
 */
export interface Condition {
  field: string;           // 字段名
  operator: Operator;      // 操作符
  value?: any;            // 比较值
  conditions?: Condition[]; // 嵌套条件 (用于 and/or/not)
}

/**
 * 规则动作
 */
export interface Action {
  type: 'set' | 'append' | 'remove' | 'notify' | 'transform' | 'custom';
  field?: string;
  value?: any;
  handler?: (context: ExecutionContext) => any;
}

/**
 * 规则定义
 */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  priority: number;        // 优先级 (数字越小优先级越高)
  conditions: Condition[]; // 条件列表 (AND 关系)
  actions: Action[];       // 动作列表
  enabled: boolean;        // 是否启用
  tags?: string[];         // 标签
  metadata?: Record<string, any>;
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  data: Record<string, any>;
  result: Record<string, any>;
  matchedRules: string[];
  timestamp: number;
}

/**
 * 规则匹配结果
 */
export interface MatchResult {
  rule: Rule;
  matched: boolean;
  matchedConditions?: Condition[];
  failedConditions?: Condition[];
}

/**
 * 规则执行结果
 */
export interface ExecutionResult {
  success: boolean;
  matchedRules: string[];
  executedActions: number;
  context: ExecutionContext;
  errors?: string[];
}

// ==================== 规则引擎核心类 ====================

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();
  private customHandlers: Map<string, (context: ExecutionContext, action: Action) => any> = new Map();

  /**
   * 注册自定义动作处理器
   */
  registerHandler(name: string, handler: (context: ExecutionContext, action: Action) => any): void {
    this.customHandlers.set(name, handler);
  }

  /**
   * 添加规则
   */
  addRule(rule: Rule): void {
    if (!rule.id || !rule.name) {
      throw new Error('规则必须包含 id 和 name');
    }
    this.rules.set(rule.id, rule);
  }

  /**
   * 批量添加规则
   */
  addRules(rules: Rule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 获取所有规则
   */
  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 按标签筛选规则
   */
  getRulesByTag(tag: string): Rule[] {
    return this.getAllRules().filter(rule => rule.tags?.includes(tag));
  }

  /**
   * 启用/禁用规则
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * 评估单个条件
   */
  private evaluateCondition(condition: Condition, data: Record<string, any>): boolean {
    const { field, operator, value, conditions } = condition;

    // 逻辑操作符
    if (operator === 'and' && conditions) {
      return conditions.every(c => this.evaluateCondition(c, data));
    }
    if (operator === 'or' && conditions) {
      return conditions.some(c => this.evaluateCondition(c, data));
    }
    if (operator === 'not' && conditions && conditions.length > 0) {
      return !this.evaluateCondition(conditions[0], data);
    }

    // 获取字段值 (支持嵌套字段如 "user.age")
    const fieldValue = this.getFieldValue(data, field);

    // 字段存在性检查
    if (operator === 'exists') {
      return fieldValue !== undefined;
    }
    if (operator === 'notExists') {
      return fieldValue === undefined;
    }

    // 值比较
    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'neq':
        return fieldValue !== value;
      case 'gt':
        return fieldValue > value;
      case 'gte':
        return fieldValue >= value;
      case 'lt':
        return fieldValue < value;
      case 'lte':
        return fieldValue <= value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'nin':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value);
      case 'startsWith':
        return typeof fieldValue === 'string' && fieldValue.startsWith(value);
      case 'endsWith':
        return typeof fieldValue === 'string' && fieldValue.endsWith(value);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(value).test(fieldValue);
      default:
        return false;
    }
  }

  /**
   * 获取嵌套字段值
   */
  private getFieldValue(data: Record<string, any>, field: string): any {
    const parts = field.split('.');
    let value: any = data;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  /**
   * 设置嵌套字段值
   */
  private setFieldValue(data: Record<string, any>, field: string, value: any): void {
    const parts = field.split('.');
    const lastPart = parts.pop()!;
    
    let target: any = data;
    for (const part of parts) {
      if (!(part in target)) {
        target[part] = {};
      }
      target = target[part];
    }
    
    target[lastPart] = value;
  }

  /**
   * 匹配规则
   */
  match(data: Record<string, any>): MatchResult[] {
    const results: MatchResult[] = [];

    for (const rule of this.getAllRules()) {
      if (!rule.enabled) continue;

      const matchedConditions: Condition[] = [];
      const failedConditions: Condition[] = [];

      // 所有条件必须满足 (AND 关系)
      const allMatched = rule.conditions.every(condition => {
        const matched = this.evaluateCondition(condition, data);
        if (matched) {
          matchedConditions.push(condition);
        } else {
          failedConditions.push(condition);
        }
        return matched;
      });

      results.push({
        rule,
        matched: allMatched,
        matchedConditions: allMatched ? matchedConditions : undefined,
        failedConditions: !allMatched ? failedConditions : undefined,
      });
    }

    // 按优先级排序
    return results.sort((a, b) => a.rule.priority - b.rule.priority);
  }

  /**
   * 获取匹配的规则
   */
  getMatchedRules(data: Record<string, any>): Rule[] {
    return this.match(data)
      .filter(result => result.matched)
      .map(result => result.rule);
  }

  /**
   * 执行动作
   */
  private executeAction(action: Action, context: ExecutionContext): void {
    switch (action.type) {
      case 'set':
        if (action.field) {
          this.setFieldValue(context.result, action.field, action.value);
        }
        break;
      
      case 'append':
        if (action.field) {
          const currentValue = context.result[action.field] || [];
          if (!Array.isArray(currentValue)) {
            context.result[action.field] = [currentValue];
          }
          context.result[action.field].push(action.value);
        }
        break;
      
      case 'remove':
        if (action.field) {
          delete context.result[action.field];
        }
        break;
      
      case 'notify':
        console.log(`[Rule Notification] ${action.value}`);
        break;
      
      case 'transform':
        if (action.field && typeof action.value === 'function') {
          const currentValue = this.getFieldValue(context.result, action.field);
          const transformed = action.value(currentValue);
          this.setFieldValue(context.result, action.field, transformed);
        }
        break;
      
      case 'custom':
        if (action.handler) {
          action.handler(context);
        }
        break;
    }
  }

  /**
   * 执行规则
   */
  execute(data: Record<string, any>): ExecutionResult {
    const context: ExecutionContext = {
      data,
      result: {},
      matchedRules: [],
      timestamp: Date.now(),
    };

    const errors: string[] = [];
    const matchResults = this.match(data);
    let executedActions = 0;

    for (const result of matchResults) {
      if (!result.matched) continue;

      const { rule } = result;
      context.matchedRules.push(rule.id);

      try {
        for (const action of rule.actions) {
          this.executeAction(action, context);
          executedActions++;
        }
      } catch (error) {
        errors.push(`规则 "${rule.name}" 执行失败：${error}`);
      }
    }

    return {
      success: errors.length === 0,
      matchedRules: context.matchedRules,
      executedActions,
      context,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 执行并返回结果数据
   */
  executeAndGetResult(data: Record<string, any>): Record<string, any> {
    const result = this.execute(data);
    return result.context.result;
  }
}

// ==================== 便捷函数 ====================

/**
 * 创建条件
 */
export function condition(
  field: string,
  operator: Operator,
  value?: any
): Condition {
  return { field, operator, value };
}

/**
 * 创建逻辑条件 (AND)
 */
export function and(...conditions: Condition[]): Condition {
  return { field: '', operator: 'and', conditions };
}

/**
 * 创建逻辑条件 (OR)
 */
export function or(...conditions: Condition[]): Condition {
  return { field: '', operator: 'or', conditions };
}

/**
 * 创建逻辑条件 (NOT)
 */
export function not(condition: Condition): Condition {
  return { field: '', operator: 'not', conditions: [condition] };
}

/**
 * 创建动作
 */
export function action(
  type: Action['type'],
  field?: string,
  value?: any
): Action {
  return { type, field, value };
}

/**
 * 创建规则
 */
export function createRule(options: {
  id: string;
  name: string;
  description?: string;
  priority?: number;
  conditions: Condition[];
  actions: Action[];
  enabled?: boolean;
  tags?: string[];
}): Rule {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    priority: options.priority ?? 100,
    conditions: options.conditions,
    actions: options.actions,
    enabled: options.enabled ?? true,
    tags: options.tags,
  };
}

// ==================== 使用示例 ====================

/**
 * 使用示例
 */
export function demonstrateRuleEngine(): void {
  console.log('=== ACE Rule Engine 使用示例 ===\n');

  const engine = new RuleEngine();

  // 示例 1: 折扣规则
  const discountRule = createRule({
    id: 'discount-vip',
    name: 'VIP 客户折扣',
    description: 'VIP 客户且订单金额大于 1000 元，享受 9 折优惠',
    priority: 10,
    conditions: [
      condition('user.level', 'eq', 'vip'),
      condition('order.amount', 'gte', 1000),
    ],
    actions: [
      action('set', 'discount.rate', 0.9),
      action('set', 'discount.reason', 'VIP 客户优惠'),
    ],
    tags: ['discount', 'vip'],
  });

  // 示例 2: 免运费规则
  const freeShippingRule = createRule({
    id: 'free-shipping',
    name: '满额免运费',
    description: '订单金额满 500 元免运费',
    priority: 20,
    conditions: [
      condition('order.amount', 'gte', 500),
    ],
    actions: [
      action('set', 'shipping.fee', 0),
      action('set', 'shipping.reason', '满额免运费'),
    ],
    tags: ['shipping'],
  });

  // 示例 3: 复杂条件规则 (OR)
  const promotionRule = createRule({
    id: 'promotion-summer',
    name: '夏季促销',
    description: '夏季商品或新用户享受促销价',
    priority: 15,
    conditions: [
      or(
        condition('product.season', 'eq', 'summer'),
        condition('user.isNew', 'eq', true),
      ),
    ],
    actions: [
      action('set', 'promotion.applied', true),
      action('set', 'promotion.discount', 0.85),
    ],
    tags: ['promotion'],
  });

  // 添加规则
  engine.addRules([discountRule, freeShippingRule, promotionRule]);

  // 测试数据 1: VIP 客户大额订单
  console.log('测试 1: VIP 客户大额订单');
  const testData1 = {
    user: { level: 'vip', isNew: false },
    order: { amount: 1500 },
    product: { season: 'summer' },
  };

  const result1 = engine.execute(testData1);
  console.log('匹配规则:', result1.matchedRules);
  console.log('执行结果:', JSON.stringify(result1.context.result, null, 2));
  console.log();

  // 测试数据 2: 新用户小额订单
  console.log('测试 2: 新用户小额订单');
  const testData2 = {
    user: { level: 'normal', isNew: true },
    order: { amount: 300 },
    product: { season: 'summer' },
  };

  const result2 = engine.execute(testData2);
  console.log('匹配规则:', result2.matchedRules);
  console.log('执行结果:', JSON.stringify(result2.context.result, null, 2));
  console.log();

  // 测试数据 3: 普通用户不满足条件
  console.log('测试 3: 普通用户不满足条件');
  const testData3 = {
    user: { level: 'normal', isNew: false },
    order: { amount: 200 },
    product: { season: 'winter' },
  };

  const result3 = engine.execute(testData3);
  console.log('匹配规则:', result3.matchedRules);
  console.log('执行结果:', JSON.stringify(result3.context.result, null, 2));
  console.log();

  // 示例 4: 自定义动作处理器
  console.log('示例 4: 自定义动作处理器');
  engine.registerHandler('sendEmail', (context, action) => {
    console.log(`[发送邮件] 收件人：${action.value.to}, 主题：${action.value.subject}`);
    context.result.emailSent = true;
  });

  const emailRule = createRule({
    id: 'notify-large-order',
    name: '大额订单通知',
    description: '订单金额超过 5000 元时发送邮件通知',
    priority: 5,
    conditions: [
      condition('order.amount', 'gte', 5000),
    ],
    actions: [
      {
        type: 'custom',
        handler: (ctx) => {
          console.log(`[大额订单提醒] 订单金额：${ctx.data.order.amount}`);
          ctx.result.alertLevel = 'high';
        },
      },
    ],
    tags: ['notification'],
  });

  engine.addRule(emailRule);

  const testData4 = {
    user: { level: 'vip' },
    order: { amount: 6000 },
  };

  const result4 = engine.execute(testData4);
  console.log('匹配规则:', result4.matchedRules);
  console.log('执行结果:', JSON.stringify(result4.context.result, null, 2));

  console.log('\n=== 示例完成 ===');
}

// 导出默认实例
export default RuleEngine;

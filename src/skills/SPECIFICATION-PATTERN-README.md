# 规约模式技能 - Specification Pattern Skill

> 业务规约模式实现，用于复杂业务规则的组合与验证

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 📋 目录

- [概述](#概述)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [API 参考](#api 参考)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)

---

## 概述

规约模式 (Specification Pattern) 是一种**业务规则模式**，用于将业务逻辑从业务对象中分离出来，使规则可复用、可组合、可测试。

### 核心优势

✅ **可复用性** - 规约可以独立定义并在多处使用  
✅ **可组合性** - 通过 AND/OR/NOT 组合复杂规则  
✅ **可测试性** - 规约独立于业务逻辑，易于单元测试  
✅ **可读性** - 业务规则以声明式方式表达  
✅ **灵活性** - 动态构建和修改业务规则

### 适用场景

- 📝 表单验证
- 🔍 数据过滤与查询
- ✅ 业务资格审核
- 🚫 权限控制
- 📊 数据校验

---

## 核心功能

### 1. 规约定义

创建独立的业务规则规约：

```typescript
import { SimpleSpecification } from './specification-pattern-skill';

const adultSpec = new SimpleSpecification<User>({
  name: '成年用户',
  description: '用户年龄必须大于等于 18 岁',
  predicate: (user) => user.age >= 18,
});
```

### 2. 规约组合

通过逻辑运算符组合多个规约：

```typescript
import { AndSpecification, OrSpecification, NotSpecification } from './specification-pattern-skill';

// AND: 成年且邮箱有效
const adultWithEmail = new AndSpecification(adultSpec, emailSpec);

// OR: 成年或是管理员
const adultOrAdmin = new OrSpecification(adultSpec, adminSpec);

// NOT: 不是未成年
const notMinor = new NotSpecification(minorSpec);
```

### 3. 规约验证

执行验证并获取详细报告：

```typescript
import { SpecificationValidator } from './specification-pattern-skill';

const report = SpecificationValidator.validate(combinedSpec, user);
console.log(report.passed); // true/false
console.log(report.details); // 详细验证信息
```

---

## 快速开始

### 安装

无需安装，直接使用：

```typescript
import {
  SimpleSpecification,
  AndSpecification,
  OrSpecification,
  NotSpecification,
  SpecificationBuilder,
  SpecificationValidator,
  BusinessSpecifications,
} from './specification-pattern-skill';
```

### 5 分钟上手

```typescript
interface User {
  age: number;
  email: string;
  isActive: boolean;
}

// 1. 创建简单规约
const ageSpec = new SimpleSpecification<User>({
  name: '年龄要求',
  description: '必须年满 18 岁',
  predicate: (user) => user.age >= 18,
});

// 2. 组合规约
const emailSpec = new SimpleSpecification<User>({
  name: '邮箱要求',
  description: '必须有有效邮箱',
  predicate: (user) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email),
});

const registrationSpec = new AndSpecification(ageSpec, emailSpec);

// 3. 验证
const user: User = { age: 20, email: 'test@example.com', isActive: true };
const passed = registrationSpec.isSatisfiedBy(user); // true

// 4. 获取详细报告
const report = SpecificationValidator.validate(registrationSpec, user);
console.log(report);
```

---

## API 参考

### 类型定义

#### Specification<T>

规约接口，所有规约的基础：

```typescript
interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  getDescription(): string;
}
```

#### ValidationReport

验证报告：

```typescript
interface ValidationReport {
  passed: boolean;
  specificationId: string;
  specificationName: string;
  details: ValidationDetail[];
  timestamp: number;
}
```

### 核心类

#### SimpleSpecification<T>

简单规约类，基于单个谓词函数：

```typescript
constructor(config: SimpleSpecificationConfig<T>)

// 配置
interface SimpleSpecificationConfig<T> {
  name: string;
  description: string;
  predicate: (candidate: T) => boolean;
  tags?: string[];
}
```

**方法:**
- `isSatisfiedBy(candidate: T): boolean` - 验证
- `getDescription(): string` - 获取描述
- `getMeta(): SpecificationMeta` - 获取元数据
- `getId(): string` - 获取 ID
- `getName(): string` - 获取名称

#### AndSpecification<T>

AND 组合规约，所有子规约必须满足：

```typescript
constructor(left: Specification<T>, right: Specification<T>)
```

#### OrSpecification<T>

OR 组合规约，至少一个子规约满足：

```typescript
constructor(left: Specification<T>, right: Specification<T>)
```

#### NotSpecification<T>

NOT 规约，对原规约取反：

```typescript
constructor(original: Specification<T>)
```

#### SpecificationBuilder<T>

流式构建器，用于创建复杂规约：

```typescript
// 链式调用
new SpecificationBuilder<User>()
  .create('name', 'desc', predicate)
  .and(otherSpec)
  .or(anotherSpec)
  .not()
  .build();
```

**方法:**
- `create(name, description, predicate)` - 创建基础规约
- `and(other)` - AND 组合
- `or(other)` - OR 组合
- `not()` - NOT 取反
- `build()` - 构建并返回
- `reset()` - 重置构建器

#### SpecificationValidator<T>

验证器，提供详细验证报告：

```typescript
// 单个验证
static validate<T>(spec: Specification<T>, candidate: T): ValidationReport

// 批量验证
static validateBatch<T>(spec: Specification<T>, candidates: T[]): ValidationReport[]

// 过滤
static filter<T>(spec: Specification<T>, candidates: T[]): T[]

// 查找第一个
static find<T>(spec: Specification<T>, candidates: T[]): T | undefined
```

#### BusinessSpecifications

预定义业务规约工厂：

```typescript
// 数值范围
BusinessSpecifications.numberRange(min, max, fieldName)

// 字符串长度
BusinessSpecifications.stringLength(minLen, maxLen, fieldName)

// 必填字段
BusinessSpecifications.required(fieldName)

// 邮箱格式
BusinessSpecifications.email(fieldName)

// 手机号 (中国)
BusinessSpecifications.phoneCN(fieldName)

// 日期范围
BusinessSpecifications.dateRange(startDate, endDate, fieldName)

// 枚举值
BusinessSpecifications.oneOf(allowedValues, fieldName)

// 年龄范围
BusinessSpecifications.ageRange(minAge, maxAge, fieldName)
```

---

## 使用示例

### 示例 1: 表单验证

```typescript
interface RegistrationForm {
  username: string;
  email: string;
  password: string;
  age: number;
}

const usernameSpec = BusinessSpecifications.stringLength(3, 20, 'username');
const emailSpec = BusinessSpecifications.email('email');
const ageSpec = BusinessSpecifications.ageRange(18, 100, 'age');
const passwordSpec = new SimpleSpecification<RegistrationForm>({
  name: '密码强度',
  description: '密码至少 8 位，包含大小写字母和数字',
  predicate: (form) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password),
});

const registrationSpec = new SpecificationBuilder<RegistrationForm>()
  .create('基本要求', '必须满足所有要求', () => true)
  .and(usernameSpec)
  .and(emailSpec)
  .and(ageSpec)
  .and(passwordSpec)
  .build();

const form: RegistrationForm = {
  username: 'john',
  email: 'john@example.com',
  password: 'Weak123',
  age: 25,
};

const report = SpecificationValidator.validate(registrationSpec, form);
if (!report.passed) {
  console.log('验证失败:', report.details);
}
```

### 示例 2: 数据过滤

```typescript
interface Product {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

const products: Product[] = [...];

// 创建筛选规约
const priceSpec = BusinessSpecifications.numberRange(100, 1000, 'price');
const stockSpec = new SimpleSpecification<Product>({
  name: '有库存',
  description: '商品必须有库存',
  predicate: (p) => p.inStock,
});
const categorySpec = BusinessSpecifications.oneOf<Product>(['electronics', 'books'], 'category');

// 组合：价格在范围内且有库存
const filterSpec = new AndSpecification(priceSpec, stockSpec);

// 过滤商品
const filtered = SpecificationValidator.filter(filterSpec, products);

// 查找第一个符合条件的商品
const firstMatch = SpecificationValidator.find(filterSpec, products);
```

### 示例 3: 业务资格审核

```typescript
interface LoanApplication {
  age: number;
  income: number;
  creditScore: number;
  employmentStatus: string;
}

// 定义各项资格规约
const ageReq = BusinessSpecifications.ageRange(22, 60, 'age');
const incomeReq = BusinessSpecifications.numberRange(100000, Infinity, 'income');
const creditReq = BusinessSpecifications.numberRange(650, 900, 'creditScore');
const employmentReq = new SimpleSpecification<LoanApplication>({
  name: '就业要求',
  description: '必须有稳定工作',
  predicate: (app) => app.employmentStatus !== 'unemployed',
});

// 组合所有要求
const approvalSpec = new SpecificationBuilder<LoanApplication>()
  .create('贷款资格', '必须满足所有条件', () => true)
  .and(ageReq)
  .and(incomeReq)
  .and(creditReq)
  .and(employmentReq)
  .build();

// 审批申请
const application: LoanApplication = { ... };
const report = SpecificationValidator.validate(approvalSpec, application);

if (report.passed) {
  console.log('✓ 贷款批准');
} else {
  console.log('✗ 贷款拒绝');
  report.details.forEach(d => {
    if (!d.passed) console.log(`  - ${d.name}: ${d.failureReason}`);
  });
}
```

### 示例 4: 动态规则引擎

```typescript
// 运行时动态构建规则
function createDynamicRules(userType: string): Specification<User> {
  const baseSpec = new SimpleSpecification<User>({
    name: '基础要求',
    description: '所有用户都必须满足',
    predicate: (u) => u.isActive,
  });

  if (userType === 'vip') {
    return new AndSpecification(
      baseSpec,
      BusinessSpecifications.numberRange(10000, Infinity, 'balance')
    );
  }

  if (userType === 'admin') {
    return new AndSpecification(
      baseSpec,
      new SimpleSpecification<User>({
        name: '管理员要求',
        description: '必须是管理员角色',
        predicate: (u) => u.role === 'admin',
      })
    );
  }

  return baseSpec;
}
```

---

## 最佳实践

### ✅ 推荐做法

1. **命名清晰** - 规约名称应清楚表达业务含义
   ```typescript
   // ✅ 好
   new SimpleSpecification({ name: '成年用户', ... })
   
   // ❌ 不好
   new SimpleSpecification({ name: '规则 1', ... })
   ```

2. **单一职责** - 每个简单规约只验证一个条件
   ```typescript
   // ✅ 好
   const ageSpec = createAgeSpec();
   const emailSpec = createEmailSpec();
   const combined = new AndSpecification(ageSpec, emailSpec);
   
   // ❌ 不好
   const spec = new SimpleSpecification({
     predicate: (u) => u.age >= 18 && u.email.includes('@')
   });
   ```

3. **使用构建器** - 复杂规约使用构建器提高可读性
   ```typescript
   const spec = new SpecificationBuilder<User>()
     .create('基础', '基础要求', basePredicate)
     .and(ageSpec)
     .and(emailSpec)
     .build();
   ```

4. **生成详细报告** - 使用 Validator 获取失败原因
   ```typescript
   const report = SpecificationValidator.validate(spec, candidate);
   if (!report.passed) {
     report.details.forEach(d => console.log(d.failureReason));
   }
   ```

5. **复用预定义规约** - 优先使用 BusinessSpecifications
   ```typescript
   const emailSpec = BusinessSpecifications.email('email');
   const ageSpec = BusinessSpecifications.ageRange(18, 65, 'age');
   ```

### ⚠️ 注意事项

1. **性能考虑** - 避免过深的规约嵌套
   ```typescript
   // 建议不超过 5 层嵌套
   ```

2. **错误处理** - 谓词函数应处理异常情况
   ```typescript
   predicate: (obj) => {
     try {
       return obj.value > 0;
     } catch {
       return false; // 安全失败
     }
   }
   ```

3. **类型安全** - 始终定义明确的类型
   ```typescript
   interface User { age: number; email: string; }
   const spec = new SimpleSpecification<User>({ ... });
   ```

---

## 相关文件

- **实现文件:** `src/skills/specification-pattern-skill.ts`
- **示例文件:** `src/skills/specification-pattern-examples.ts`
- **本文档:** `src/skills/SPECIFICATION-PATTERN-README.md`

---

## 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 简单规约实现
- ✅ AND/OR/NOT组合规约
- ✅ 流式构建器
- ✅ 详细验证报告
- ✅ 预定义业务规约工厂
- ✅ 批量验证与过滤

---

**规约模式 - 让业务规则清晰、可组合、可测试**

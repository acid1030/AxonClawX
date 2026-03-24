/**
 * 规约模式技能使用示例
 * 
 * 演示如何使用 Specification Pattern 进行业务规则定义、组合和验证
 * 
 * @author Axon
 * @version 1.0.0
 */

import {
  SimpleSpecification,
  AndSpecification,
  OrSpecification,
  NotSpecification,
  SpecificationBuilder,
  SpecificationValidator,
  BusinessSpecifications,
  type ValidationReport,
} from './specification-pattern-skill';

// ============== 示例 1: 简单规约定义 ==============

console.log('=== 示例 1: 简单规约定义 ===\n');

// 定义用户类型
interface User {
  id: string;
  name: string;
  age: number;
  email: string;
  phone?: string;
  isActive: boolean;
  role: 'admin' | 'user' | 'guest';
}

// 创建年龄规约
const ageSpec = new SimpleSpecification<User>({
  name: '成年用户',
  description: '用户年龄必须大于等于 18 岁',
  predicate: (user) => user.age >= 18,
  tags: ['age', 'adult'],
});

// 创建邮箱规约
const emailSpec = new SimpleSpecification<User>({
  name: '有效邮箱',
  description: '用户邮箱必须是有效格式',
  predicate: (user) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email),
  tags: ['email', 'format'],
});

// 测试数据
const testUsers: User[] = [
  { id: '1', name: '张三', age: 20, email: 'zhangsan@example.com', isActive: true, role: 'user' },
  { id: '2', name: '李四', age: 16, email: 'lisi@example.com', isActive: true, role: 'user' },
  { id: '3', name: '王五', age: 25, email: 'invalid-email', isActive: true, role: 'user' },
];

// 验证
testUsers.forEach(user => {
  const agePassed = ageSpec.isSatisfiedBy(user);
  const emailPassed = emailSpec.isSatisfiedBy(user);
  console.log(`用户 ${user.name}: 年龄规约=${agePassed}, 邮箱规约=${emailPassed}`);
});

console.log();

// ============== 示例 2: 规约组合 (AND/OR/NOT) ==============

console.log('=== 示例 2: 规约组合 ===\n');

// AND 组合：成年且邮箱有效
const adultWithEmailSpec = new AndSpecification(ageSpec, emailSpec);

// OR 组合：成年或者是管理员
const adminAgeSpec = new SimpleSpecification<User>({
  name: '管理员',
  description: '用户角色是管理员',
  predicate: (user) => user.role === 'admin',
});
const adultOrAdminSpec = new OrSpecification(ageSpec, adminAgeSpec);

// NOT 组合：不是未成年
const notMinorSpec = new NotSpecification(
  new SimpleSpecification<User>({
    name: '未成年',
    description: '用户年龄小于 18 岁',
    predicate: (user) => user.age < 18,
  })
);

// 测试组合规约
const testUser: User = {
  id: '4',
  name: '赵六',
  age: 20,
  email: 'zhaoliu@example.com',
  isActive: true,
  role: 'user',
};

console.log('测试用户:', testUser.name);
console.log('成年且邮箱有效:', adultWithEmailSpec.isSatisfiedBy(testUser));
console.log('成年或是管理员:', adultOrAdminSpec.isSatisfiedBy(testUser));
console.log('不是未成年:', notMinorSpec.isSatisfiedBy(testUser));
console.log();

// ============== 示例 3: 使用构建器创建复杂规约 ==============

console.log('=== 示例 3: 规约构建器 ===\n');

// 使用构建器创建复杂业务规约
const registrationSpec = new SpecificationBuilder<User>()
  .create(
    '活跃用户',
    '用户必须是活跃状态',
    (user) => user.isActive
  )
  .and(
    new SimpleSpecification<User>({
      name: '成年',
      description: '年龄 >= 18',
      predicate: (user) => user.age >= 18,
    })
  )
  .and(
    new SimpleSpecification<User>({
      name: '有效邮箱',
      description: '邮箱格式正确',
      predicate: (user) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email),
    })
  )
  .or(
    new SimpleSpecification<User>({
      name: '管理员豁免',
      description: '管理员不受限制',
      predicate: (user) => user.role === 'admin',
    })
  )
  .build();

console.log('注册规约描述:', registrationSpec.getDescription());

const registrationCandidates: User[] = [
  { id: '1', name: '用户 A', age: 20, email: 'a@example.com', isActive: true, role: 'user' },
  { id: '2', name: '用户 B', age: 16, email: 'b@example.com', isActive: true, role: 'admin' }, // 管理员豁免
  { id: '3', name: '用户 C', age: 25, email: 'invalid', isActive: true, role: 'user' },
  { id: '4', name: '用户 D', age: 30, email: 'd@example.com', isActive: false, role: 'user' }, // 不活跃
];

console.log('\n注册资格审核:');
registrationCandidates.forEach(user => {
  const passed = registrationSpec.isSatisfiedBy(user);
  console.log(`  ${user.name}: ${passed ? '✓ 通过' : '✗ 拒绝'}`);
});

console.log();

// ============== 示例 4: 详细验证报告 ==============

console.log('=== 示例 4: 详细验证报告 ===\n');

const candidate: User = {
  id: '5',
  name: '测试用户',
  age: 17,
  email: 'test@example.com',
  isActive: true,
  role: 'user',
};

const report: ValidationReport = SpecificationValidator.validate(registrationSpec, candidate);

console.log('验证对象:', candidate.name);
console.log('总体结果:', report.passed ? '✓ 通过' : '✗ 失败');
console.log('规约名称:', report.specificationName);
console.log('验证时间:', new Date(report.timestamp).toISOString());
console.log('\n验证详情:');
console.log(JSON.stringify(report.details, null, 2));

console.log();

// ============== 示例 5: 批量验证与过滤 ==============

console.log('=== 示例 5: 批量验证与过滤 ===\n');

const allUsers: User[] = [
  { id: '1', name: '用户 1', age: 25, email: 'u1@example.com', isActive: true, role: 'user' },
  { id: '2', name: '用户 2', age: 17, email: 'u2@example.com', isActive: true, role: 'user' },
  { id: '3', name: '用户 3', age: 30, email: 'u3@example.com', isActive: false, role: 'admin' },
  { id: '4', name: '用户 4', age: 22, email: 'u4@example.com', isActive: true, role: 'user' },
  { id: '5', name: '用户 5', age: 19, email: 'invalid-email', isActive: true, role: 'user' },
];

// 过滤满足条件的用户
const qualifiedUsers = SpecificationValidator.filter(ageSpec, allUsers);
console.log('成年用户列表:');
qualifiedUsers.forEach(u => console.log(`  - ${u.name} (${u.age}岁)`));

// 查找第一个满足条件的用户
const firstAdult = SpecificationValidator.find(ageSpec, allUsers);
console.log('\n第一个成年用户:', firstAdult?.name);

// 批量验证
const batchReports = SpecificationValidator.validateBatch(ageSpec, allUsers);
console.log('\n批量验证结果:');
batchReports.forEach(r => {
  console.log(`  ${allUsers.find(u => u.id === r.details[0]?.id)?.name}: ${r.passed ? '✓' : '✗'}`);
});

console.log();

// ============== 示例 6: 使用预定义业务规约 ==============

console.log('=== 示例 6: 预定义业务规约 ===\n');

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: 'electronics' | 'clothing' | 'food';
  stock: number;
}

const product: Product = {
  id: 'p1',
  name: 'iPhone 15',
  price: 7999,
  description: 'Apple 最新智能手机',
  category: 'electronics',
  stock: 100,
};

// 数值范围规约
const priceRangeSpec = BusinessSpecifications.numberRange(1000, 10000, 'price');
console.log('价格范围验证:', priceRangeSpec.isSatisfiedBy(product));

// 字符串长度规约
const descLengthSpec = BusinessSpecifications.stringLength(10, 500, 'description');
console.log('描述长度验证:', descLengthSpec.isSatisfiedBy(product));

// 必填字段规约
const nameRequiredSpec = BusinessSpecifications.required('name');
console.log('名称必填验证:', nameRequiredSpec.isSatisfiedBy(product));

// 枚举值规约
const categorySpec = BusinessSpecifications.oneOf<Product>(['electronics', 'clothing', 'food'], 'category');
console.log('类别枚举验证:', categorySpec.isSatisfiedBy(product));

console.log();

// ============== 示例 7: 复杂业务场景 ==============

console.log('=== 示例 7: 复杂业务场景 - 贷款审批 ===\n');

interface LoanApplication {
  applicantName: string;
  age: number;
  annualIncome: number;
  creditScore: number;
  employmentStatus: 'employed' | 'self-employed' | 'unemployed';
  loanAmount: number;
  purpose: 'home' | 'car' | 'education' | 'personal';
}

// 定义各项规约
const ageRequirement = BusinessSpecifications.ageRange(22, 60, 'age');
const incomeRequirement = BusinessSpecifications.numberRange(100000, Infinity, 'annualIncome');
const creditScoreRequirement = BusinessSpecifications.numberRange(650, 900, 'creditScore');
const employmentRequirement = new SimpleSpecification<LoanApplication>({
  name: '就业状态',
  description: '申请人必须有工作',
  predicate: (app) => app.employmentStatus !== 'unemployed',
});
const loanPurposeRequirement = BusinessSpecifications.oneOf<LoanApplication>(
  ['home', 'car', 'education', 'personal'],
  'purpose'
);

// 组合所有规约
const loanApprovalSpec = new SpecificationBuilder<LoanApplication>()
  .create('基本要求', '必须满足所有基本条件', () => true)
  .and(ageRequirement)
  .and(incomeRequirement)
  .and(creditScoreRequirement)
  .and(employmentRequirement)
  .and(loanPurposeRequirement)
  .build();

// 测试申请
const applications: LoanApplication[] = [
  {
    applicantName: '张先生',
    age: 30,
    annualIncome: 500000,
    creditScore: 750,
    employmentStatus: 'employed',
    loanAmount: 1000000,
    purpose: 'home',
  },
  {
    applicantName: '李女士',
    age: 21, // 年龄不足
    annualIncome: 300000,
    creditScore: 700,
    employmentStatus: 'employed',
    loanAmount: 500000,
    purpose: 'car',
  },
  {
    applicantName: '王总',
    age: 45,
    annualIncome: 2000000,
    creditScore: 600, // 信用分不足
    employmentStatus: 'self-employed',
    loanAmount: 3000000,
    purpose: 'personal',
  },
];

console.log('贷款审批结果:');
applications.forEach(app => {
  const report = SpecificationValidator.validate(loanApprovalSpec, app);
  console.log(`\n申请人：${app.applicantName}`);
  console.log(`审批结果：${report.passed ? '✓ 批准' : '✗ 拒绝'}`);
  if (!report.passed) {
    console.log('失败原因:');
    report.details.forEach(detail => {
      if (!detail.passed) {
        console.log(`  - ${detail.name}: ${detail.failureReason}`);
      }
    });
  }
});

console.log('\n=== 所有示例执行完成 ===');

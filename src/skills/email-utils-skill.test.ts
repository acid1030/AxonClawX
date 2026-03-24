/**
 * Email Utils Skill - 快速测试
 * 
 * 运行：uv run node --loader ts-node/esm email-utils-skill.test.ts
 */

import {
  validateEmailFormat,
  checkMxRecords,
  isDisposableEmail,
  validateEmail,
  validateEmails,
} from './email-utils-skill';

async function runTests() {
  console.log('📧 Email Utils Skill - 快速测试\n');
  console.log('=' .repeat(50));

  // 测试 1: 格式验证
  console.log('\n✅ 测试 1: 邮箱格式验证');
  console.log('-'.repeat(50));
  
  const formatTests = [
    { email: 'user@example.com', expected: true },
    { email: 'john.doe@company.com', expected: true },
    { email: 'user+tag@gmail.com', expected: true },
    { email: 'invalid-email', expected: false },
    { email: 'user@@example.com', expected: false },
    { email: '@example.com', expected: false },
  ];

  formatTests.forEach(({ email, expected }) => {
    const result = validateEmailFormat(email);
    const status = result.valid === expected ? '✅' : '❌';
    console.log(`${status} ${email}: ${result.valid ? '有效' : '无效'}`);
    if (result.reason) {
      console.log(`   原因：${result.reason}`);
    }
  });

  // 测试 2: MX 记录检查
  console.log('\n📬 测试 2: MX 记录检查');
  console.log('-'.repeat(50));
  
  const mxTests = ['gmail.com', 'outlook.com', 'example.com'];
  
  for (const domain of mxTests) {
    try {
      const result = await checkMxRecords(domain);
      const status = result.exists ? '✅' : '❌';
      console.log(`${status} ${domain}: ${result.exists ? '找到 MX 记录' : '无 MX 记录'}`);
      if (result.records) {
        console.log(`   记录数：${result.records.length}`);
        if (result.records.length > 0) {
          console.log(`   主服务器：${result.records[0].exchange}`);
        }
      }
      if (result.error) {
        console.log(`   错误：${result.error}`);
      }
    } catch (error) {
      console.log(`❌ ${domain}: 查询失败`);
    }
  }

  // 测试 3: 临时邮箱检测
  console.log('\n🗑️ 测试 3: 临时邮箱检测');
  console.log('-'.repeat(50));
  
  const disposableTests = [
    { email: 'user@gmail.com', expected: false },
    { email: 'test@mailinator.com', expected: true },
    { email: 'user@yopmail.com', expected: true },
    { email: 'test@guerrillamail.com', expected: true },
    { email: 'user@company.com', expected: false },
  ];

  disposableTests.forEach(({ email, expected }) => {
    const result = isDisposableEmail(email);
    const status = result.isDisposable === expected ? '✅' : '❌';
    const disposable = result.isDisposable ? '临时邮箱' : '正常邮箱';
    console.log(`${status} ${email}: ${disposable}`);
    if (result.confidence) {
      console.log(`   置信度：${result.confidence}`);
    }
  });

  // 测试 4: 完整验证
  console.log('\n🔍 测试 4: 完整邮箱验证');
  console.log('-'.repeat(50));
  
  const fullTests = [
    'user@gmail.com',
    'test@mailinator.com',
    'invalid-email',
  ];

  for (const email of fullTests) {
    console.log(`\n验证：${email}`);
    const result = await validateEmail(email, { timeout: 3000 });
    
    console.log(`  格式有效：${result.formatValid ? '✅' : '❌'}`);
    if (result.mxExists !== undefined) {
      console.log(`  MX 记录：${result.mxExists ? '✅' : '❌'}`);
    }
    if (result.isDisposable !== undefined) {
      console.log(`  临时邮箱：${result.isDisposable ? '⚠️ 是' : '✅ 否'}`);
    }
    if (result.error) {
      console.log(`  错误：${result.error}`);
    }
  }

  // 测试 5: 批量验证
  console.log('\n📋 测试 5: 批量验证');
  console.log('-'.repeat(50));
  
  const batchEmails = [
    'user1@gmail.com',
    'user2@mailinator.com',
    'invalid',
    'user3@outlook.com',
  ];

  console.log(`验证 ${batchEmails.length} 个邮箱...`);
  const batchResults = await validateEmails(batchEmails, { 
    timeout: 3000,
    concurrency: 3 
  });

  const summary = {
    total: batchResults.length,
    valid: batchResults.filter(r => r.formatValid && r.mxExists && !r.isDisposable).length,
    invalid: batchResults.filter(r => !r.formatValid).length,
    disposable: batchResults.filter(r => r.isDisposable).length,
  };

  console.log(`\n统计:`);
  console.log(`  总数：${summary.total}`);
  console.log(`  有效：${summary.valid}`);
  console.log(`  格式错误：${summary.invalid}`);
  console.log(`  临时邮箱：${summary.disposable}`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ 所有测试完成!\n');
}

// 运行测试
runTests().catch(console.error);

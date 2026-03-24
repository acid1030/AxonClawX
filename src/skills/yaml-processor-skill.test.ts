/**
 * YAML 处理技能测试
 * 
 * @author Axon
 * @version 1.0.0
 */

import {
  parseYaml,
  parseYamlFile,
  stringifyYaml,
  saveYamlFile,
  validateYaml,
  validateYamlFile,
  compareYamlConfigs,
  mergeYamlConfigs,
  formatYamlFile,
  getYamlStats,
  DATABASE_CONFIG_SCHEMA,
  API_CONFIG_SCHEMA,
} from './yaml-processor-skill';
import * as fs from 'fs';
import * as path from 'path';

// 测试临时目录
const TEST_DIR = path.join(__dirname, '../../test-yaml-temp');

// 测试工具函数
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ 测试失败：${message}`);
  }
  console.log(`✅ ${message}`);
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function setup() {
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// ============== 测试用例 ==============

/** 测试 1: 基础 YAML 解析 */
function testBasicParse() {
  console.log('\n📝 测试 1: 基础 YAML 解析');
  
  const yamlContent = `
name: TestApp
version: 1.0.0
enabled: true
count: 42
settings:
  debug: false
  logLevel: info
`;

  const result = parseYaml(yamlContent);
  
  assert(result.data !== null, '解析结果不为空');
  assert(result.data.name === 'TestApp', '正确解析字符串');
  assert(result.data.version === '1.0.0', '正确解析版本号');
  assert(result.data.enabled === true, '正确解析布尔值');
  assert(result.data.count === 42, '正确解析数字');
  assert(result.data.settings.debug === false, '正确解析嵌套值');
  assert(result.errors.length === 0, '无解析错误');
  assert(result.duration >= 0, '记录解析耗时');
}

/** 测试 2: JSON 转 YAML */
function testStringify() {
  console.log('\n📝 测试 2: JSON 转 YAML');
  
  const data = {
    name: 'TestApp',
    version: '1.0.0',
    features: ['auth', 'api', 'webhooks'],
    database: {
      host: 'localhost',
      port: 5432
    }
  };

  const yamlString = stringifyYaml(data, { indent: 2 });
  
  assert(yamlString.includes('name: TestApp'), '包含 name 字段');
  assert(yamlString.includes('version: 1.0.0'), '包含 version 字段');
  assert(yamlString.includes('- auth'), '正确生成数组');
  assert(yamlString.includes('host: localhost'), '正确生成嵌套对象');
  assert(typeof yamlString === 'string', '返回字符串');
}

/** 测试 3: 文件读写 */
function testFileOperations() {
  console.log('\n📝 测试 3: 文件读写');
  
  const testFile = path.join(TEST_DIR, 'test-config.yml');
  const testData = {
    app: {
      name: 'FileTest',
      version: '2.0.0'
    },
    enabled: true
  };

  // 保存文件
  const saveSuccess = saveYamlFile(testFile, testData);
  assert(saveSuccess, '文件保存成功');
  assert(fs.existsSync(testFile), '文件存在');

  // 读取文件
  const parseResult = parseYamlFile(testFile);
  assert(parseResult.data !== null, '文件读取成功');
  assert(parseResult.data.app.name === 'FileTest', '数据正确');
  assert(parseResult.errors.length === 0, '无解析错误');

  // 测试不存在的文件
  const missingResult = parseYamlFile(path.join(TEST_DIR, 'nonexistent.yml'));
  assert(missingResult.data === null, '不存在的文件返回 null');
  assert(missingResult.errors.length > 0, '返回错误信息');
}

/** 测试 4: 配置验证 - 通过 */
function testValidationPass() {
  console.log('\n📝 测试 4: 配置验证 - 通过');
  
  const validConfig = {
    name: 'ValidApp',
    version: '1.0.0',
    enabled: true
  };

  const schema: any = {
    name: 'Test Schema',
    rules: [
      { path: 'name', type: 'string' as const, required: true, min: 1, max: 50 },
      { path: 'version', type: 'string' as const, required: true, pattern: '^\\d+\\.\\d+\\.\\d+$' },
      { path: 'enabled', type: 'boolean' as const, required: false }
    ],
    allowUnknown: true
  };

  const result = validateYaml(validConfig, schema);
  
  assert(result.valid === true, '验证通过');
  assert(result.errors.length === 0, '无错误');
  assert(result.warnings.length === 0, '无警告');
  assert(result.validatedFields > 0, '验证了字段');
}

/** 测试 5: 配置验证 - 失败 */
function testValidationFail() {
  console.log('\n📝 测试 5: 配置验证 - 失败');
  
  const invalidConfig = {
    name: '', // 违反 min: 1
    version: 'invalid', // 违反 pattern
    enabled: 'yes' // 类型错误
  };

  const schema: any = {
    name: 'Test Schema',
    rules: [
      { path: 'name', type: 'string' as const, required: true, min: 1 },
      { path: 'version', type: 'string' as const, required: true, pattern: '^\\d+\\.\\d+\\.\\d+$' },
      { path: 'enabled', type: 'boolean' as const, required: true }
    ]
  };

  const result = validateYaml(invalidConfig, schema);
  
  assert(result.valid === false, '验证失败');
  assert(result.errors.length > 0, '有错误');
  
  // 检查错误类型
  const hasTypeError = result.errors.some(e => e.type === 'type');
  const hasPatternError = result.errors.some(e => e.type === 'pattern');
  const hasRangeError = result.errors.some(e => e.type === 'range');
  
  assert(hasTypeError || hasPatternError || hasRangeError, '包含预期错误类型');
}

/** 测试 6: 必填字段验证 */
function testRequiredFields() {
  console.log('\n📝 测试 6: 必填字段验证');
  
  const config = {
    name: 'Test'
    // 缺少 version 字段
  };

  const schema: any = {
    name: 'Test Schema',
    rules: [
      { path: 'name', type: 'string' as const, required: true },
      { path: 'version', type: 'string' as const, required: true }
    ]
  };

  const result = validateYaml(config, schema);
  
  assert(result.valid === false, '验证失败');
  const hasRequiredError = result.errors.some(e => e.type === 'required' && e.path === 'version');
  assert(hasRequiredError, '包含必填字段错误');
}

/** 测试 7: 数据库配置 Schema 验证 */
function testDatabaseSchema() {
  console.log('\n📝 测试 7: 数据库配置 Schema 验证');
  
  const validDbConfig = {
    database: {
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'securepass123',
      name: 'mydb',
      poolSize: 10
    }
  };

  const result = validateYaml(validDbConfig, DATABASE_CONFIG_SCHEMA);
  
  assert(result.valid === true, '数据库配置验证通过');
}

/** 测试 8: API 配置 Schema 验证 */
function testApiSchema() {
  console.log('\n📝 测试 8: API 配置 Schema 验证');
  
  const validApiConfig = {
    api: {
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 3,
      rateLimit: 100
    }
  };

  const result = validateYaml(validApiConfig, API_CONFIG_SCHEMA);
  
  assert(result.valid === true, 'API 配置验证通过');
}

/** 测试 9: 配置比较 */
function testConfigComparison() {
  console.log('\n📝 测试 9: 配置比较');
  
  const config1 = {
    name: 'App',
    version: '1.0.0',
    debug: false
  };

  const config2 = {
    name: 'App',
    version: '2.0.0',
    debug: true,
    logging: {
      level: 'info'
    }
  };

  const diff = compareYamlConfigs(config1, config2);
  
  assert(diff.added.includes('logging.level'), '检测到新增字段');
  assert(diff.modified.includes('version'), '检测到修改字段');
  assert(diff.modified.includes('debug'), '检测到修改字段');
  assert(diff.unchanged.includes('name'), '检测到未变字段');
}

/** 测试 10: 配置合并 */
function testConfigMerge() {
  console.log('\n📝 测试 10: 配置合并');
  
  const base = {
    app: { name: 'MyApp' },
    database: { host: 'localhost', port: 5432 }
  };

  const override = {
    database: { name: 'mydb' },
    logging: { level: 'debug' }
  };

  const merged = mergeYamlConfigs(base, override);
  
  assert(merged.app.name === 'MyApp', '保留基础配置');
  assert(merged.database.host === 'localhost', '保留未覆盖字段');
  assert(merged.database.port === 5432, '保留未覆盖字段');
  assert(merged.database.name === 'mydb', '合并覆盖字段');
  assert(merged.logging.level === 'debug', '合并新字段');
}

/** 测试 11: 锚点合并 */
function testAnchorMerge() {
  console.log('\n📝 测试 11: 锚点合并');
  
  const yamlWithAnchors = `
defaults: &defaults
  adapter: postgres
  host: localhost

development:
  database: dev_db
  <<: *defaults

production:
  database: prod_db
  <<: *defaults
  host: prod.example.com
`;

  const result = parseYaml(yamlWithAnchors, { merge: true });
  
  assert(result.data !== null, '解析成功');
  assert(result.data.development.adapter === 'postgres', '锚点合并成功');
  assert(result.data.development.host === 'localhost', '锚点合并成功');
  assert(result.data.production.host === 'prod.example.com', '覆盖锚点值');
}

/** 测试 12: 文件统计 */
function testFileStats() {
  console.log('\n📝 测试 12: 文件统计');
  
  const testFile = path.join(TEST_DIR, 'stats-test.yml');
  const yamlContent = `
level1:
  level2:
    level3:
      key: value
`;
  
  fs.writeFileSync(testFile, yamlContent, 'utf-8');
  const stats = getYamlStats(testFile);
  
  assert(stats.fileSize > 0, '文件大小 > 0');
  assert(stats.lineCount > 0, '行数 > 0');
  assert(stats.keyCount > 0, '键数量 > 0');
  assert(stats.depth >= 3, '深度 >= 3');
}

/** 测试 13: 错误处理 */
function testErrorHandling() {
  console.log('\n📝 测试 13: 错误处理');
  
  const invalidYaml = `
name: Test
  invalid: indentation
    broken: yaml
`;

  const result = parseYaml(invalidYaml);
  
  assert(result.data === null, '无效 YAML 返回 null');
  assert(result.errors.length > 0, '返回错误');
  // 错误类型可能是 syntax 或其他解析错误
  assert(['syntax', 'type', 'schema'].includes(result.errors[0].type), '错误类型有效');
}

/** 测试 14: 自定义验证函数 */
function testCustomValidation() {
  console.log('\n📝 测试 14: 自定义验证函数');
  
  const config = {
    password: 'Weak' // 太简单
  };

  const schema: any = {
    name: 'Password Schema',
    rules: [
      {
        path: 'password',
        type: 'string' as const,
        required: true,
        validate: (value: string) => {
          return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && value.length >= 8;
        },
        message: '密码必须包含大小写字母和数字，至少 8 位'
      }
    ]
  };

  const result = validateYaml(config, schema);
  
  assert(result.valid === false, '弱密码验证失败');
  const hasCustomError = result.errors.some(e => e.type === 'custom');
  assert(hasCustomError, '包含自定义验证错误');
}

/** 测试 15: 枚举验证 */
function testEnumValidation() {
  console.log('\n📝 测试 15: 枚举验证');
  
  const validConfig = { role: 'admin' };
  const invalidConfig = { role: 'superuser' };

  const schema: any = {
    name: 'Role Schema',
    rules: [
      {
        path: 'role',
        type: 'string' as const,
        required: true,
        enum: ['admin', 'user', 'guest']
      }
    ]
  };

  const validResult = validateYaml(validConfig, schema);
  const invalidResult = validateYaml(invalidConfig, schema);
  
  assert(validResult.valid === true, '有效枚举值通过');
  assert(invalidResult.valid === false, '无效枚举值失败');
  const hasEnumError = invalidResult.errors.some(e => e.type === 'enum');
  assert(hasEnumError, '包含枚举错误');
}

// ============== 运行测试 ==============

async function runTests() {
  console.log('🚀 开始运行 YAML 处理技能测试\n');
  console.log('=' .repeat(50));
  
  setup();
  
  let passed = 0;
  let failed = 0;

  const tests = [
    testBasicParse,
    testStringify,
    testFileOperations,
    testValidationPass,
    testValidationFail,
    testRequiredFields,
    testDatabaseSchema,
    testApiSchema,
    testConfigComparison,
    testConfigMerge,
    testAnchorMerge,
    testFileStats,
    testErrorHandling,
    testCustomValidation,
    testEnumValidation,
  ];

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error: any) {
      failed++;
      console.error(`\n❌ ${test.name} 失败:`);
      console.error(`   ${error.message}`);
    }
  }

  cleanup();

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 测试结果：${passed} 通过，${failed} 失败\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// 执行测试
runTests().catch(console.error);

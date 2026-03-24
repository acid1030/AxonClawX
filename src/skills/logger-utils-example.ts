/**
 * Logger Utils 使用示例
 * 
 * 演示如何使用 logger-utils-skill.ts
 */

import { Logger, LogLevel, createLogger } from './logger-utils-skill';

// ============== 示例 1: 基础用法 ==============
function basicUsage() {
  console.log('\n=== 示例 1: 基础用法 ===\n');
  
  const logger = new Logger();
  
  logger.debug('这是一条调试消息');        // 不会输出 (默认级别 INFO)
  logger.info('应用启动成功');              // ✅ 输出
  logger.warn('内存使用率超过 80%');        // ✅ 输出
  logger.error('数据库连接失败');           // ✅ 输出
  logger.fatal('系统崩溃，紧急停止');       // ✅ 输出
}

// ============== 示例 2: 自定义配置 ==============
function customConfig() {
  console.log('\n=== 示例 2: 自定义配置 ===\n');
  
  const logger = new Logger({
    level: LogLevel.DEBUG,      // 输出所有级别
    module: 'AuthService',      // 模块名称
    colorful: true,             // 启用彩色输出
    timestamp: true,            // 显示时间戳
  });
  
  logger.debug('用户尝试登录', { username: 'admin', ip: '192.168.1.100' });
  logger.info('用户登录成功', { userId: 'u_12345' });
  logger.warn('密码尝试次数过多', { attempts: 3 });
}

// ============== 示例 3: 使用工厂函数 ==============
function factoryFunction() {
  console.log('\n=== 示例 3: 使用工厂函数 ===\n');
  
  const apiLogger = createLogger({
    level: LogLevel.INFO,
    module: 'API',
  });
  
  apiLogger.info('收到请求', { path: '/api/users', method: 'GET' });
  apiLogger.error('请求处理失败', { error: 'Timeout' });
}

// ============== 示例 4: 子日志器 ==============
function childLogger() {
  console.log('\n=== 示例 4: 子日志器 ===\n');
  
  const mainLogger = createLogger({
    level: LogLevel.DEBUG,
    module: 'App',
  });
  
  // 创建不同模块的子日志器
  const dbLogger = mainLogger.child('Database');
  const cacheLogger = mainLogger.child('Cache');
  const authLogger = mainLogger.child('Auth');
  
  dbLogger.info('数据库连接建立');
  cacheLogger.debug('缓存命中', { key: 'user_123' });
  authLogger.warn('Token 即将过期', { expiresIn: 300 });
}

// ============== 示例 5: 动态调整日志级别 ==============
function dynamicLevel() {
  console.log('\n=== 示例 5: 动态调整日志级别 ===\n');
  
  const logger = createLogger({
    level: LogLevel.INFO,
    module: 'Runtime',
  });
  
  logger.info('当前级别: INFO');
  logger.debug('这条不会显示');
  
  // 运行时调整级别
  logger.setLevel(LogLevel.DEBUG);
  logger.debug('现在调试消息也会显示了');
  
  // 生产环境只输出错误
  logger.setLevel(LogLevel.ERROR);
  logger.info('这条不会显示');
  logger.error('只有错误会输出');
}

// ============== 示例 6: 附加数据结构 ==============
function structuredData() {
  console.log('\n=== 示例 6: 附加数据结构 ===\n');
  
  const logger = createLogger({
    level: LogLevel.DEBUG,
    module: 'Payment',
  });
  
  // 记录复杂对象
  logger.info('支付请求', {
    orderId: 'ORD-20260313-001',
    amount: 299.00,
    currency: 'CNY',
    method: 'alipay',
    metadata: {
      userId: 'u_98765',
      items: ['商品 A', '商品 B'],
    },
  });
  
  // 记录错误堆栈
  logger.error('支付失败', {
    error: 'InsufficientFunds',
    code: 'PAY_001',
    stack: new Error().stack,
  });
}

// ============== 运行所有示例 ==============
function runAllExamples() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     Logger Utils 使用示例              ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  basicUsage();
  customConfig();
  factoryFunction();
  childLogger();
  dynamicLevel();
  structuredData();
  
  console.log('\n✅ 所有示例执行完成!\n');
}

// 导出示例函数 (供其他模块调用)
export {
  basicUsage,
  customConfig,
  factoryFunction,
  childLogger,
  dynamicLevel,
  structuredData,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

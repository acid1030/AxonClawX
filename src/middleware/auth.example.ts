/**
 * JWT 认证中间件使用示例
 * 
 * 展示如何使用 auth.ts 中的功能
 */

import {
  createAuthMiddleware,
  createPermissionMiddleware,
  signJWT,
  verifyJWT,
  refreshToken,
  checkPermission,
  generateHMACKey,
  generateRSAKeyPair,
  presets,
  type AuthConfig,
  type KeyConfig,
  type AuthContext,
} from './auth';

// ============================================
// 示例 1: 基础配置 - 开发环境
// ============================================

function example1_DevelopmentSetup() {
  console.log('=== 示例 1: 开发环境配置 ===\n');

  // 使用预定义的开发配置 (自动生成 HS256 密钥)
  const devConfig = presets.development();

  console.log('开发环境配置已创建');
  console.log('密钥类型：HS256');
  console.log('时钟容差：60 秒\n');

  return devConfig;
}

// ============================================
// 示例 2: 生产环境配置 - RS256
// ============================================

function example2_ProductionSetup() {
  console.log('=== 示例 2: 生产环境配置 ===\n');

  // 生成 RSA 密钥对
  const { publicKey, privateKey } = generateRSAKeyPair();

  // 使用预定义的生产配置
  const prodConfig = presets.production(publicKey, privateKey);

  console.log('生产环境配置已创建');
  console.log('密钥类型：RS256');
  console.log('时钟容差：30 秒\n');

  return { prodConfig, publicKey, privateKey };
}

// ============================================
// 示例 3: 签发 JWT Token
// ============================================

function example3_SignToken(config: AuthConfig) {
  console.log('=== 示例 3: 签发 JWT Token ===\n');

  const primarykey = config.keys.find(k => k.primary) || config.keys[0];

  // 创建用户 Token
  const token = signJWT(
    {
      sub: 'user-12345',           // 用户 ID
      role: 'user',                 // 用户角色
      email: 'user@example.com',    // 自定义字段
      permissions: [                // 权限列表
        {
          resource: 'articles',
          actions: ['read', 'write'],
        },
        {
          resource: 'comments',
          actions: ['read', 'write', 'delete'],
        },
      ],
    },
    primarykey,
    3600 // 1 小时过期
  );

  console.log('Token 已签发:');
  console.log(`${token.substring(0, 50)}...\n`);

  return token;
}

// ============================================
// 示例 4: 验证 JWT Token
// ============================================

function example4_VerifyToken(token: string, config: AuthConfig) {
  console.log('=== 示例 4: 验证 JWT Token ===\n');

  try {
    const payload = verifyJWT(token, config);

    console.log('Token 验证成功!');
    console.log('用户 ID:', payload.sub);
    console.log('角色:', payload.role);
    console.log('过期时间:', new Date(payload.exp * 1000).toISOString());
    console.log('签发时间:', new Date(payload.iat * 1000).toISOString());
    console.log('自定义字段 - Email:', payload.email);
    console.log('');
    
    return payload;
  } catch (error: any) {
    console.log('Token 验证失败:');
    console.log('错误代码:', error.code);
    console.log('错误信息:', error.message);
    if (error.expiredAt) {
      console.log('过期时间:', new Date(error.expiredAt).toISOString());
    }
    console.log('');
    throw error;
  }
}

// ============================================
// 示例 5: 刷新 Token
// ============================================

function example5_RefreshToken(token: string, config: AuthConfig) {
  console.log('=== 示例 5: 刷新 Token ===\n');

  const result = refreshToken(token, config, 7200); // 刷新为 2 小时

  if (result.success) {
    console.log('Token 刷新成功!');
    console.log('新 Token:', `${result.token?.substring(0, 50)}...`);
    console.log('新过期时间:', new Date(result.expiresAt!).toISOString());
  } else {
    console.log('Token 刷新失败:');
    console.log('错误:', result.error);
  }
  console.log('');

  return result;
}

// ============================================
// 示例 6: 权限检查
// ============================================

function example6_PermissionCheck(config: AuthConfig) {
  console.log('=== 示例 6: 权限检查 ===\n');

  // 先签发一个带权限的 Token
  const primarykey = config.keys.find(k => k.primary) || config.keys[0];
  const token = signJWT(
    {
      sub: 'user-67890',
      role: 'editor',
      permissions: [
        { resource: 'articles', actions: ['read', 'write'] },
        { resource: 'comments', actions: ['read'] },
      ],
    },
    primarykey,
    3600
  );

  // 验证并获取上下文
  const payload = verifyJWT(token, config);
  const context: AuthContext = {
    userId: payload.sub,
    role: payload.role,
    permissions: payload.permissions,
    payload,
  };

  // 检查不同权限
  const checks = [
    { resource: 'articles', action: 'read' },
    { resource: 'articles', action: 'delete' },
    { resource: 'comments', action: 'read' },
    { resource: 'users', action: 'delete' },
  ];

  checks.forEach(({ resource, action }) => {
    const result = checkPermission(context, resource, action);
    const status = result.allowed ? '✅ 允许' : '❌ 拒绝';
    console.log(`${status} - ${action} ${resource}`);
    if (!result.allowed && result.reason) {
      console.log(`   原因：${result.reason}`);
    }
  });
  console.log('');
}

// ============================================
// 示例 7: 在 Express 中使用
// ============================================

function example7_ExpressIntegration(config: AuthConfig) {
  console.log('=== 示例 7: Express 集成 ===\n');

  console.log(`
// 1. 引入中间件
import express from 'express';
import { createAuthMiddleware, createPermissionMiddleware } from './auth';

const app = express();

// 2. 配置认证中间件
const authMiddleware = createAuthMiddleware(config);

// 3. 保护路由 - 需要认证
app.get('/api/profile', authMiddleware, (req, res) => {
  // 访问用户信息
  const user = req.user; // AuthContext 类型
  res.json({
    userId: user.userId,
    role: user.role,
  });
});

// 4. 保护路由 - 需要特定权限
app.delete(
  '/api/articles/:id',
  authMiddleware,
  createPermissionMiddleware([
    { resource: 'articles', action: 'delete' }
  ]),
  (req, res) => {
    // 只有有删除权限的用户能访问
    res.json({ message: 'Article deleted' });
  }
);

// 5. 公开路由 (不需要认证)
app.get('/api/public', (req, res) => {
  res.json({ message: 'Public endpoint' });
});

console.log('Express 集成示例已输出');
  `);
  console.log('');
}

// ============================================
// 示例 8: 多密钥轮换配置
// ============================================

function example8_KeyRotation() {
  console.log('=== 示例 8: 多密钥轮换 ===\n');

  // 生成多个密钥
  const keys: KeyConfig[] = [
    {
      kid: 'key-2024-01',
      key: generateHMACKey(),
      type: 'HS256',
      primary: true, // 当前主密钥 (用于签名新 Token)
    },
    {
      kid: 'key-2023-12',
      key: generateHMACKey(),
      type: 'HS256',
      primary: false, // 旧密钥 (仍可用于验证旧 Token)
    },
    {
      kid: 'key-2023-11',
      key: generateHMACKey(),
      type: 'HS256',
      primary: false,
    },
  ];

  const rotationConfig = presets.rotation(keys);

  console.log('多密钥轮换配置已创建:');
  keys.forEach((key, index) => {
    const status = key.primary ? '(主密钥)' : '(验证密钥)';
    console.log(`  ${index + 1}. ${key.kid} ${status}`);
  });
  console.log('\n优势:');
  console.log('  - 可以无缝轮换密钥');
  console.log('  - 旧 Token 仍可验证');
  console.log('  - 新 Token 使用新密钥签名');
  console.log('');

  return rotationConfig;
}

// ============================================
// 示例 9: 自定义 Token 提取
// ============================================

function example9_CustomTokenExtraction() {
  console.log('=== 示例 9: 自定义 Token 提取 ===\n');

  console.log(`
// 默认从 Authorization Header 提取
// Header: "Authorization: Bearer <token>"

// 自定义 Header 名称
const customAuthMiddleware = createAuthMiddleware({
  ...config,
  tokenHeader: 'x-access-token',  // 从 X-Access-Token 提取
  tokenPrefix: 'Token ',          // 前缀为 "Token " 而非 "Bearer "
});

// 或者从 Cookie 提取 (需要自定义中间件)
function cookieAuthMiddleware(config: AuthConfig) {
  return (req, res, next) => {
    const token = req.cookies?.accessToken;
    if (!token) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    
    // 手动验证
    req.user = verifyJWT(token, config);
    next();
  };
}
  `);
  console.log('');
}

// ============================================
// 示例 10: 完整的登录/刷新流程
// ============================================

function example10_CompleteFlow() {
  console.log('=== 示例 10: 完整登录/刷新流程 ===\n');

  console.log(`
// 1. 用户登录 - 签发 Access Token + Refresh Token
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  // 验证用户名密码 (伪代码)
  const user = await validateCredentials(username, password);
  if (!user) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const primarykey = config.keys.find(k => k.primary)!;

  // 签发 Access Token (短期，1 小时)
  const accessToken = signJWT(
    {
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
    },
    primarykey,
    3600 // 1 小时
  );

  // 签发 Refresh Token (长期，7 天)
  const refreshToken = signJWT(
    {
      sub: user.id,
      type: 'refresh', // 标记为刷新令牌
    },
    primarykey,
    7 * 24 * 3600 // 7 天
  );

  res.json({
    accessToken,
    refreshToken,
    expiresIn: 3600,
  });
});

// 2. 刷新 Token
app.post('/api/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  const result = refreshToken(refreshToken, config, 3600);
  
  if (!result.success) {
    return res.status(401).json({ 
      error: 'REFRESH_FAILED',
      message: result.error 
    });
  }

  res.json({
    accessToken: result.token,
    expiresIn: 3600,
  });
});

// 3. 访问受保护资源
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'Access granted',
    user: req.user.userId,
  });
});
  `);
  console.log('');
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       JWT 认证中间件使用示例                           ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 示例 1: 开发环境
  const devConfig = example1_DevelopmentSetup();

  // 示例 2: 生产环境
  const { prodConfig } = example2_ProductionSetup();

  // 示例 3: 签发 Token
  const token = example3_SignToken(devConfig);

  // 示例 4: 验证 Token
  example4_VerifyToken(token, devConfig);

  // 示例 5: 刷新 Token
  example5_RefreshToken(token, devConfig);

  // 示例 6: 权限检查
  example6_PermissionCheck(devConfig);

  // 示例 7: Express 集成
  example7_ExpressIntegration(devConfig);

  // 示例 8: 密钥轮换
  example8_KeyRotation();

  // 示例 9: 自定义提取
  example9_CustomTokenExtraction();

  // 示例 10: 完整流程
  example10_CompleteFlow();

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       所有示例执行完成                                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');
}

// 导出示例函数供单独测试
export {
  example1_DevelopmentSetup,
  example2_ProductionSetup,
  example3_SignToken,
  example4_VerifyToken,
  example5_RefreshToken,
  example6_PermissionCheck,
  example7_ExpressIntegration,
  example8_KeyRotation,
  example9_CustomTokenExtraction,
  example10_CompleteFlow,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export default runAllExamples;

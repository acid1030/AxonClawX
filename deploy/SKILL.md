# Deploy Skill - 一键部署技能

> 支持本地预览、SSH 部署、Docker 部署，内置蓝绿部署、滚动更新、自动回滚能力

## 快速开始

```typescript
import { deploy, rollback } from './deployer.js';

// SSH 部署示例
await deploy('production', {
  target: 'ssh',
  host: 'server.example.com',
  user: 'deploy',
  privateKey: '~/.ssh/id_ed25519',
  path: '/var/www/app',
  buildCmd: 'npm run build',
  restartCmd: 'systemctl restart app',
  healthCheck: {
    enabled: true,
    url: 'http://localhost:3000/health',
    timeout: 30000,
    retries: 3
  },
  rollback: {
    enabled: true,
    keepReleases: 3
  }
});
```

## 部署目标

### 1. 本地预览 (Local)

用于开发环境的快速预览。

```typescript
await deploy('development', {
  target: 'local',
  buildCmd: 'npm run build',
  buildDir: './dist'
});
```

### 2. SSH 部署

支持三种策略：

#### 简单部署
```typescript
{
  target: 'ssh',
  strategy: 'simple',
  host: 'server.example.com',
  user: 'deploy',
  path: '/var/www/app',
  buildCmd: 'npm run build',
  restartCmd: 'systemctl restart app'
}
```

#### 蓝绿部署 (零停机)
```typescript
{
  target: 'ssh',
  strategy: 'blue-green',
  host: 'prod.example.com',
  user: 'deploy',
  path: '/var/www/app',
  buildCmd: 'npm run build',
  restartCmd: 'systemctl restart app',
  healthCheck: {
    enabled: true,
    url: 'http://localhost:3000/health',
    timeout: 60000,
    retries: 5
  }
}
```

#### 滚动更新
```typescript
{
  target: 'ssh',
  strategy: 'rolling',
  host: 'cluster.example.com',
  user: 'deploy',
  path: '/opt/app'
}
```

### 3. Docker 部署

```typescript
await deploy('production', {
  target: 'docker',
  imageName: 'myapp',
  containerName: 'myapp-container',
  registry: 'registry.example.com',
  buildDir: '.',
  healthCheck: {
    enabled: true,
    url: 'http://localhost:3000/health'
  }
});
```

## 配置选项

### 基础配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target` | `'local' \| 'ssh' \| 'docker'` | ✅ | 部署目标 |
| `strategy` | `'simple' \| 'blue-green' \| 'rolling'` | ❌ | 部署策略，默认 `simple` |
| `buildCmd` | `string` | ❌ | 构建命令 |
| `buildDir` | `string` | ❌ | 构建目录，默认 `.` |
| `restartCmd` | `string` | ❌ | 重启命令 |

### SSH 配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `host` | `string` | ✅ | SSH 主机地址 |
| `port` | `number` | ❌ | SSH 端口，默认 `22` |
| `user` | `string` | ✅ | SSH 用户名 |
| `password` | `string` | ❌ | SSH 密码（推荐用 privateKey） |
| `privateKey` | `string` | ❌ | SSH 私钥路径 |
| `path` | `string` | ✅ | 远程部署路径 |

### Docker 配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `imageName` | `string` | ✅ | Docker 镜像名 |
| `containerName` | `string` | ❌ | 容器名 |
| `registry` | `string` | ❌ | 镜像仓库地址 |

### 健康检查

```typescript
healthCheck: {
  enabled: true,
  url: 'http://localhost:3000/health',
  timeout: 30000,  // 超时时间 (ms)
  retries: 3       // 重试次数
}
```

### 回滚配置

```typescript
rollback: {
  enabled: true,
  keepReleases: 3  // 保留的历史版本数
}
```

## 回滚操作

```typescript
import { rollback } from './deployer.js';

// 回滚到指定版本
await rollback('production', config, 'v1709372400');
```

## 部署流程

### SSH 蓝绿部署流程

1. 上传新版本到 `releases/{version}` 目录
2. 在远程服务器执行构建命令
3. 执行健康检查（可选）
4. 原子切换 symlink (`current -> new version`)
5. 重启服务
6. 清理旧版本

### Docker 部署流程

1. 构建 Docker 镜像
2. 推送到镜像仓库（如果配置了 registry）
3. 停止并删除旧容器
4. 启动新容器
5. 执行健康检查（可选）

## 运行示例

```bash
cd skills/deploy

# 安装依赖
npm install

# 运行示例
npm run example local        # 本地部署
npm run example ssh-simple   # SSH 简单部署
npm run example ssh-bluegreen # SSH 蓝绿部署
npm run example docker       # Docker 部署
```

## API 参考

### `deploy(environment, config)`

**参数:**
- `environment` (string): 环境名称 (development, staging, production)
- `config` (DeployConfig): 部署配置

**返回:** `Promise<DeployResult>`

```typescript
interface DeployResult {
  success: boolean;
  version: string;
  timestamp: number;
  target: DeployTarget;
  strategy: DeployStrategy;
  duration: number;
  logs: string[];
  rollbackPoint?: string;
}
```

### `rollback(environment, config, releaseVersion)`

**参数:**
- `environment` (string): 环境名称
- `config` (DeployConfig): 部署配置
- `releaseVersion` (string): 要回滚的版本

**返回:** `Promise<void>`

## 最佳实践

### 1. 使用 SSH 密钥认证

```typescript
{
  target: 'ssh',
  user: 'deploy',
  privateKey: '~/.ssh/id_ed25519',
  // 不要使用 password
}
```

### 2. 始终启用健康检查

```typescript
{
  healthCheck: {
    enabled: true,
    url: 'https://your-app.com/health',
    timeout: 60000,
    retries: 5
  }
}
```

### 3. 生产环境使用蓝绿部署

```typescript
{
  target: 'ssh',
  strategy: 'blue-green',
  rollback: {
    enabled: true,
    keepReleases: 5
  }
}
```

### 4. 多环境配置

```typescript
const CONFIGS = {
  development: { target: 'local', buildCmd: 'npm run build:dev' },
  staging: { target: 'ssh', host: 'staging.example.com', ... },
  production: { target: 'ssh', strategy: 'blue-green', host: 'prod.example.com', ... }
};

await deploy(process.env.NODE_ENV, CONFIGS[process.env.NODE_ENV]);
```

## 故障排查

### SSH 连接失败

- 检查 SSH 密钥权限：`chmod 600 ~/.ssh/id_ed25519`
- 测试 SSH 连接：`ssh -i ~/.ssh/id_ed25519 user@host`
- 检查防火墙设置

### 健康检查失败

- 确认健康检查端点可访问
- 增加 timeout 和 retries
- 检查应用启动时间

### 回滚失败

- 确认历史版本目录存在
- 检查 symlink 权限
- 验证重启命令正确性

## 许可证

MIT © AxonClaw

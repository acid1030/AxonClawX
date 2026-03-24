# 🚀 Deploy Skill - 一键部署

> 优雅、可靠、零停机的部署解决方案

## ✨ 特性

- **多目标支持**: 本地预览、SSH 服务器、Docker 容器
- **部署策略**: 简单部署、蓝绿部署、滚动更新
- **自动回滚**: 部署失败自动回滚到上一版本
- **健康检查**: 部署后自动验证服务可用性
- **零停机**: 蓝绿部署确保服务持续可用
- **类型安全**: 完整的 TypeScript 类型定义

## 📦 安装

```bash
cd skills/deploy
npm install
```

## 🎯 快速使用

### 最简单的 SSH 部署

```typescript
import { deploy } from './deployer.js';

await deploy('production', {
  target: 'ssh',
  host: 'server.example.com',
  user: 'deploy',
  privateKey: '~/.ssh/id_ed25519',
  path: '/var/www/app',
  buildCmd: 'npm run build',
  restartCmd: 'systemctl restart app'
});
```

### 蓝绿部署 (推荐生产环境)

```typescript
await deploy('production', {
  target: 'ssh',
  strategy: 'blue-green',
  host: 'prod.example.com',
  user: 'deploy',
  privateKey: '~/.ssh/id_ed25519',
  path: '/var/www/app',
  buildCmd: 'npm run build',
  restartCmd: 'systemctl restart app',
  healthCheck: {
    enabled: true,
    url: 'http://localhost:3000/health',
    timeout: 60000,
    retries: 5
  },
  rollback: {
    enabled: true,
    keepReleases: 5
  }
});
```

### Docker 部署

```typescript
await deploy('production', {
  target: 'docker',
  imageName: 'myapp',
  containerName: 'myapp-container',
  registry: 'registry.example.com',
  buildDir: '.'
});
```

## 📚 文档

详细文档见 [SKILL.md](./SKILL.md)

## 🧪 运行示例

```bash
# 本地预览
npm run example local

# SSH 部署
npm run example ssh-simple
npm run example ssh-bluegreen

# Docker 部署
npm run example docker
```

## 🔧 配置说明

| 配置项 | 说明 | 必填 |
|--------|------|------|
| `target` | 部署目标：`local` / `ssh` / `docker` | ✅ |
| `strategy` | 部署策略：`simple` / `blue-green` / `rolling` | ❌ |
| `host` | SSH 服务器地址 | SSH 必填 |
| `user` | SSH 用户名 | SSH 必填 |
| `privateKey` | SSH 私钥路径 | SSH 推荐 |
| `path` | 远程部署路径 | SSH 必填 |
| `imageName` | Docker 镜像名 | Docker 必填 |
| `buildCmd` | 构建命令 | ❌ |
| `restartCmd` | 重启命令 | ❌ |
| `healthCheck` | 健康检查配置 | ❌ |
| `rollback` | 回滚配置 | ❌ |

## 🛡️ 安全建议

1. **使用 SSH 密钥**，不要使用密码
2. **启用健康检查**，确保部署后可用
3. **开启回滚**，自动恢复失败部署
4. **生产环境用蓝绿部署**，避免停机

## 📝 许可证

MIT © AxonClaw

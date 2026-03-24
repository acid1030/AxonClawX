# AxonClaw CLI

AxonClaw 命令行工具 - 系统状态查看、任务管理、Agent 控制、技能调用和部署功能

## 安装

```bash
cd /Users/nike/Documents/project/axonclaw
npm install
npm link
```

## 使用

### 核心命令

#### 查看系统状态
```bash
axon status
```

输出示例:
```
🜏 AxonClaw 系统状态

━━━ Gateway ━━━
  状态：🟢 运行中
  端口：ws://127.0.0.1:18789
  运行时间：2h 34m

━━━ Agents ━━━
  总数：5
  活跃：2
  空闲：3

━━━ Tasks ━━━
  待处理：3
  运行中：1
  已完成：127

━━━ Memory ━━━
  使用：256MB / 512MB (50%)
```

#### 查看任务队列
```bash
axon tasks list
```

#### 查看 Agent 状态
```bash
axon agents list
```

#### 查看可用技能
```bash
axon skills list
```

#### 部署应用
```bash
# 部署到开发环境
axon deploy development

# 部署到生产环境 (带构建)
axon deploy production --build

# 强制部署
axon deploy staging --force
```

### 技能调用

```bash
# Git 操作
axon skill git-ops commit -m "feat: add new feature"
axon skill git-ops push origin main

# 生成测试
axon skill test-gen ./src/user.ts
axon skill test-gen ./src/api.ts --coverage

# 生成文档
axon skill doc-gen ./src/api.ts
axon skill doc-gen ./src --output ./docs
```

### 分队管理

```bash
# 查看所有分队
axon divisions list

# 查看分队状态
axon divisions miiow status
axon divisions proj-x status

# 查看分队报告
axon divisions miiow reports
axon divisions research reports
```

## 命令参考

| 命令 | 描述 |
|------|------|
| `axon status` | 查看系统状态 |
| `axon tasks list` | 查看任务队列 |
| `axon agents list` | 查看 Agent 状态 |
| `axon skills list` | 查看可用技能 |
| `axon deploy <env>` | 部署应用 |
| `axon skill <name> [args...]` | 调用技能 |
| `axon divisions list` | 查看所有分队 |
| `axon divisions <name> status` | 查看分队状态 |
| `axon divisions <name> reports` | 查看分队报告 |

## 环境变量

- `AXON_GATEWAY_URL` - Gateway WebSocket 地址 (默认：ws://127.0.0.1:18789)
- `AXON_API_KEY` - API 密钥 (可选)
- `AXON_DEBUG` - 调试模式 (true/false)

## 开发

```bash
# 开发模式
npm run cli:dev

# 构建 CLI
npm run cli:build

# 测试
npm run cli:test
```

## 许可证

MIT

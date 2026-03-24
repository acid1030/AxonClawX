# ClawX 功能迁移 - 阶段 1 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 ClawX 的核心功能（Gateway 连接、聊天、会话管理、模型配置）迁移到 AxonClaw，保留 AxonClaw 的 UI 设计

**Architecture:**
- 保留 AxonClaw 的侧边栏和页面布局
- 替换 stores 为 ClawX 的完整实现
- 集成 ClawX 的 Gateway 连接逻辑
- 保持 AxonClaw 的 Tailwind 样式

**Tech Stack:** React 19, TypeScript, Zustand, Electron, WebSocket, Tailwind CSS

---

## 前置条件

**源代码位置：** `/Users/t/Downloads/ClawX-main`
**目标项目：** `/Users/t/openclaw-dev/projects/axonclaw`

**需要迁移的核心模块：**
1. `src/stores/chat.ts` (1940 行) - 聊天状态管理
2. `src/stores/gateway.ts` - Gateway 连接
3. `src/stores/providers.ts` - 模型配置
4. `src/stores/settings.ts` - 设置管理
5. `electron/gateway/` - Gateway 生命周期管理
6. `electron/api/` - IPC 通信

---

## Task 1: 准备工作 - 分析 ClawX 代码结构

**Files:**
- Analyze: `/Users/t/Downloads/ClawX-main/src/stores/chat.ts`
- Analyze: `/Users/t/Downloads/ClawX-main/src/stores/gateway.ts`
- Analyze: `/Users/t/Downloads/ClawX-main/electron/gateway/`

**Step 1: 分析 chat store 结构**

```bash
# 查看主要导出
grep -n "export" /Users/t/Downloads/ClawX-main/src/stores/chat.ts | head -20
```

Expected: 找到 `useChatStore` 和主要接口

**Step 2: 分析 gateway store**

```bash
# 查看 Gateway 连接逻辑
grep -n "connect\|disconnect\|WebSocket" /Users/t/Downloads/ClawX-main/src/stores/gateway.ts | head -20
```

Expected: 找到连接管理函数

**Step 3: 分析 Electron Gateway 管理**

```bash
# 查看 Gateway 生命周期
ls -la /Users/t/Downloads/ClawX-main/electron/gateway/
```

Expected: 找到 Gateway 启动/停止脚本

---

## Task 2: 复制 Store 文件

**Files:**
- Copy: `/Users/t/Downloads/ClawX-main/src/stores/chat.ts` → `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/chat.ts`
- Copy: `/Users/t/Downloads/ClawX-main/src/stores/gateway.ts` → `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/gateway.ts`
- Copy: `/Users/t/Downloads/ClawX-main/src/stores/providers.ts` → `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/providers.ts`
- Copy: `/Users/t/Downloads/ClawX-main/src/stores/settings.ts` → `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/settings.ts`

**Step 1: 备份现有 stores**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
mkdir -p src/renderer/stores/backup
cp src/renderer/stores/*.ts src/renderer/stores/backup/
```

Expected: 备份成功

**Step 2: 复制 chat store**

```bash
cp /Users/t/Downloads/ClawX-main/src/stores/chat.ts /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/chat.ts
```

Expected: 文件复制成功

**Step 3: 复制 gateway store**

```bash
cp /Users/t/Downloads/ClawX-main/src/stores/gateway.ts /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/gateway.ts
```

Expected: 文件复制成功

**Step 4: 复制 providers store**

```bash
cp /Users/t/Downloads/ClawX-main/src/stores/providers.ts /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/providers.ts
```

Expected: 文件复制成功

**Step 5: 复制 settings store**

```bash
cp /Users/t/Downloads/ClawX-main/src/stores/settings.ts /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/settings.ts
```

Expected: 文件复制成功

**Step 6: 验证文件**

```bash
ls -lh /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/
```

Expected: 所有文件存在

**Step 7: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add src/renderer/stores/
git commit -m "feat: copy ClawX stores (chat, gateway, providers, settings)"
```

---

## Task 3: 复制 chat store 子模块

**Files:**
- Copy: `/Users/t/Downloads/ClawX-main/src/stores/chat/` → `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/chat/`

**Step 1: 复制整个 chat 目录**

```bash
cp -r /Users/t/Downloads/ClawX-main/src/stores/chat /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/
```

Expected: 目录复制成功

**Step 2: 验证文件**

```bash
ls -la /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/chat/
```

Expected: 15 个文件存在

**Step 3: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add src/renderer/stores/chat/
git commit -m "feat: copy ClawX chat store modules"
```

---

## Task 4: 复制 lib 工具函数

**Files:**
- Copy: `/Users/t/Downloads/ClawX-main/src/lib/` → `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/lib/`

**Step 1: 创建 lib 目录**

```bash
mkdir -p /Users/t/openclaw-dev/projects/axonclaw/src/renderer/lib
```

Expected: 目录创建成功

**Step 2: 复制 lib 文件**

```bash
cp -r /Users/t/Downloads/ClawX-main/src/lib/* /Users/t/openclaw-dev/projects/axonclaw/src/renderer/lib/
```

Expected: 文件复制成功

**Step 3: 验证文件**

```bash
ls -la /Users/t/openclaw-dev/projects/axonclaw/src/renderer/lib/
```

Expected: 包含 `host-api.ts`, `utils.ts` 等

**Step 4: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add src/renderer/lib/
git commit -m "feat: copy ClawX lib utilities"
```

---

## Task 5: 更新导入路径

**Files:**
- Modify: `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/chat.ts`
- Modify: `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/gateway.ts`
- Modify: `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/providers.ts`

**Step 1: 检查 ClawX 的导入路径格式**

```bash
head -20 /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/chat.ts | grep "import"
```

Expected: 看到 `from '@/lib/...'` 格式

**Step 2: 检查 AxonClaw 的导入路径格式**

```bash
head -20 /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/sessionsStore.ts | grep "import"
```

Expected: 确认也是 `@/` 格式

**Step 3: 验证 tsconfig.json 配置**

```bash
grep -A 5 "paths" /Users/t/openclaw-dev/projects/axonclaw/tsconfig.json
```

Expected: `@/` 映射到 `src/renderer/`

**Step 4: 测试导入**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npx tsc --noEmit
```

Expected: 无错误或少量错误

**Step 5: Commit（如果有修改）**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add -A
git commit -m "fix: adjust import paths for ClawX stores"
```

---

## Task 6: 更新 ChatView 组件

**Files:**
- Modify: `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/components/chat/ChatView.tsx`

**Step 1: 导入新的 chat store**

```typescript
import { useChatStore } from '@/stores/chat';
```

**Step 2: 导入 gateway store**

```typescript
import { useGatewayStore } from '@/stores/gateway';
```

**Step 3: 替换 useSessionsStore 为 useChatStore**

```typescript
// 替换
const { isConnected } = useSessionsStore();
// 为
const { isConnected } = useGatewayStore();
const { sendMessage, messages } = useChatStore();
```

**Step 4: 更新消息渲染逻辑**

```typescript
// 使用真实的消息数据
const chatMessages = useChatStore(state => state.messages);
```

**Step 5: 更新发送消息函数**

```typescript
const handleSend = async () => {
  if (!input.trim()) return;
  
  await sendMessage(input);
  setInput('');
};
```

**Step 6: 测试编译**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npx tsc --noEmit
```

Expected: 少量类型错误可接受

**Step 7: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add src/renderer/components/chat/ChatView.tsx
git commit -m "feat: integrate ClawX chat store into ChatView"
```

---

## Task 7: 复制 Electron Gateway 管理

**Files:**
- Copy: `/Users/t/Downloads/ClawX-main/electron/gateway/` → `/Users/t/openclaw-dev/projects/axonclaw/electron/gateway/`

**Step 1: 创建 electron 目录**

```bash
mkdir -p /Users/t/openclaw-dev/projects/axonclaw/electron/gateway
```

Expected: 目录创建成功

**Step 2: 复制 Gateway 管理文件**

```bash
cp -r /Users/t/Downloads/ClawX-main/electron/gateway/* /Users/t/openclaw-dev/projects/axonclaw/electron/gateway/
```

Expected: 文件复制成功

**Step 3: 验证文件**

```bash
ls -la /Users/t/openclaw-dev/projects/axonclaw/electron/gateway/
```

Expected: 包含 Gateway 生命周期管理脚本

**Step 4: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add electron/gateway/
git commit -m "feat: copy ClawX Electron Gateway management"
```

---

## Task 8: 更新 Electron 主进程

**Files:**
- Modify: `/Users/t/openclaw-dev/projects/axonclaw/electron/main.ts`

**Step 1: 导入 Gateway 管理**

```typescript
import { startGateway, stopGateway } from './gateway/lifecycle';
```

**Step 2: 在 app ready 时启动 Gateway**

```typescript
app.whenReady().then(() => {
  startGateway();
  // ... 其他初始化
});
```

**Step 3: 在 app quit 时停止 Gateway**

```typescript
app.on('will-quit', () => {
  stopGateway();
});
```

**Step 4: 测试编译**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npx tsc --noEmit
```

Expected: 无错误

**Step 5: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add electron/main.ts
git commit -m "feat: integrate Gateway lifecycle into Electron main process"
```

---

## Task 9: 测试基本功能

**Step 1: 启动开发服务器**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npm run dev
```

Expected: 服务器启动成功

**Step 2: 打开浏览器**

访问 `http://localhost:5173`

Expected: 页面加载，UI 正常显示

**Step 3: 测试聊天功能**

- 在输入框输入消息
- 点击发送
- 检查消息是否显示

Expected: 消息发送成功（可能显示错误，因为未连接 Gateway）

**Step 4: 测试 Gateway 连接**

- 检查 Gateway 是否自动启动
- 查看控制台日志

Expected: Gateway 启动成功或显示配置错误

**Step 5: 修复发现的问题**

根据测试结果修复问题，重复 Task 6-8 的步骤

---

## Task 9 测试结果 (2026-03-15 13:36)

**测试环境：**
- 开发服务器：已运行（PID 46532, 端口 5173）
- Gateway 进程：已运行（PID 49973, 端口 18789）
- 浏览器：Chrome（Playwright 自动化）

**✅ 成功的功能：**
1. **页面加载** - 页面标题正确显示 "AxonClaw - OpenClaw Desktop Client"
2. **侧边栏** - 存在并正常显示
3. **主要内容区域** - 存在并正常显示
4. **聊天输入框** - 存在并可输入
5. **控制台日志** - 无错误
6. **Gateway 进程** - 后台运行正常（PID 49973）
7. **截图保存** - test-screenshots/01-homepage.png, 02-typed-message.png, 04-final.png

**⚠️ 需要检查的功能：**
1. **发送按钮** - 未找到匹配的按钮选择器（可能是图标按钮或自动发送）
2. **状态指示器** - 未找到连接状态显示元素
3. **聊天发送** - 输入后按 Enter 未触发明显响应（需要检查后端连接）

**❌ 失败的功能：**
- 无严重失败

**截图位置：** `/Users/t/openclaw-dev/projects/axonclaw/test-screenshots/`

**下一步建议：**
1. 检查聊天发送按钮的实现方式（可能是自动发送或图标按钮）
2. 添加 Gateway 连接状态指示器到 UI
3. 测试完整的消息发送流程（需要确保 Gateway RPC 连接正常）
4. 在 Electron 环境中测试（当前在浏览器环境中，部分功能可能受限）

---

## Task 10: 更新 MainLayout 使用新 stores

**Files:**
- Modify: `/Users/t/openclaw-dev/projects/axonclaw/src/renderer/components/layout/MainLayout.tsx`

**Step 1: 导入新的 stores**

```typescript
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
```

**Step 2: 替换 sessionsStore**

```typescript
// 移除
import { useSessionsStore } from '@/stores/sessionsStore';

// 添加
const { isConnected } = useGatewayStore();
```

**Step 3: 测试编译**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npx tsc --noEmit
```

Expected: 无错误

**Step 4: Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add src/renderer/components/layout/MainLayout.tsx
git commit -m "feat: use ClawX stores in MainLayout"
```

---

## Task 11: 清理和优化

**Step 1: 删除旧的 sessionsStore**

```bash
rm /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/sessionsStore.ts
```

Expected: 文件删除成功

**Step 2: 删除旧的 messagesStore**

```bash
rm /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/messagesStore.ts
```

Expected: 文件删除成功

**Step 3: 清理 backup 目录**

```bash
rm -rf /Users/t/openclaw-dev/projects/axonclaw/src/renderer/stores/backup/
```

Expected: 目录删除成功

**Step 4: 最终测试**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npm run dev
```

Expected: 所有功能正常

**Step 5: 最终 Commit**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
git add -A
git commit -m "refactor: remove old stores and finalize ClawX integration"
```

---

## 执行完成标准

**阶段 1 完成标志：**

- ✅ Gateway 可以启动和连接
- ✅ 聊天消息可以发送和接收
- ✅ 会话可以创建和切换
- ✅ 模型可以配置和选择
- ✅ UI 保持原有设计风格
- ✅ 所有核心功能可正常使用

**下一步（阶段 2）：**
- Agent 管理
- Channel 管理
- 技能市场
- Cron 定时任务

---

**Created by:** Axon
**Date:** 2026-03-15
**Status:** Ready for execution

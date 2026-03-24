# 技能集成框架 - 快速开始

> 5 分钟上手技能集成和调用框架

## 🚀 快速开始

### 1. 导入模块

```typescript
import { SkillRegistry, SkillInvoker } from './skills';
```

### 2. 创建注册表并扫描技能

```typescript
const registry = new SkillRegistry({
  skillsDir: '/Users/nike/.openclaw/workspace/src/renderer/skills',
  autoScan: true,
});

// 自动扫描并注册所有技能
await registry.scanAndRegister();
```

### 3. 创建调用器

```typescript
const invoker = new SkillInvoker({
  registry,
  enableLogging: true,
  defaultTimeout: 30000,
});
```

### 4. 调用技能

```typescript
// 调用 git-ops 的 status 命令
const result = await invoker.invoke('git-ops', 'status');

if (result.success) {
  console.log('仓库状态:', result.data);
} else {
  console.error('调用失败:', result.error);
}
```

---

## 📋 完整示例

```typescript
import { SkillRegistry, SkillInvoker } from './skills';

async function main() {
  // 1. 创建注册表
  const registry = new SkillRegistry({
    skillsDir: '/path/to/skills',
    autoScan: true,
  });

  // 2. 扫描技能
  await registry.scanAndRegister();
  console.log(`已注册 ${registry.count()} 个技能`);

  // 3. 创建调用器
  const invoker = new SkillInvoker({
    registry,
    enableLogging: true,
  });

  // 4. 调用技能 - 获取状态
  const status = await invoker.invoke('git-ops', 'status');
  if (status.success) {
    console.log('当前分支:', (status.data as any).branch);
  }

  // 5. 调用技能 - 提交代码
  const commit = await invoker.invoke('git-ops', 'commit', {
    message: 'feat: add new feature',
    all: true,
  });

  if (commit.success) {
    console.log('提交成功:', (commit.data as any).hash);
  } else {
    console.error('提交失败:', commit.error);
  }

  // 6. 查看统计
  const stats = invoker.getStats();
  console.log('调用统计:', stats);
}

main();
```

---

## 🎯 常用命令

### Git-Ops 技能

```typescript
// 获取状态
const status = await invoker.invoke('git-ops', 'status');

// 提交代码
const commit = await invoker.invoke('git-ops', 'commit', {
  message: 'feat: add feature',
  all: true,
});

// 智能提交
const smartCommit = await invoker.invoke('git-ops', 'smart-commit', {
  all: true,
});

// 推送代码
const push = await invoker.invoke('git-ops', 'push', {
  remote: 'origin',
  branch: 'main',
});

// 创建 PR
const pr = await invoker.invoke('git-ops', 'pr-create', {
  title: 'Feature: New Feature',
  body: 'Description...',
  branch: 'feature/new',
  base: 'main',
});
```

---

## 🔧 高级用法

### 批量调用

```typescript
const results = await invoker.batchInvoke([
  { skillName: 'git-ops', commandName: 'status' },
  { skillName: 'git-ops', commandName: 'commit', params: { message: 'update' } },
]);
```

### 并行调用

```typescript
const results = await invoker.parallelInvoke([
  { skillName: 'git-ops', commandName: 'status' },
  { skillName: 'git-ops', commandName: 'status' },
]);
```

### 带重试的调用

```typescript
const result = await invoker.invoke('git-ops', 'push', {}, {
  retries: 3,
  timeout: 10000,
});
```

### 查看日志

```typescript
const logs = invoker.getLogs(10); // 最近 10 条
logs.forEach(log => {
  console.log(`${log.skillName}.${log.commandName} - ${log.success ? '✓' : '✗'}`);
});
```

---

## 📊 技能管理

### 查看技能列表

```typescript
const skills = registry.getSkillSummaries();
skills.forEach(skill => {
  console.log(`${skill.name} v${skill.version} - ${skill.commandCount} 个命令`);
});
```

### 启用/禁用技能

```typescript
// 禁用技能
registry.setSkillEnabled('git-ops', false);

// 启用技能
registry.setSkillEnabled('git-ops', true);
```

### 检查技能是否存在

```typescript
if (registry.hasSkill('git-ops')) {
  console.log('git-ops 技能已注册');
}
```

---

## 🧪 运行测试

```bash
# 运行技能集成测试
npm test -- skill-integration.test.ts
```

---

## 📚 更多资源

- [SKILLS-LIST.md](./SKILLS-LIST.md) - 完整技能列表和 API 文档
- [examples.ts](./examples.ts) - 10 个完整使用示例
- [skill-registry.ts](./skill-registry.ts) - 技能注册表源码
- [skill-invoker.ts](./skill-invoker.ts) - 技能调用器源码

---

## ❓ 常见问题

### Q: 如何开发新技能？

A: 参考 [SKILLS-LIST.md](./SKILLS-LIST.md) 中的 "开发新技能" 章节。

### Q: 技能文件命名有什么要求？

A: 使用 `kebab-case`，如 `git-ops.ts`、`code-review.ts`。

### Q: 如何调试技能调用？

A: 启用日志记录 (`enableLogging: true`)，然后使用 `invoker.getLogs()` 查看调用历史。

### Q: 技能调用超时怎么办？

A: 在调用时指定 `timeout` 选项，或增加 `defaultTimeout` 配置。

---

**开始使用吧！** 🎉

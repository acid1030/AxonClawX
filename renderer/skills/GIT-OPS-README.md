# Git-Ops Skill 使用指南

🜏 **Git-Ops** - Git 操作技能，提供仓库状态查看、智能提交、代码推送和 PR 创建功能。

---

## 📦 安装

Git-Ops 技能已内置于 AxonClaw，无需额外安装。

```typescript
import { gitOps, GitOpsSkill } from '@/renderer/skills';
```

---

## 🚀 快速开始

### 1️⃣ 查看仓库状态

```typescript
import { gitOps } from '@/renderer/skills';

// 获取仓库状态
const status = await gitOps.getStatus();

console.log(`当前分支：${status.branch}`);
console.log(`领先：${status.ahead}, 落后：${status.behind}`);
console.log(`暂存文件：${status.staged.length}`);
console.log(`未暂存：${status.unstaged.length}`);
console.log(`未跟踪：${status.untracked.length}`);
console.log(`仓库是否干净：${status.clean}`);
```

**输出示例：**

```json
{
  "branch": "feature/auth",
  "ahead": 3,
  "behind": 0,
  "staged": [
    { "path": "src/auth/login.ts", "status": "A" },
    { "path": "src/auth/utils.ts", "status": "M" }
  ],
  "unstaged": [],
  "untracked": ["README.md"],
  "clean": false
}
```

---

### 2️⃣ 智能提交

#### 手动提交

```typescript
// 标准提交
const result = await gitOps.commit('feat: add user authentication');

if (result.success) {
  console.log(`提交成功：${result.hash}`);
} else {
  console.error(`提交失败：${result.error}`);
}
```

#### 自动提交（推荐）

```typescript
// 智能生成提交信息
const result = await gitOps.smartCommit({ all: true });

if (result.success) {
  console.log(`智能提交成功：${result.hash}`);
  console.log(`提交信息：${result.message}`);
} else {
  console.error(`提交失败：${result.error}`);
}
```

**智能提交信息生成规则：**

- `feat:` - 新增功能或修改代码
- `docs:` - 更新文档（.md 文件）
- `test:` - 更新测试文件
- `refactor:` - 重构或删除文件
- `chore:` - 其他杂项

---

### 3️⃣ 推送代码

```typescript
// 推送到默认 remote (origin) 和当前分支
const result = await gitOps.push();

// 推送到指定 remote 和分支
const result2 = await gitOps.push('upstream', 'develop');

if (result.success) {
  console.log(`推送到 ${result.remote}/${result.branch} 成功`);
} else {
  console.error(`推送失败：${result.error}`);
}
```

---

### 4️⃣ 创建 Pull Request

```typescript
import { gitOps } from '@/renderer/skills';

const prResult = await gitOps.createPullRequest({
  title: 'feat: 添加用户认证模块',
  body: `
## 变更说明
- 实现登录/注册功能
- 添加 JWT 令牌验证
- 集成 OAuth2.0

## 测试
- [x] 单元测试通过
- [x] 集成测试通过
`,
  branch: 'feature/auth',
  base: 'main', // 可选，默认为 'main'
});

if (prResult.success) {
  console.log(`PR 创建成功！`);
  console.log(`PR URL: ${prResult.url}`);
  console.log(`PR 编号：${prResult.number}`);
} else {
  console.error(`PR 创建失败：${prResult.error}`);
}
```

---

## 🔧 高级用法

### 自定义配置

```typescript
import { GitOpsSkill } from '@/renderer/skills';

const gitOps = new GitOpsSkill({
  workspaceRoot: '/path/to/your/project',
  defaultBase: 'develop',
  autoSync: true,
});
```

### 组合使用示例

```typescript
async function publishFeature() {
  // 1. 检查仓库状态
  const status = await gitOps.getStatus();
  
  if (status.clean) {
    console.log('✅ 工作区干净，无需提交');
    return;
  }

  // 2. 智能提交
  const commitResult = await gitOps.smartCommit({ all: true });
  if (!commitResult.success) {
    throw new Error(`提交失败：${commitResult.error}`);
  }
  console.log(`✅ 提交成功：${commitResult.hash}`);

  // 3. 推送代码
  const pushResult = await gitOps.push();
  if (!pushResult.success) {
    throw new Error(`推送失败：${pushResult.error}`);
  }
  console.log(`✅ 推送成功到 ${pushResult.remote}/${pushResult.branch}`);

  // 4. 创建 PR
  const prResult = await gitOps.createPullRequest({
    title: commitResult.message || 'Feature update',
    body: `Auto-generated PR for ${commitResult.hash}`,
    branch: status.branch,
  });

  if (prResult.success) {
    console.log(`🎉 PR 创建成功：${prResult.url}`);
  }
}
```

### 检查 Git 环境

```typescript
// 检查 Git 是否可用
const isGitAvailable = await gitOps.isGitAvailable();
if (!isGitAvailable) {
  console.error('❌ Git 未安装或不在 PATH 中');
}

// 检查是否在 Git 仓库中
const isInRepo = await gitOps.isInGitRepo();
if (!isInRepo) {
  console.error('❌ 当前目录不是 Git 仓库');
}
```

---

## 📊 API 参考

### GitStatus

```typescript
interface GitStatus {
  branch: string;           // 当前分支名
  ahead: number;            // 领先远程的提交数
  behind: number;           // 落后远程的提交数
  staged: FileChange[];     // 已暂存的文件
  unstaged: FileChange[];   // 未暂存的文件
  untracked: string[];      // 未跟踪的文件
  clean: boolean;           // 工作区是否干净
}
```

### FileChange

```typescript
interface FileChange {
  path: string;   // 文件路径
  status: string; // 状态：A(新增), M(修改), D(删除), R(重命名)
}
```

### CommitResult

```typescript
interface CommitResult {
  success: boolean;  // 是否成功
  hash?: string;     // 提交哈希
  message?: string;  // 提交信息
  error?: string;    // 错误信息
}
```

### PushResult

```typescript
interface PushResult {
  success: boolean;  // 是否成功
  remote?: string;   // 远程仓库名
  branch?: string;   // 分支名
  error?: string;    // 错误信息
}
```

### PullRequestResult

```typescript
interface PullRequestResult {
  success: boolean;  // 是否成功
  url?: string;      // PR URL
  number?: number;   // PR 编号
  error?: string;    // 错误信息
}
```

---

## 🧪 运行测试

```bash
# 运行所有测试
npm test -- git-ops

# 运行测试并生成覆盖率
npm run test:coverage -- git-ops

# 以 UI 模式运行测试
npm run test:ui -- git-ops
```

---

## ⚠️ 注意事项

1. **依赖 Git**: 确保系统已安装 Git 并配置在 PATH 中
2. **依赖 gh CLI**: 创建 PR 功能需要 GitHub CLI (`gh`)，可选
3. **远程仓库**: 推送和 PR 功能需要配置远程仓库
4. **权限**: 确保有推送和创建 PR 的权限

---

## 🛠️ 故障排除

### "Git 未找到"

```bash
# 安装 Git
brew install git  # macOS
sudo apt install git  # Linux
```

### "gh CLI 未找到"

```bash
# 安装 GitHub CLI
brew install gh  # macOS
sudo apt install gh  # Linux
```

### "认证失败"

```bash
# 配置 Git 凭证
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 配置 GitHub Token
gh auth login
```

---

## 📝 示例场景

### 场景 1: 日常开发流程

```typescript
// 早上开始工作
const status = await gitOps.getStatus();
console.log(`昨天落后 ${status.behind} 个提交`);

// 拉取最新代码（需要自己实现 pull）
// await exec('git pull');

// 工作完成后提交
await gitOps.smartCommit({ all: true });

// 下班前推送
await gitOps.push();
```

### 场景 2: 发布新功能

```typescript
async function releaseFeature(featureName: string) {
  // 创建功能分支
  // await exec(`git checkout -b feature/${featureName}`);
  
  // ... 开发功能 ...
  
  // 提交所有变更
  const commitResult = await gitOps.smartCommit({ all: true });
  
  // 推送到远程
  await gitOps.push();
  
  // 创建 PR
  const prResult = await gitOps.createPullRequest({
    title: `feat: ${featureName}`,
    body: `Implement ${featureName} feature`,
    branch: `feature/${featureName}`,
    base: 'main',
  });
  
  console.log(`PR 已创建：${prResult.url}`);
}
```

### 场景 3: 批量提交多个仓库

```typescript
const repos = ['/path/to/repo1', '/path/to/repo2', '/path/to/repo3'];

for (const repoPath of repos) {
  const gitOps = new GitOpsSkill({ workspaceRoot: repoPath });
  
  if (await gitOps.isInGitRepo()) {
    const status = await gitOps.getStatus();
    if (!status.clean) {
      await gitOps.smartCommit({ all: true });
      await gitOps.push();
      console.log(`✅ ${repoPath} 已更新`);
    }
  }
}
```

---

## 🎯 最佳实践

1. **使用智能提交**: 让 AI 生成规范的提交信息
2. **小步提交**: 频繁提交，每次提交专注一个功能点
3. **推送前检查**: 推送前查看仓库状态
4. **PR 描述详细**: 创建 PR 时提供清晰的变更说明
5. **错误处理**: 始终检查操作结果的 `success` 字段

---

**🜏 AxonClaw Git-Ops Skill** - 让 Git 操作更优雅

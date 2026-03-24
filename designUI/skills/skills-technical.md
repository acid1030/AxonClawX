# 技能技术细节

> 技能文件结构、配置和技术信息

---

## 📁 技能目录结构

```
/Users/t/openclaw-dev/skills/
├── skill-name/
│   ├── SKILL.md          # 技能说明文档
│   ├── package.json      # 技能元数据
│   ├── scripts/          # 脚本文件
│   └── docs/             # 详细文档
```

---

## 🔧 技能加载机制

### 1. 自动加载

OpenClaw 启动时自动加载 `~/openclaw-dev/skills/` 目录下的所有技能。

### 2. 激活触发

技能通过以下方式激活：
- **关键词匹配**: 用户消息中的触发词
- **显式调用**: 用户明确指定技能名
- **上下文推断**: AI 根据任务自动选择

### 3. 优先级

当多个技能匹配时：
1. 更具体的技能优先
2. 最近使用的技能优先
3. 评分更高的技能优先

---

## 📋 核心技能配置

### 浏览器自动化

#### playwright-browser-automation (推荐)
```javascript
// 标准用法
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  // ... 操作
  await browser.close();
})();
```

**路径**: `/Users/t/openclaw-dev/skills/playwright-browser-automation/`

---

### AI 图像生成

#### ai-image-generation
**API**: inference.sh CLI
**模型**: FLUX, Gemini, Grok, Seedream, Reve 等 50+

**配置**: 需要 inference.sh API Key

---

#### baoyu-image-gen
**API**: OpenAI / Google / DashScope
**特点**: 支持 reference images

---

### 内容发布

#### baoyu-post-to-wechat
**方式**: API 或 Chrome CDP
**路径**: `/Users/t/openclaw-dev/skills/baoyu-post-to-wechat/`

**脚本**: 
```bash
# 发布文章
~/.openclaw/skills/baoyu-post-to-wechat/scripts/publish.sh
```

---

#### baoyu-post-to-x
**方式**: Chrome CDP (绕过反自动化)
**路径**: `/Users/t/openclaw-dev/skills/baoyu-post-to-x/`

---

### MCP 服务

#### mcporter
**用途**: MCP 服务器 CLI 管理
**命令**:
```bash
# 列出服务器
mcporter list

# 调用工具
mcporter call <server> <tool>
```

---

## 🔑 API Keys 配置

### 图像生成
```bash
# inference.sh (ai-image-generation)
export INFERENCE_API_KEY="your-key"

# OpenAI (baoyu-image-gen)
export OPENAI_API_KEY="your-key"

# DashScope
export DASHSCOPE_API_KEY="your-key"
```

### 语音服务
```bash
# ElevenLabs (sag)
export ELEVENLABS_API_KEY="your-key"

# OpenAI Whisper
export OPENAI_API_KEY="your-key"
```

### 搜索服务
```bash
# Tavily
export TAVILY_API_KEY="your-key"

# Brave Search
export BRAVE_API_KEY="your-key"
```

---

## 📊 技能依赖关系

### 内容创作链
```
copywriting
    ↓
baoyu-cover-image → baoyu-article-illustrator
    ↓
baoyu-post-to-wechat / baoyu-post-to-x
```

### 开发流程链
```
brainstorming
    ↓
writing-plans → code
    ↓
test-patterns → systematic-debugging
    ↓
clean-code-review → prepare-pr
```

### 浏览器自动化链
```
playwright-browser-automation
    ↓ (失败时降级)
browser-automation
    ↓ (失败时降级)
browser-use
```

---

## 🛠️ 技能开发

### 创建新技能

使用 `skill-creator` 技能：
```
"创建一个新技能，用于 XXX 功能"
```

**技能结构**:
```
my-skill/
├── SKILL.md          # 必需
├── package.json      # 必需
├── scripts/
│   └── main.sh
└── docs/
    └── README.md
```

### SKILL.md 格式

```markdown
# Skill Name

description: 简短描述
triggers: 触发词1, 触发词2

## 功能

...

## 使用方法

...

## 配置

...
```

---

## 📈 性能优化

### 1. 减少技能数量

只保留常用技能，定期清理不用的技能。

### 2. 使用子代理

大量任务使用 `sessions_spawn` 分散到子代理。

### 3. 控制浏览器资源

- 标签页 ≤ 10 个
- 完成后关闭
- 使用 headless 模式

---

## 🔍 调试技巧

### 查看技能日志
```bash
# 技能执行日志
tail -f ~/.openclaw/logs/skills.log

# 会话日志
~/.openclaw/skills/session-logs/scripts/search.sh "关键词"
```

### 测试技能
```bash
# 进入技能目录
cd ~/openclaw-dev/skills/skill-name

# 运行测试脚本
./scripts/test.sh
```

---

## 📚 技能更新

### 从 ClawHub 更新
```bash
# 更新单个技能
clawhub update skill-name

# 更新所有技能
clawhub update --all
```

### 手动更新
```bash
cd ~/openclaw-dev/skills/skill-name
git pull
```

---

## 🗑️ 技能卸载

```bash
# 删除技能目录
rm -rf ~/openclaw-dev/skills/skill-name

# 重启 OpenClaw
openclaw gateway restart
```

---

## 📊 技能统计

| 指标 | 值 |
|------|-----|
| 总技能数 | 178 |
| 有 SKILL.md | ~170 |
| 有 scripts | ~50 |
| 有 docs | ~30 |

---

## 🔗 相关文件

- **技能总览**: `SKILLS-OVERVIEW.md`
- **分类详情**: `skills-by-category.md`
- **使用指南**: `skills-usage-guide.md`
- **本文档**: `skills-technical.md`

---

*最后更新: 2026-03-15*

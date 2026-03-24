# 技能使用指南

> 如何高效使用 OpenClaw 技能

---

## 🚀 快速开始

### 1. 技能自动激活

大多数技能会在检测到相关关键词时**自动激活**，无需手动调用。

**示例**:
```
用户: "帮我生成一张图片"
系统: 自动激活 ai-image-generation 或 baoyu-image-gen
```

### 2. 技能发现

如果不确定使用哪个技能，可以：
- 询问: "有什么技能可以做 XXX？"
- 搜索: "搜索 XXX 相关的技能"

---

## 🎯 常用场景

### 内容创作

| 任务 | 推荐技能 | 示例指令 |
|------|----------|----------|
| AI 绘图 | `ai-image-generation` | "用 FLUX 生成一张赛博朋克城市" |
| 文章封面 | `baoyu-cover-image` | "为这篇文章生成封面图" |
| 小红书图片 | `baoyu-xhs-images` | "把这个做成小红书笔记图片" |
| PPT 制作 | `pptx` | "根据这份文档生成 PPT" |
| 营销文案 | `copywriting` | "写一个产品落地页文案" |

### 开发工作

| 任务 | 推荐技能 | 示例指令 |
|------|----------|----------|
| 代码审查 | `clean-code-review` | "审查这段代码的质量" |
| 调试 Bug | `systematic-debugging` | "这个测试失败了，帮我调试" |
| 写测试 | `test-patterns` | "为这个函数写单元测试" |
| Git 操作 | `git-essentials` | "如何解决这个 merge conflict" |

### 浏览器自动化

| 任务 | 推荐技能 | 示例指令 |
|------|----------|----------|
| 网页截图 | `playwright-browser-automation` | "截取这个网站的首屏" |
| 填表单 | `browser-use` | "帮我填写这个注册表单" |
| 数据采集 | `browser-automation` | "从这个网站提取价格信息" |

### 社交媒体

| 任务 | 推荐技能 | 示例指令 |
|------|----------|----------|
| 微信公众号 | `baoyu-post-to-wechat` | "把这篇文章发布到微信公众号" |
| X/Twitter | `baoyu-post-to-x` | "发一条推文" |
| 小红书 | `baoyu-xhs-images` | "生成小红书笔记图片" |

---

## 💡 最佳实践

### 1. 浏览器自动化优先级

```
playwright-browser-automation > browser-automation > browser-use/MCP
```

**原因**: Playwright 直接 API 最稳定，避免 MCP 服务器不稳定问题。

### 2. 创意工作流程

```
brainstorming → planning → execution → review
```

**必须**: 创建功能前先使用 `brainstorming` 探索需求。

### 3. 代码开发流程

```
writing-plans → executing-plans → systematic-debugging → clean-code-review
```

### 4. 安全审计流程

```
security-auditor → audit-code → audit-website
```

---

## ⚠️ 注意事项

### 1. 技能依赖

某些技能需要外部依赖：
- **MCP 技能**: 需要配置 MCP 服务器
- **浏览器技能**: 需要安装 Playwright
- **语音技能**: 需要配置 API Key

### 2. API Key 管理

涉及外部 API 的技能需要配置 Key：
- `ai-image-generation`: inference.sh API
- `sag`: ElevenLabs API
- `gemini`: Google AI API
- `tavily-search`: Tavily API

### 3. 浏览器资源管理

遵守系统规则：
- 标签页 ≤ 10 个
- 完成后立即关闭
- 避免长时间会话

---

## 🔧 技能组合

### 完整内容创作流程

```
1. copywriting → 写营销文案
2. baoyu-cover-image → 生成封面
3. baoyu-article-illustrator → 添加插图
4. baoyu-post-to-wechat → 发布到微信
```

### 完整开发流程

```
1. brainstorming → 需求探索
2. writing-plans → 编写计划
3. code → 代码实现
4. test-patterns → 编写测试
5. clean-code-review → 代码审查
6. prepare-pr → 准备 PR
```

### 完整市场研究流程

```
1. mckinsey-research → 市场分析
2. marketing-ideas → 营销策略
3. content-strategy → 内容策略
4. social-content → 社媒内容
```

---

## 📚 进阶用法

### 子代理并行开发

使用 `sessions_spawn` 创建最多 3 个子代理并行处理独立任务。

**示例**:
```
"同时开发用户模块、订单模块、支付模块"
```

### 会话管理

- `session-manager`: 会话状态持久化
- `session-logs`: 搜索历史会话
- `reflection`: 工作前自评估

### 自我进化

- `self-evolve`: 自主修改配置
- `self-improving`: 自我反思改进
- `learning-hooks`: 自动学习模式

---

## 🆘 故障排除

### 技能未激活

1. 检查技能是否安装: `ls ~/openclaw-dev/skills/`
2. 尝试使用触发词
3. 明确指定技能名: "使用 XXX 技能"

### API 错误

1. 检查 API Key 配置
2. 检查网络连接
3. 查看错误日志

### 浏览器问题

1. 使用 `playwright-browser-automation` 替代 MCP
2. 控制标签页数量
3. 重启浏览器会话

---

## 📖 学习资源

- **ClawHub**: https://clawhub.com - 发现新技能
- **OpenClaw Docs**: https://docs.openclaw.ai - 官方文档
- **GitHub**: https://github.com/openclaw/openclaw - 源码
- **Discord**: https://discord.com/invite/clawd - 社区

---

*最后更新: 2026-03-15*

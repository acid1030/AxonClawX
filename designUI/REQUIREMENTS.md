# AxonClaw 设计需求整理

> 基于 docs 文档、原型稿、流水线任务清单整理  
> 更新时间：2026-03-14

---

## 一、产品定位

**AxonClaw** = AI 驱动的全渠道智能运营平台

- 目标用户：中小企业、自媒体创作者、电商运营、企业团队
- 核心价值：傻瓜式操作 + 专家级能力 + 生态化扩展
- 差异化：多 Agent 协作 + 智能内容工厂 + 插件生态 + shadcn/ui Mac 风格

---

## 二、设计规范（来自 DESIGN_GUIDELINES.md）

### 2.1 Mac 系统风格

- 图标：SF Symbols 风格，lucide-react 简洁线条
- 尺寸：16px / 20px / 24px
- 深色模式优先

### 2.2 颜色系统

| 用途 | 色值 |
|------|------|
| 主背景 | #000000 |
| 次级背景 | #1c1c1e |
| 卡片背景 | #2c2c2e |
| 浮层 | #3a3a3c |
| 边框 | #3a3a3c / #48484a |
| 主文字 | #ffffff |
| 次要文字 | #8e8e93 |
| 提示文字 | #636366 |
| 强调色 | #0a84ff |
| 成功 | #30d158 |
| 错误 | #ff453a |
| 警告 | #ff9f0a |

### 2.3 布局

- 三列布局：侧边栏 72-260px | 主内容 自适应 | 右面板 320px（可折叠）
- 间距：4px 网格（8/12/16/24/32）
- 圆角：按钮 6-8px，卡片 10-12px

---

## 三、页面/视图清单（来自 PIPELINE + 原型）

### 3.1 入口流程

| 页面 | 说明 | 参考 |
|------|------|------|
| Onboarding | 5 步引导：欢迎→Gateway→模型→Agent→完成 | onboarding.html |

### 3.2 主应用视图

| 视图 | 说明 | 原型参考 |
|------|------|----------|
| Dashboard | 项目看板、里程碑、Agent 状态、任务、活动 | dashboard.html, demo.html |
| Chat | 聊天中心、消息列表、输入框、流式响应 | axonclaw-prototype, demo |
| Agents | Agent 列表、详情、创建/编辑表单 | agent-manager.html |
| Channels | Channel 列表、配置向导 | channel-wizard.html |
| Memory | 记忆列表、语义搜索、记忆卡片 | - |
| Content Factory | 模板选择、参数表单、生成预览 | axonclaw-prototype 模板中心 |
| Multi-Agent | 工作流可视化、节点状态、执行历史 | axonclaw-prototype 子代理 |
| Skills | 技能市场、分类、安装/卸载 | - |
| Cron | 定时任务、CronBuilder、执行历史 | - |
| Diagnostics | 诊断项、HealthDot、一键修复 | axonclaw-prototype 系统诊断 |
| Settings | 主题、隐私、Provider、系统参数 | - |

### 3.3 组件需求

| 组件 | 说明 | 来源 |
|------|------|------|
| StepWizard | 多步骤向导 | ClawDeckX, onboarding |
| HealthDot | 健康状态指示 | ClawDeckX 综合分析 |
| StatCard | 统计卡片 | ClawDeckX |
| ConfigDiffView | 配置对比 | ClawDeckX |
| CronBuilder | Cron 表达式 | ClawDeckX, 已有 |
| ToolsCatalog | 技能目录 | ClawDeckX |

---

## 四、导航结构

```
侧边栏
├── 主导航
│   ├── 仪表板
│   ├── 聊天中心
│   ├── Agent 管理
│   ├── Channel 管理
│   ├── 记忆系统
│   ├── 内容工厂
│   ├── 多 Agent 工作流
│   ├── 技能市场
│   ├── 定时任务
│   ├── 对话管理
│   ├── 日志
│   ├── 模板中心
│   └── 插件平台
├── 快捷入口
│   ├── Agent 角色库
│   ├── Channel 管理
│   └── 诊断工具
└── 底部
    ├── 系统设置
    └── 连接状态 (HealthDot)
```

---

## 五、设计稿文件

| 文件 | 说明 |
|------|------|
| axonclaw-design.html | 主设计稿（含所有视图切换） |
| design-system.html | 设计系统与组件参考 |

---

*整理自：AXONCLAW_FEATURE_SPEC, DESIGN_GUIDELINES, PIPELINE_TASK_LIST, 各原型 HTML*

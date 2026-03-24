# ClawDeckX 菜单复刻计划

> 根据 ClawDeckX 启动器/主菜单的 16 个功能入口，在 AxonClaw 中补齐缺失菜单并复刻功能。

## 一、菜单映射表

| 图中菜单 (中文) | AxonClaw ID | 状态 | 说明 |
|-----------------|-------------|------|------|
| 概览仪表盘 | dashboard | ✅ 已有 | DashboardView |
| 知识中心 | knowledge | ✅ 已有 | KnowledgeView |
| 安装向导 | install | 🆕 新增 | 分步安装引导 |
| 配置中心 | config | 🆕 新增 | 可视化配置 OpenClaw |
| 用量统计 | usage | ✅ 已有 | UsageView |
| 使用向导 | guide | 🆕 新增 | 功能引导/新手教程 |
| 网关监控 | gateway-monitor | 🆕 新增 | 网关状态、流量、日志 |
| 审批中心 | approval | 🆕 新增 | 审批列表、详情、操作 |
| 系统设置 | system | ✅ 已有 | SystemView |
| AI 会话 | chat | ✅ 已有 | ChatView |
| 智能代理 | agent | ✅ 已有 | AgentsView |
| 节点管理 | nodes | ✅ 已有 | NodesView |
| 活动监控 | activity | ✅ 已有 | ActivityMonitorView |
| 调度任务 | cron | ✅ 已有 | CronView |
| 技能中心 | skill | ✅ 已有 | Skills |
| 健康中心 | health | ✅ 已有 | SystemView (diagnostic tab) |

## 二、待新增菜单 (5 项)

### 1. 安装向导 (install)
- **前端**: `InstallationWizardView.tsx` — 分步安装引导 (Gateway → 模型 → Agent → 完成)
- **后端**: 无独立 API，复用现有 `/api/gateway/*`、`/api/host-info` 等
- **参考**: ClawDeckX SetupWizard、StepWizard 组件

### 2. 配置中心 (config)
- **前端**: `ConfigurationCenterView.tsx` — 配置分类导航、JSON 编辑器、ConfigDiffView
- **后端**: 透传 Gateway `config.get` / `config.set` RPC，或主进程 `/api/config`
- **参考**: ClawDeckX Editor、ConfigDiffView

### 3. 使用向导 (guide)
- **前端**: `UsageWizardView.tsx` — 配置完成度、分步引导、场景模板
- **后端**: 聚合 `/api/doctor/summary`、`/api/agents` 等计算完成度
- **参考**: ClawDeckX 使用向导、配置完成度

### 4. 网关监控 (gateway-monitor)
- **前端**: `GatewayMonitoringView.tsx` — 网关状态、连接数、流量、日志流
- **后端**: 复用 `/api/gateway/health`、`/api/logs`、Gateway RPC
- **参考**: ClawDeckX Gateway 窗口

### 5. 审批中心 (approval)
- **前端**: `ApprovalCenterView.tsx` — 审批列表、详情、通过/拒绝
- **后端**: 透传 Gateway `approvals.list`、`approvals.approve` 等 RPC（若 OpenClaw 支持）
- **参考**: ClawDeckX 审批中心

## 三、实现顺序

1. **Phase 1**: 添加 5 个菜单项 + 占位视图 + 路由
2. **Phase 2**: 更新侧边栏标签为图中中文
3. **Phase 3**: 逐项复刻 ClawDeckX 功能（前端 UI + 后端 API）

## 四、后端技术说明

- **ClawDeckX 后端**: Go (internal/handlers, internal/gateway)
- **AxonClaw 后端**: Node.js/TypeScript (src/main/index.ts)
- **翻译原则**: Go handler → Node 主进程 HTTP 路由；Go 结构体 → TypeScript 接口；数据库/外部调用按现有 axonclaw 架构实现

# ClawDeckX → AxonClaw 迁移计划

> 按 ClawDeckX 的页面样式、布局和功能模块，在 AxonClaw 中复刻实现。调用逻辑使用 AxonClaw 框架重写；OpenClaw 原生能力直接调用；Go 后端用 Node/Electron 重写。

**⚠️ 约束：不改变 AxonClaw 技术架构**（Electron + hostApiFetch + 侧边栏单视图）

## 一、架构对比

| 维度 | ClawDeckX | AxonClaw |
|------|-----------|----------|
| 后端 | Go (cmd/clawdeckx, internal/web) | Node.js + Electron 主进程 |
| 前端 | React + Vite (web/) | React + Vite |
| 样式 | Tailwind + material-symbols | Tailwind + lucide-react |
| API | REST `/api/v1/*` | hostApiFetch `/api/*` + IPC |
| 路由 | 多窗口 (Desktop + WindowFrame) | 侧边栏 (UnifiedSidebar) + 单视图 |

## 二、页面映射

| ClawDeckX 窗口 | AxonClaw 视图 | 优先级 | 说明 |
|----------------|---------------|--------|------|
| Dashboard | DashboardView | P0 | 主仪表盘，优先复刻 |
| Gateway | GatewayView / LogsView | P1 | 网关状态、日志、事件 |
| Agents | AgentsView | ✅ 已做 | ClawDeckX 风格已接入 |
| Sessions | SessionsView | P1 | 会话列表 |
| Skills | Skills | ✅ 已做 | 布局已调整 |
| Editor | SettingsView / 配置编辑 | P2 | 配置编辑器 |
| Doctor | DiagnosticsView | P2 | 健康检查 |
| Scheduler | CronView | P2 | Cron 任务 |
| Activity | ActivityView | P2 | 活动流 |
| Alerts | AlertsView | P2 | 告警 |
| Usage | UsageView | P2 | 使用统计 |
| Settings | SettingsView | P2 | 设置 |
| Knowledge | MemoryView | P2 | 知识库 |
| SetupWizard | Wizard | P3 | 安装向导 |

## 三、Dashboard 详细复刻计划

### 3.1 ClawDeckX Dashboard 布局结构

```
┌─────────────────────────────────────────────────────────────────┐
│ 顶部彩色条 (健康分数)                                              │
├─────────────────────────────────────────────────────────────────┤
│ 标题 + 刷新倒计时 + 刷新按钮                                        │
├─────────────────────────────────────────────────────────────────┤
│ 资源告警 (CPU/内存/磁盘 >90%)                                      │
├─────────────────────────────────────────────────────────────────┤
│ Gateway 状态 Hero 卡片                                            │
│   - 状态图标、运行/停止、WS 连接、uptime、host:port                │
│   - 启动/停止/重启 按钮                                            │
│   - 今日成本 MiniSparkline                                        │
├─────────────────────────────────────────────────────────────────┤
│ KPI 卡片 7 列 (可点击跳转)                                         │
│   Sessions | Today Tokens | Total Cost | Models | Skills | Agents | Instances │
├─────────────────────────────────────────────────────────────────┤
│ 安全审计卡片 (可选)                                                │
├─────────────────────────────────────────────────────────────────┤
│ 主机信息卡片                                                      │
│   - CPU / Memory / Disk GaugeCard                                │
│   - 内存详情、环境变量                                             │
├─────────────────────────────────────────────────────────────────┤
│ 系统健康 + 告警 (2:1 布局)                                        │
│  左: 健康状态、异常统计、Provider 健康、成本趋势图                   │
│  右: 最近告警、7 天 Token 汇总                                     │
├─────────────────────────────────────────────────────────────────┤
│ 已连接实例 (可选)                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 最近会话                                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 API 映射 (ClawDeckX → AxonClaw)

| ClawDeckX API | AxonClaw 实现 | 说明 |
|---------------|---------------|------|
| `dashboardApi.get()` | 主进程 `GET /api/dashboard` 或聚合 | 新建 dashboard 聚合接口 |
| `gwApi.status()` | 已有 `useGatewayStore` 或 gateway 状态 | 直接复用 |
| `gwApi.sessions()` | `sessions.list` IPC | 已有 |
| `gwApi.models()` | 主进程 `GET /api/models` 或 Gateway RPC | 需查现有 |
| `gwApi.skills()` | `useSkillsStore` / Gateway 技能 | 已有 |
| `gwApi.agents()` | `useAgentsStore` | 已有 |
| `gwApi.cronStatus()` | `useCronStore` | 已有 |
| `gwApi.channels()` | `useChannelsStore` | 已有 |
| `gwApi.usageCost()`, `gwApi.health()` | 主进程新接口 | 需实现 |
| `hostInfoApi.get()` | 主进程 `GET /api/host-info` | 需实现 (Node os/cpu) |
| `gatewayApi.start/stop/restart()` | `invokeIpc('gateway:restart')` | 已有 |
| `doctorApi.summaryCached()` | 主进程 `GET /api/doctor/summary` | 可选 |
| `gatewayProfileApi.list()` | 主进程或 Gateway | 可选 |

### 3.3 需新增的主进程 API

```typescript
// src/main/index.ts 或 host-api 路由

// 1. 主机信息 (Node.js 实现)
GET /api/host-info
  → os.platform(), os.arch(), os.cpus(), os.hostname()
  → 内存: process.memoryUsage()
  → 磁盘: 可用 node 获取磁盘信息库

// 2. Dashboard 聚合 (可选，用于一次请求)
GET /api/dashboard
  → 聚合 gateway 状态、sessions 数量、模型数等

// 3. 使用成本 (若 Gateway 有)
GET /api/usage-cost?days=7
  → 转发 Gateway 或本地统计

// 4. 健康检查
GET /api/health
  → Gateway 连接状态或健康检查结果
```

### 3.4 Dashboard 组件复用

| ClawDeckX 组件 | AxonClaw 实现 |
|----------------|---------------|
| `HealthDot` | 内联 div 或新建 `StatusDot` |
| `MiniSparkline` | 新建 `MiniSparkline` 或简化版 |
| `GaugeCard` | 新建 `GaugeCard` |
| `openWindow(id)` | `onNavigateTo?.(viewId)` |

## 四、实现阶段

### Phase 1: Dashboard 复刻 (P0)

1. **布局**：按 ClawDeckX 结构重排 DashboardView
2. **Gateway Hero**：状态、uptime、WS、启动/停止/重启
3. **KPI 卡片**：7 列，点击跳转对应视图
4. **主机信息**：实现 `/api/host-info`，GaugeCard 展示 CPU/内存/磁盘
5. **系统健康**：Gateway、Channels、Cron、Agents 状态卡片
6. **最近会话**：已有会话列表，样式对齐
7. **最近告警**：若有告警数据则展示，否则占位

### Phase 2: 其他页面布局与样式

1. **Sessions**：按 ClawDeckX Sessions 布局
2. **Gateway/Logs**：按 ClawDeckX Gateway 事件/日志面板
3. **Settings/Editor**：配置编辑区块结构

### Phase 3: 后端补齐

1. 实现 `/api/host-info`
2. 实现 `/api/dashboard` 聚合（可选）
3. 实现 `/api/usage-cost`（若 Gateway 支持）
4. Doctor 诊断接口（可选）

### Phase 4: 细节与优化

1. 自动刷新、骨架屏、缓存策略
2. 国际化（i18n）
3. 错误与部分失败提示

## 五、技术约束

- **图标**：ClawDeckX 用 `material-symbols-outlined`，AxonClaw 用 `lucide-react`，需做图标映射
- **颜色**：ClawDeckX 用 `mac-green`、`mac-red` 等，可用 Tailwind 近似色
- **布局**：ClawDeckX 为多窗口，AxonClaw 为侧边栏单视图，跳转用 `onNavigateTo` 替代 `openWindow`

## 六、下一步行动

1. 实现 `/api/host-info` 主进程接口
2. 新建 `GaugeCard`、`MiniSparkline`、`HealthDot` 等通用组件
3. 重写 `DashboardView` 布局与样式，对齐 ClawDeckX
4. 接入真实数据（gateway、sessions、agents、channels、cron 等）

---

*文档版本: 2026-03-17*

# AxonClaw 开发计划（整合版）

> **文档版本**: v1.0  
> **创建时间**: 2026-03-14  
> **目的**: 整合 docs 下重复/冲突的规划文档，明确用户最终需求与真实开发进度

---

## 一、用户最终需求（核心目标）

### 1.1 产品定位

**AxonClaw** = AI 驱动的全渠道智能运营平台

| 维度 | 目标 |
|------|------|
| **愿景** | 让每个人和企业都能拥有自己的 AI 数字员工团队 |
| **使命** | 降低 AI 使用门槛，提升全渠道运营效率 10 倍以上 |
| **目标用户** | 中小企业、自媒体创作者、电商运营、企业团队 |
| **核心价值** | 傻瓜式操作 + 专家级能力 + 生态化扩展 |

### 1.2 四大差异化竞争力（优先级排序）

```
1. 多 Agent 协作系统     → 技术壁垒（ClawX/OpenClaw 无）
2. 智能内容工厂         → 垂直场景（自媒体/电商刚需）
3. 插件平台生态         → 长期扩展
4. shadcn/ui + Mac 风格 → 开发效率
```

### 1.3 功能范围（精简版）

**基础层**（继承 ClawX，补齐到 100%）：
- 聊天交互、AI Provider 配置、定时任务、技能市场、Gateway

**增强层 P0**（核心短板）：
- 社交/办公平台集成（微信/QQ/飞书）
- 多 Agent 协作系统
- 记忆系统增强
- Channel 管理可视化
- 诊断工具

**提升层 P1**：
- 数据备份恢复、对话管理增强、开发者工具、监控日志

**差异化层 P2**：
- 多媒体内容工厂、工作流模板中心、插件管理平台、企业级功能、云端运行

---

## 二、真实开发进度（截至 2026-03-14）

### 2.1 文档与代码的差异说明

| 文档声称 | 实际情况 |
|----------|----------|
| 记忆用 ChromaDB | **实际用 LanceDB**（嵌入式，无需独立服务） |
| 进度 65% | 需按模块重新评估 |
| 代码量 ~1000 行 | 实际 120+ TS/TSX 文件，约 2 万行 |

### 2.2 已实现模块（代码验证）

| 模块 | 状态 | 证据 |
|------|------|------|
| **SQLite 数据库** | ✅ 完成 | `renderer/db/database.ts` - agents/sessions/messages/channels/skills/user_preferences/memories 表 |
| **向量记忆 (LanceDB)** | ✅ 完成 | `renderer/memory/vector-memory.ts` - 语义检索、CRUD、批量导入导出 |
| **三层记忆架构** | ✅ 完成 | L1 short-term + L2 mid-term + L3 vector-memory |
| **记忆管理 UI** | ✅ 完成 | MemoryView.tsx, MemoryCard.tsx, MemorySearch.tsx |
| **Agent 管理** | ✅ 完成 | AgentList, AgentForm, agentsStore, agentsService |
| **内容工厂服务** | ✅ 完成 | content-factory.ts, content-templates.ts, workflow-templates.ts |
| **多 Agent 视图** | ✅ 完成 | MultiAgentView.tsx, WorkflowVisualizer.tsx, agent-orchestrator.ts |
| **Channel 管理** | ✅ 完成 | ChannelManagementView, ChannelManager, TelegramChannel |
| **服务层** | ✅ 完成 | agents, sessions, skills, messages, memories, channels, gateway |
| **Chat 界面** | ✅ 完成 | ChatView, MessageBubble, MessageInput |
| **Dashboard** | ✅ 完成 | DashboardView |
| **Cron 构建器** | ✅ 完成 | CronBuilder.tsx |
| **技能系统** | ✅ 完成 | skill-registry, skill-discovery, skill-invoker |

### 2.3 部分实现 / 待完善

| 模块 | 状态 | 缺口 |
|------|------|------|
| **Gateway 真实连接** | 🔄 部分 | 有 mock-gateway-client，需对接真实 OpenClaw Gateway |
| **技能市场** | 🔄 60% | UI 需完善，与技能服务打通 |
| **定时任务** | 🔄 30% | Cron 构建器有，执行/调度集成待做 |
| **诊断工具** | ⚪ 0% | 未开始 |

### 2.4 未开始

| 模块 | 说明 |
|------|------|
| 社交/办公平台集成 | 微信/QQ/飞书等 |
| Electron 打包 | 可运行，未打包 |
| 数据备份恢复 | - |
| 对话全文搜索/导出 | - |
| 开发者工具 | API 调试、Webhook 管理 |
| 插件平台 | - |

### 2.5 进度估算（修正后）

```
整体功能完整度：约 55-60%

基础层（继承 ClawX）：     ████████░░ 80%
增强层 P0：               ████░░░░░░ 40%
  - 多 Agent：            ██████░░░░ 60%（有编排器+视图，缺工作流执行）
  - 记忆系统：            ████████░░ 80%（LanceDB+UI 完成）
  - Channel：             ███████░░░ 70%（有管理+Telegram，缺向导）
  - 诊断工具：            ░░░░░░░░░░ 0%
提升层 P1：               ██░░░░░░░░ 20%
差异化层 P2：             ███░░░░░░░ 30%（内容工厂服务有，UI/模板待完善）
```

---

## 三、技术栈确认（与文档一致）

| 层级 | 技术 |
|------|------|
| 框架 | Electron 33+ |
| 前端 | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| 状态 | Zustand |
| 通信 | WebSocket (ws://127.0.0.1:18789) |
| 数据库 | SQLite (better-sqlite3) |
| 向量记忆 | **LanceDB**（非 ChromaDB，嵌入式） |
| 核心 | OpenClaw Gateway |

---

## 四、整合后的开发计划

> **可执行任务清单**：详见 [PIPELINE_TASK_LIST.md](./PIPELINE_TASK_LIST.md) — 流水线式任务编排、依赖关系、竞品精华集成、逐项验收标准。

### 4.1 流水线阶段概览

| 阶段 | 周期 | 里程碑 | 核心任务 |
|------|------|--------|----------|
| **Stage 1** 基础打通 | 1-2 周 | v0.2 Alpha | Onboarding、Gateway 连接、技能市场、定时任务 |
| **Stage 2** 体验完善 | 2-3 周 | 对标 ClawX | 记忆+Chat、Channel 向导、国际化、诊断工具 |
| **Stage 3** 差异化核心 | 3-4 周 | v0.3 Beta | 内容工厂 UI、多 Agent 工作流、Electron 打包 |
| **Stage 4** 生态扩展 | 4-8 周 | v0.4+ | 插件平台、社交集成、备份恢复、对话增强 |

### 4.2 第一阶段（1-3 个月）

**目标**：功能完整度 55% → 80%

1. **社交/办公集成**（6 周）：微信/QQ/飞书接入
2. **多 Agent 协作**（5 周）：任务路由、消息总线、协作引擎
3. **记忆系统增强**（3 周）：MEMORY.md 编辑、日志管理、压缩策略
4. **Channel 可视化**（4 周）：各平台配置向导、状态监控、DM 配对
5. **诊断工具**（2 周）：系统诊断、一键修复

### 4.3 第二阶段（3-6 个月）

**目标**：80% → 90%

- 数据备份恢复、对话管理增强、开发者工具
- 多媒体内容工厂（文章/视频/图片生成）
- 工作流模板中心

### 4.4 第三阶段（6-12 个月）

**目标**：90% → 100%

- 插件管理平台、企业级功能、云端运行选项

---

## 五、文档整合建议

### 5.1 保留并作为主文档

| 文档 | 用途 |
|------|------|
| **AXONCLAW_FEATURE_SPEC.md** | 功能规格主文档 |
| **AXONCLAW_ARCHITECTURE.md** | 架构设计主文档 |
| **DEVELOPMENT_PLAN_CONSOLIDATED.md** | 开发计划主文档（本文档） |
| **PIPELINE_TASK_LIST.md** | 流水线任务清单（可执行、含竞品精华） |

### 5.2 需更新的文档

| 文档 | 更新内容 |
|------|----------|
| **DATABASE_MEMORY_PLAN.md** | ChromaDB → LanceDB，与实现一致 |
| **PROJECT_STATUS.md** | 按本文档修正进度与模块状态 |
| **TASK_TRACKER.md** | 与 DEVELOPMENT_PLAN 对齐，去重 |

### 5.3 可归档或合并的文档

| 文档 | 建议 |
|------|------|
| EXECUTION_PLAN.md | 合并入 DEVELOPMENT_PLAN，Sprint 细节保留 |
| AXONCLAW_ROADMAP.md | 保留路线图，与本文档阶段对应 |
| DIFFERENTIATION_PLAN.md | 合并入 FEATURE_SPEC 的差异化章节 |
| COMPREHENSIVE_ANALYSIS.md | 归档到 analysis/，作参考 |
| plans/2026-03-11-electron-migration-design.md | 归档，迁移已完成 |

---

## 六、待解决问题清单

| 问题 | 优先级 | 说明 |
|------|--------|------|
| 双 renderer 路径 | P1 | `src/renderer/` 与 `renderer/` 并存，需统一入口与构建 |
| npm 依赖 | P0 | 确保 better-sqlite3、@lancedb/lancedb 在 Electron 环境可用 |
| Gateway 对接 | P0 | 替换 mock，对接真实 OpenClaw Gateway |
| 文档与实现一致 | P2 | 更新 DATABASE_MEMORY_PLAN 等文档 |

---

## 七、总结

### 用户最终需求

- **产品**：AI 驱动的全渠道智能运营平台
- **差异化**：多 Agent 协作 + 智能内容工厂 + 插件生态
- **技术**：Electron + React + OpenClaw，LanceDB 向量记忆

### 真实进度

- **已完成**：数据库、LanceDB 记忆、记忆 UI、Agent 管理、内容工厂服务、多 Agent 视图、Channel 管理、Chat、Dashboard
- **进行中**：Gateway 连接、技能市场、定时任务
- **未开始**：社交集成、诊断工具、备份恢复、插件平台

### 下一步行动

1. 打通 Gateway 真实连接
2. 完善多 Agent 工作流执行链路
3. 搭建内容工厂基础 UI
4. 更新 DATABASE_MEMORY_PLAN 等文档（ChromaDB→LanceDB）

---

*文档版本：v1.0*  
*创建时间：2026-03-14*

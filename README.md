# AxonClawX

AxonClawX 是基于 Electron + React 19 + TypeScript 的 OpenClaw 桌面客户端，提供多代理协作、配置中心、技能市场、知识中心、网关监控与系统管理能力。

## 核心特性

- React 19 前端架构，桌面端统一体验
- 配置中心（模型、渠道、会话、模板、Hooks、Gateway 等）
- 代理管理与多代理协作流程
- 技能中心（skills/tools/plugins/市场）
- 知识中心（FAQ、Snippet、Tip、Recipe）
- 监控与诊断（网关状态、事件流、告警、活动监控）
- 全局国际化（中英文切换）

## 功能模块

### 1. 概览与对话
- `Dashboard`：运行态总览、关键指标
- `Chat`：会话管理、消息交互、新会话创建
- `Sessions`：历史会话与上下文切换

### 2. 配置中心
- `ConfigurationCenter`：统一配置入口
- 子模块：
  - `ModelsSection`（模型配置）
  - `ChannelsSection`（渠道与连接）
  - `AgentsSection`（代理关联配置）
  - `TemplatesSection`（模板管理）
  - `HooksSection`（扩展 Hook）
  - `GatewaySection`（网关参数）
  - `SessionSection`（会话参数）
  - `MemorySection`（记忆策略）
  - `ToolsSection` / `ExtensionsSection`（工具与扩展）
  - `MiscSection`、`LoggingSection`、`CommandsSection` 等

### 3. 代理与协作
- `Agents`：代理列表与详情管理
- `Workflow`：多代理工作流编排与执行
- `Nodes`：节点管理与拓扑视图
- `Cron`：定时任务配置与执行历史

### 4. 技能与知识
- `Skills`：技能、工具、插件与市场接入
- `Knowledge`：知识条目检索、分组浏览、知识统计
- `Memory`：记忆内容与上下文沉淀

### 5. 监控与系统
- `GatewayMonitoring`：网关服务状态、事件、调试面板
- `ActivityMonitor` / `Alerts` / `Diagnostics`：活动、告警、诊断
- `System` / `Settings` / `Usage`：系统设置、通用配置、使用统计

## 技术栈

- Electron 33
- React 19
- TypeScript 5
- Vite 5
- Zustand
- i18next / react-i18next
- Tailwind CSS + Radix UI

## 本地开发

```bash
npm install
npm run electron:dev
```

## 构建

```bash
npm run electron:build
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:linux
```

## 开源协议

本项目采用 [MIT License](./LICENSE)。

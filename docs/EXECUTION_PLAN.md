# AxonClaw 第一阶段执行计划

> 生成时间: 2026-03-12
> 生成者: AXON 🜏
> 目标: 功能完整度 55% → 80%

---

## 当前状态

- **代码量**: ~1000 行 TypeScript/TSX
- **已有模块**: Electron框架、聊天界面、状态管理、Gateway客户端
- **待开发**: Agent管理、Channel配置、记忆系统、诊断工具

---

## 任务分配

### Sprint 1 (本周) - 基础UI框架

```
┌─────────────────────────────────────────────────────────┐
│  任务: Agent 管理界面                                    │
│  负责人: ZARA (fullstack-dev)                           │
│  协作: LUNA (设计), ARIA (需求)                          │
│  交付物:                                                │
│    - Agent 列表页面                                     │
│    - Agent 创建/编辑表单                                │
│    - Agent 详情面板                                     │
│  预计: 3天                                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  任务: 侧边栏导航重构                                    │
│  负责人: ZARA (fullstack-dev)                           │
│  协作: LUNA (设计)                                       │
│  交付物:                                                │
│    - 多视图导航                                         │
│    - 会话/Agent/Channel/设置 切换                       │
│  预计: 1天                                              │
└─────────────────────────────────────────────────────────┘
```

### Sprint 2 (下周) - 核心功能

```
┌─────────────────────────────────────────────────────────┐
│  任务: Channel 配置向导                                  │
│  负责人: DANTE (backend) + ZARA (frontend)              │
│  协作: ARIA (需求)                                       │
│  交付物:                                                │
│    - Telegram 配置向导                                  │
│    - Discord 配置向导                                   │
│    - 配置状态展示                                       │
│  预计: 4天                                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  任务: 记忆系统可视化                                    │
│  负责人: ZARA (fullstack-dev)                           │
│  协作: KAEL (架构)                                       │
│  交付物:                                                │
│    - MEMORY.md 查看器                                   │
│    - 记忆搜索功能                                       │
│    - 记忆编辑器                                         │
│  预计: 3天                                              │
└─────────────────────────────────────────────────────────┘
```

### Sprint 3 (第3周) - 增强功能

```
┌─────────────────────────────────────────────────────────┐
│  任务: 诊断工具                                          │
│  负责人: ATLAS (devops)                                  │
│  协作: CIPHER (安全), REX (测试)                         │
│  交付物:                                                │
│    - 系统诊断面板                                       │
│    - 一键修复功能                                       │
│    - 健康状态展示                                       │
│  预计: 3天                                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  任务: Gateway 增强接口                                  │
│  负责人: DANTE (backend)                                 │
│  协作: KAEL (架构)                                       │
│  交付物:                                                │
│    - Agent CRUD API                                     │
│    - Channel 管理 API                                   │
│    - 诊断 API                                           │
│  预计: 4天                                              │
└─────────────────────────────────────────────────────────┘
```

---

## 本周立即执行

### 优先级 P0

1. **提交当前变更** - 立即
2. **创建 Agent 管理界面** - ZARA
3. **重构侧边栏导航** - ZARA

### 优先级 P1

4. **Channel 配置向导** - DANTE + ZARA
5. **记忆系统可视化** - ZARA

---

## 文件规划

```
src/renderer/
├── components/
│   ├── agents/           # NEW: Agent 管理组件
│   │   ├── AgentList.tsx
│   │   ├── AgentCard.tsx
│   │   ├── AgentForm.tsx
│   │   └── AgentDetail.tsx
│   ├── channels/         # NEW: Channel 配置组件
│   │   ├── ChannelList.tsx
│   │   ├── ChannelWizard.tsx
│   │   └── ChannelStatus.tsx
│   ├── memory/           # NEW: 记忆系统组件
│   │   ├── MemoryViewer.tsx
│   │   ├── MemoryEditor.tsx
│   │   └── MemorySearch.tsx
│   ├── diagnostics/      # NEW: 诊断工具组件
│   │   ├── DiagnosticsPanel.tsx
│   │   └── HealthStatus.tsx
│   ├── layout/
│   │   └── MainLayout.tsx  # MODIFY: 添加多视图
│   └── chat/             # EXISTING
├── views/
│   ├── ChatView.tsx      # EXISTING
│   ├── AgentsView.tsx    # NEW
│   ├── ChannelsView.tsx  # NEW
│   ├── MemoryView.tsx    # NEW
│   └── SettingsView.tsx  # NEW
└── stores/
    ├── sessionsStore.ts  # EXISTING
    ├── agentsStore.ts    # NEW
    └── channelsStore.ts  # NEW
```

---

## 验收标准

- [ ] Agent 界面可以创建/编辑/删除 Agent
- [ ] 侧边栏可以切换不同视图
- [ ] Channel 配置向导可以配置 Telegram
- [ ] 记忆系统可以查看/搜索 MEMORY.md
- [ ] 诊断工具可以检测系统状态

---

*AXON 🜏 签发*

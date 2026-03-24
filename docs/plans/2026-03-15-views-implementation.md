# AxonClaw 视图组件实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将设计稿中的所有视图内容迁移到 React 组件

**Architecture:** 
- 每个视图独立组件（Dashboard/Chat/Agents/Channels 等）
- 复用设计稿的样式和布局
- 使用 Lucide 图标替代 Emoji

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide React

---

## 视图清单（16个）

| # | 视图 | 优先级 | 说明 |
|---|------|--------|------|
| 1 | Dashboard | 🔴 P0 | 主面板（统计卡片 + 进度） |
| 2 | Chat | 🔴 P0 | 对话界面（已部分完成） |
| 3 | Agents | 🔴 P0 | Agent 管理 |
| 4 | Channels | 🟡 P1 | 渠道管理 |
| 5 | Memory | 🟡 P1 | 记忆管理 |
| 6 | Content | 🟡 P1 | 内容创作 |
| 7 | Workflow | 🟡 P1 | 工作流 |
| 8 | Skills | 🟡 P1 | 技能市场 |
| 9 | Models | 🟡 P1 | 模型管理 |
| 10 | Cron | 🟡 P1 | 定时任务 |
| 11 | Diagnostics | 🟢 P2 | 诊断工具 |
| 12 | Sessions | 🟢 P2 | 会话管理 |
| 13 | Logs | 🟢 P2 | 系统日志 |
| 14 | Settings | 🟢 P2 | 系统设置 |
| 15 | Templates | 🟢 P2 | 模板管理 |
| 16 | Plugins | 🟢 P2 | 插件管理 |

---

## Task 1: 更新 Dashboard 视图

**Files:**
- Modify: `src/renderer/views/DashboardView.tsx`

**Step 1: 更新 DashboardView 组件**

查看设计稿中的 Dashboard 内容，包含：
- Topbar（标题 + 搜索框 + 按钮）
- 统计卡片（4列布局）
- 进度卡片（带百分比进度条）

```typescript
/**
 * AxonClaw - Dashboard View
 * 项目仪表板 - 实时监控项目进度与 Agent 状态
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Clock,
  Plus,
  Play,
  Search
} from 'lucide-react';

const DashboardView: React.FC = () => {
  const stats = [
    { 
      label: '整体进度', 
      value: '58%', 
      change: '+5% 本周',
      color: 'blue',
      progress: 58
    },
    { 
      label: '活跃 Agent', 
      value: '6/24', 
      change: 'Gateway 正常',
      color: 'green',
      progress: 25
    },
    { 
      label: '会话数', 
      value: '142', 
      change: '+23 今日',
      color: 'purple',
      progress: 85
    },
    { 
      label: '任务队列', 
      value: '18', 
      change: '运行中 3',
      color: 'amber',
      progress: 15
    },
  ];

  const recentActivities = [
    { user: 'AXON', action: '创建开发计划', time: '14:30', avatar: 'A' },
    { user: 'ZARA', action: '完成代码审查', time: '14:15', avatar: 'Z' },
    { user: 'BLAZE', action: '部署生产环境', time: '13:45', avatar: 'B' },
    { user: 'MIA', action: '更新文档', time: '12:20', avatar: 'M' },
  ];

  const channelProgress = [
    { name: '会话系统', progress: 80 },
    { name: 'Agent 管理', progress: 65 },
    { name: 'Channel 管理', progress: 70 },
    { name: '诊断工具', progress: 0 },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">项目仪表板</h1>
          <p className="text-sm text-white/60 mt-1">实时监控项目进度与 Agent 状态</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input 
              type="text"
              placeholder="搜索会话、模板、日志..."
              className="pl-10 pr-4 py-2 w-64 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm">新建会话</span>
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors">
            <Play className="w-4 h-4" />
            <span className="text-sm font-medium">运行任务</span>
          </button>
        </div>
      </div>

      {/* Stats Cards - 4 Columns */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative overflow-hidden rounded-xl p-5
              ${stat.color === 'blue' ? 'bg-blue-500/10 border border-blue-500/20' : ''}
              ${stat.color === 'green' ? 'bg-green-500/10 border border-green-500/20' : ''}
              ${stat.color === 'purple' ? 'bg-purple-500/10 border border-purple-500/20' : ''}
              ${stat.color === 'amber' ? 'bg-amber-500/10 border border-amber-500/20' : ''}
            `}
          >
            {/* Accent Bar */}
            <div 
              className={`
                absolute top-0 left-0 right-0 h-1
                ${stat.color === 'blue' ? 'bg-blue-500' : ''}
                ${stat.color === 'green' ? 'bg-green-500' : ''}
                ${stat.color === 'purple' ? 'bg-purple-500' : ''}
                ${stat.color === 'amber' ? 'bg-amber-500' : ''}
              `}
            />
            
            <div className="text-white/60 text-xs mb-1">{stat.label}</div>
            <div className="text-white text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-white/40 text-xs">{stat.change}</div>
            
            {/* Progress Bar */}
            <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stat.progress}%` }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                className={`
                  h-full rounded-full
                  ${stat.color === 'blue' ? 'bg-blue-500/50' : ''}
                  ${stat.color === 'green' ? 'bg-green-500/50' : ''}
                  ${stat.color === 'purple' ? 'bg-purple-500/50' : ''}
                  ${stat.color === 'amber' ? 'bg-amber-500/50' : ''}
                `}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Recent Activity */}
        <div className="col-span-2 bg-white/5 rounded-xl border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">最近活动</h3>
            <span className="text-white/40 text-xs">实时更新</span>
          </div>
          
          <div className="space-y-2">
            {recentActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {activity.avatar}
                  </div>
                  <div>
                    <div className="text-white text-sm">{activity.user}</div>
                    <div className="text-white/40 text-xs">{activity.action}</div>
                  </div>
                </div>
                <span className="text-white/40 text-xs">{activity.time}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Channel Progress */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-5">
          <h3 className="text-white font-semibold mb-4">进度追踪</h3>
          
          <div className="space-y-4">
            {channelProgress.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/60 text-xs">{item.name}</span>
                  <span className="text-white/40 text-xs">{item.progress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.progress}%` }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
```

**Step 2: 验证组件**

Run: 刷新浏览器查看 Dashboard

**Step 3: Commit**

```bash
git add src/renderer/views/DashboardView.tsx
git commit -m "feat: implement Dashboard view with stats and progress tracking"
```

---

## Task 2-N: 其他视图组件

（根据优先级逐个实现，每个视图按照相同的步骤）

**实现顺序**：
1. Dashboard ✅
2. Chat (已部分完成)
3. Agents
4. Channels
5. ... (按优先级继续)

---

**Created by:** Axon
**Date:** 2026-03-15
**Status:** Ready for execution

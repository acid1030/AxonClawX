# AxonClaw 侧边栏重设计实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将左侧图标栏和侧边栏合并为 macOS 风格的可收缩侧边栏，右侧面板改为浮动面板

**Architecture:** 
- 合并左侧两个导航区域为一个可收缩侧边栏
- 收缩时仅显示图标 (56px)，展开时显示图标+文字 (240px)
- 右侧面板改为浮动面板，不占布局空间
- 底部添加 macOS 风格圆形收缩按钮

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Framer Motion

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 Lucide React 和 Framer Motion**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npm install lucide-react framer-motion
```

**Step 2: 验证安装**

Run: `npm list lucide-react framer-motion`
Expected: 显示版本号

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add lucide-react and framer-motion dependencies"
```

---

## Task 2: 创建 SVG 图标组件

**Files:**
- Create: `src/renderer/components/Icons/IconComponents.tsx`

**Step 1: 创建图标组件**

```typescript
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Radio,
  Database,
  FileText,
  GitBranch,
  Wrench,
  Target,
  Clock,
  Activity,
  BarChart3,
  FileList,
  Settings,
  FileCode,
  Plug,
  ChevronLeft,
  PanelRightClose,
  PanelRightOpen,
  X,
} from 'lucide-react';

export const Icons = {
  dashboard: LayoutDashboard,
  chat: MessageSquare,
  agent: Bot,
  channel: Radio,
  memory: Database,
  content: FileText,
  workflow: GitBranch,
  skill: Wrench,
  model: Target,
  cron: Clock,
  diagnostic: Activity,
  session: BarChart3,
  log: FileList,
  setting: Settings,
  template: FileCode,
  plugin: Plug,
  chevronLeft: ChevronLeft,
  panelClose: PanelRightClose,
  panelOpen: PanelRightOpen,
  close: X,
};

export type IconName = keyof typeof Icons;
```

**Step 2: 验证导入**

Run: `npx tsc --noEmit src/renderer/components/Icons/IconComponents.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Icons/IconComponents.tsx
git commit -m "feat: add Lucide icon components"
```

---

## Task 3: 创建收缩按钮组件

**Files:**
- Create: `src/renderer/components/Sidebar/CollapseButton.tsx`

**Step 1: 创建 macOS 风格收缩按钮**

```typescript
import { motion } from 'framer-motion';
import { Icons } from '../Icons/IconComponents';

interface CollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  tooltip?: string;
}

export function CollapseButton({ isCollapsed, onToggle, tooltip }: CollapseButtonProps) {
  const Icon = Icons.chevronLeft;
  
  return (
    <motion.button
      onClick={onToggle}
      className={`
        group relative w-8 h-8 rounded-full
        bg-gradient-to-b from-white/10 to-white/5
        hover:from-white/15 hover:to-white/10
        active:from-white/5 active:to-white/[0.02]
        border border-white/10
        backdrop-blur-xl
        transition-all duration-200
        flex items-center justify-center
      `}
      whileHover={{ scale: 1.05 }}
      whilePress={{ scale: 0.95 }}
      title={tooltip || (isCollapsed ? '展开侧边栏' : '收起侧边栏')}
    >
      <motion.div
        animate={{ rotate: isCollapsed ? 180 : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <Icon className="w-4 h-4 text-white/70 group-hover:text-white/90" />
      </motion.div>
    </motion.button>
  );
}
```

**Step 2: 验证组件**

Run: `npx tsc --noEmit src/renderer/components/Sidebar/CollapseButton.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Sidebar/CollapseButton.tsx
git commit -m "feat: add macOS-style collapse button"
```

---

## Task 4: 创建侧边栏菜单项组件

**Files:**
- Create: `src/renderer/components/Sidebar/SidebarItem.tsx`

**Step 1: 创建菜单项组件**

```typescript
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon: Icon, label, isActive, isCollapsed, onClick }: SidebarItemProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        group relative w-full flex items-center gap-3
        ${isCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'}
        rounded-lg
        transition-all duration-200
        ${isActive 
          ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-400' 
          : 'text-white/60 hover:bg-white/5 hover:text-white/90'
        }
      `}
      whileHover={{ x: isActive ? 0 : 2 }}
    >
      <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
      
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="text-sm font-medium truncate"
        >
          {label}
        </motion.span>
      )}
      
      {isActive && isCollapsed && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
```

**Step 2: 验证组件**

Run: `npx tsc --noEmit src/renderer/components/Sidebar/SidebarItem.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Sidebar/SidebarItem.tsx
git commit -m "feat: add sidebar menu item component"
```

---

## Task 5: 创建合并侧边栏组件

**Files:**
- Create: `src/renderer/components/Sidebar/UnifiedSidebar.tsx`

**Step 1: 创建统一侧边栏**

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Icons } from '../Icons/IconComponents';
import { SidebarItem } from './SidebarItem';
import { CollapseButton } from './CollapseButton';

const menuItems = [
  { id: 'dashboard', icon: Icons.dashboard, label: 'Dashboard' },
  { id: 'chat', icon: Icons.chat, label: '对话' },
  { id: 'agent', icon: Icons.agent, label: 'Agent' },
  { id: 'channel', icon: Icons.channel, label: '渠道' },
  { id: 'memory', icon: Icons.memory, label: '记忆' },
  { id: 'content', icon: Icons.content, label: '内容' },
  { id: 'workflow', icon: Icons.workflow, label: '工作流' },
  { id: 'skill', icon: Icons.skill, label: '技能' },
  { id: 'model', icon: Icons.model, label: '模型' },
  { id: 'cron', icon: Icons.cron, label: '定时任务' },
  { id: 'diagnostic', icon: Icons.diagnostic, label: '诊断' },
  { id: 'session', icon: Icons.session, label: '会话' },
  { id: 'log', icon: Icons.log, label: '日志' },
  { id: 'setting', icon: Icons.setting, label: '设置' },
  { id: 'template', icon: Icons.template, label: '模板' },
  { id: 'plugin', icon: Icons.plugin, label: '插件' },
];

interface UnifiedSidebarProps {
  activeView?: string;
  onViewChange?: (viewId: string) => void;
}

export function UnifiedSidebar({ activeView = 'dashboard', onViewChange }: UnifiedSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 56 : 240 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className={`
        relative flex flex-col
        bg-gradient-to-b from-[rgba(30,25,50,0.75)] to-[rgba(20,18,40,0.7)]
        backdrop-blur-xl
        border-r border-purple-500/10
        overflow-hidden
      `}
    >
      {/* Logo */}
      <div className="flex-shrink-0 p-4 flex items-center justify-center h-16">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-white font-semibold text-sm">AxonClaw</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isCollapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
          >
            <span className="text-white font-bold text-sm">A</span>
          </motion.div>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeView === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onViewChange?.(item.id)}
          />
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="flex-shrink-0 p-3 flex justify-center border-t border-white/5">
        <CollapseButton
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </motion.aside>
  );
}
```

**Step 2: 验证组件**

Run: `npx tsc --noEmit src/renderer/components/Sidebar/UnifiedSidebar.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Sidebar/UnifiedSidebar.tsx
git commit -m "feat: add unified sidebar with collapse functionality"
```

---

## Task 6: 创建浮动右侧面板组件

**Files:**
- Create: `src/renderer/components/Panel/FloatingPanel.tsx`

**Step 1: 创建浮动面板**

```typescript
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Icons } from '../Icons/IconComponents';

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FloatingPanel({ isOpen, onClose, children }: FloatingPanelProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              fixed right-0 top-0 h-full w-[340px]
              bg-gradient-to-b from-[rgba(15,45,45,0.95)] to-[rgba(10,35,40,0.92)]
              backdrop-blur-2xl
              border-l border-green-500/10
              shadow-2xl
              z-50
              flex flex-col
            `}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="text-white font-semibold text-sm">运行概览</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Icons.close className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

**Step 2: 验证组件**

Run: `npx tsc --noEmit src/renderer/components/Panel/FloatingPanel.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Panel/FloatingPanel.tsx
git commit -m "feat: add floating panel component with backdrop"
```

---

## Task 7: 创建面板内容组件

**Files:**
- Create: `src/renderer/components/Panel/PanelContent.tsx`

**Step 1: 创建面板内容**

```typescript
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Clock } from 'lucide-react';

export function PanelContent() {
  return (
    <div className="space-y-4">
      {/* Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">运行概览</h3>
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            在线
          </span>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="text-white/60 text-xs mb-1">Gateway</div>
            <div className="text-white font-semibold">稳定</div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">活跃 Channel</div>
            <div className="text-white font-semibold">4 / 6</div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">任务队列</div>
            <div className="text-white font-semibold">18</div>
          </div>
        </div>
      </motion.div>

      {/* Tasks Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">今日任务</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-white/90 text-sm">新品图文生成</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
              进行中
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="text-white/90 text-sm">渠道健康巡检</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
              排队
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">快捷操作</h3>
        
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            运行诊断
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            备份数据
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            新建模板
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

**Step 2: 验证组件**

Run: `npx tsc --noEmit src/renderer/components/Panel/PanelContent.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Panel/PanelContent.tsx
git commit -m "feat: add panel content with health and tasks cards"
```

---

## Task 8: 创建面板触发按钮组件

**Files:**
- Create: `src/renderer/components/Panel/PanelTrigger.tsx`

**Step 1: 创建触发按钮**

```typescript
import { motion } from 'framer-motion';
import { Icons } from '../Icons/IconComponents';

interface PanelTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export function PanelTrigger({ onClick, isOpen }: PanelTriggerProps) {
  if (isOpen) return null;

  return (
    <motion.button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6
        w-12 h-12 rounded-full
        bg-gradient-to-br from-green-500/20 to-green-600/20
        hover:from-green-500/30 hover:to-green-600/30
        backdrop-blur-xl
        border border-green-500/20
        shadow-lg shadow-green-500/10
        flex items-center justify-center
        z-30
        group
      `}
      whileHover={{ scale: 1.05 }}
      whilePress={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      title="打开任务面板 (⌘K)"
    >
      <Icons.panelOpen className="w-5 h-5 text-green-400 group-hover:text-green-300" />
    </motion.button>
  );
}
```

**Step 2: 验证组件**

Run: `npx tsc --noEmit src/renderer/components/Panel/PanelTrigger.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/components/Panel/PanelTrigger.tsx
git commit -m "feat: add floating panel trigger button"
```

---

## Task 9: 更新主布局

**Files:**
- Modify: `src/renderer/layouts/MainLayout.tsx`

**Step 1: 更新主布局以使用新侧边栏和浮动面板**

查看现有的 MainLayout.tsx 内容，然后更新为：

```typescript
import { useState } from 'react';
import { UnifiedSidebar } from '../components/Sidebar/UnifiedSidebar';
import { FloatingPanel } from '../components/Panel/FloatingPanel';
import { PanelContent } from '../components/Panel/PanelContent';
import { PanelTrigger } from '../components/Panel/PanelTrigger';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Handle Cmd/Ctrl + K shortcut
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsPanelOpen(!isPanelOpen);
    }
  };

  // Add keyboard listener
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Unified Sidebar */}
      <UnifiedSidebar
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Floating Panel */}
      <FloatingPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      >
        <PanelContent />
      </FloatingPanel>

      {/* Panel Trigger Button */}
      <PanelTrigger
        isOpen={isPanelOpen}
        onClick={() => setIsPanelOpen(true)}
      />

      {/* Header Panel Button (to be added to Header component) */}
    </div>
  );
}
```

**Step 2: 验证布局**

Run: `npx tsc --noEmit src/renderer/layouts/MainLayout.tsx`
Expected: 无错误

**Step 3: Commit**

```bash
git add src/renderer/layouts/MainLayout.tsx
git commit -m "feat: integrate unified sidebar and floating panel into main layout"
```

---

## Task 10: 测试和验证

**Step 1: 启动开发服务器**

```bash
cd /Users/t/openclaw-dev/projects/axonclaw
npm run dev
```

**Step 2: 手动测试清单**

- [ ] 侧边栏显示所有菜单项
- [ ] 点击收缩按钮，侧边栏收缩为图标模式
- [ ] 再次点击，侧边栏展开显示图标+文字
- [ ] 点击菜单项，active 状态切换
- [ ] 收缩状态下 active 指示器正确显示
- [ ] 点击右下角浮动按钮，面板滑出
- [ ] 按 Cmd/Ctrl+K，面板打开/关闭
- [ ] 点击遮罩层，面板关闭
- [ ] 按 ESC，面板关闭

**Step 3: 截图记录**

```bash
# 浏览器访问 http://localhost:5173
# 截图保存到 test-screenshots/sidebar-redesign/
```

**Step 4: Commit 测试结果**

```bash
git add test-screenshots/
git commit -m "test: add sidebar redesign test screenshots"
```

---

## Execution Complete

**实现完成后，应该有：**

1. ✅ macOS 风格可收缩侧边栏
2. ✅ Lucide 图标（跨平台）
3. ✅ 底部圆形收缩按钮
4. ✅ 浮动右侧面板
5. ✅ 多个打开面板入口（快捷键、浮动按钮、Header 按钮）
6. ✅ 平滑动画效果

**文件清单：**
- `src/renderer/components/Icons/IconComponents.tsx`
- `src/renderer/components/Sidebar/CollapseButton.tsx`
- `src/renderer/components/Sidebar/SidebarItem.tsx`
- `src/renderer/components/Sidebar/UnifiedSidebar.tsx`
- `src/renderer/components/Panel/FloatingPanel.tsx`
- `src/renderer/components/Panel/PanelContent.tsx`
- `src/renderer/components/Panel/PanelTrigger.tsx`
- `src/renderer/layouts/MainLayout.tsx`

---

**Created by:** Axon
**Date:** 2026-03-15
**Status:** Ready for execution

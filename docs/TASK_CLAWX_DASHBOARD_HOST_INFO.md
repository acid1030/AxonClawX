# ClawX 任务：Dashboard 主机信息模块

> 分配给 ClawX 并行开发。不改变 AxonClaw 技术架构。

## 任务目标

实现 Dashboard 页面的「主机信息」卡片模块，展示 CPU、内存、磁盘使用率等系统资源。

## 具体内容

### 1. 主进程 API：`/api/host-info`

在 `src/main/index.ts` 的 host-api 路由中新增：

```
GET /api/host-info
```

**返回结构**（参考 ClawDeckX，适配 Node.js）：

```typescript
{
  hostname: string;        // os.hostname()
  platform: string;       // os.platform() → darwin/linux/win32
  arch: string;           // os.arch()
  numCpu: number;         // os.cpus().length
  cpuUsage?: number;      // 0-100，可用 os-utils 或 process.cpuUsage 估算
  sysMem?: {              // 系统内存
    total: number;        // 字节
    used: number;
    free: number;
    usedPct: number;      // 0-100
  };
  diskUsage?: Array<{     // 磁盘
    path: string;
    total: number;
    used: number;
    free: number;
    usedPct: number;
  }>;
  uptimeMs?: number;      // os.uptime() * 1000
  openclawVersion?: string;  // 若有则填
}
```

**实现方式**：
- 在 `src/main/index.ts` 的 `hostapi:fetch` IPC handler 中新增 `path === '/api/host-info'` 分支（参考 `/api/app/gateway-info` 等）
- 使用 Node.js `os` 模块
- CPU 使用率：可用 `os.loadavg()` 或简单返回 0（后续可接 `node-os-utils` 等）
- 内存：`os.totalmem()`, `os.freemem()`
- 磁盘：可用 `check-disk-space` 或 `drivelist`，若无依赖则先返回空数组

### 2. 主机信息卡片 UI

在 `src/renderer/views/DashboardView.tsx` 中新增「主机信息」区域：

- 标题：Host / 主机
- 三列 GaugeCard：CPU、内存、磁盘
- 每个 GaugeCard：圆形进度环 + 百分比 + 简要说明（如 cores、已用/总量）
- 样式参考：ClawDeckX `web/windows/Dashboard.tsx` 约 550–620 行

### 3. GaugeCard 组件（若不存在）

若 `src/renderer/components/common/GaugeCard.tsx` 不存在，需新建：

```tsx
// 用法示例
<GaugeCard 
  pct={cpuPct} 
  label="CPU" 
  color="#3b82f6" 
  gradient="from-blue-50/80 to-white dark:from-blue-500/[0.06]"
  borderColor="border-blue-100/50 dark:border-blue-500/10"
>
  <p className="text-[10px] text-slate-500">4 cores</p>
</GaugeCard>
```

- 圆形 SVG 进度环（0–100%）
- 超过 90% 红色、70–90% 黄色、否则用传入 color
- 支持 dark 模式

### 4. 数据流

- 在 DashboardView 中 `hostApiFetch('/api/host-info')` 或通过现有 host-api 机制
- 轮询间隔可设为 5 分钟，或与 Dashboard 其他数据一起刷新
- 加载中显示骨架屏

## 约束

- 不新增全局状态管理，仅在 DashboardView 内 useState
- 不改变 AxonClaw 的 Electron + hostApiFetch 架构
- 使用 Tailwind + lucide-react，与现有风格一致

## 参考文件

- ClawDeckX: `web/windows/Dashboard.tsx` 行 550–620（Host Info Card）
- AxonClaw: `src/renderer/views/DashboardView.tsx`
- AxonClaw: `src/main/index.ts`（host-api 路由注册位置）

## 验收

1. 访问 Dashboard 时能看到主机信息卡片
2. CPU/内存/磁盘有正确百分比展示
3. 主进程 `/api/host-info` 返回有效 JSON

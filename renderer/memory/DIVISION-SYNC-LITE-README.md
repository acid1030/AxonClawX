# Division Sync Lite - 极简版同步

**文件大小:** 6.5KB (<10KB ✅)  
**核心功能:** Global ↔ Division 文件同步  
**同步策略:** 时间戳比较，新的覆盖旧的  
**执行频率:** 每 5 分钟自动执行

---

## 🚀 快速使用

### 方式 1: 手动同步

```typescript
import { syncBidirectional } from './division-sync-lite';

// 执行一次双向同步
const result = syncBidirectional('miiow');
console.log(result);
```

### 方式 2: 自动同步

```typescript
import { startAutoSync, stopAutoSync } from './division-sync-lite';

// 启动自动同步 (每 5 分钟)
startAutoSync('miiow');

// 停止自动同步
stopAutoSync();
```

---

## 📦 API

### `syncGlobalToDivision(divisionId: string)`

**方向:** Global → Division  
**返回:** `{ synced: number, skipped: number, errors: string[] }`

```typescript
const result = syncGlobalToDivision('miiow');
// { synced: 5, skipped: 10, errors: [] }
```

### `syncDivisionToGlobal(divisionId: string)`

**方向:** Division → Global  
**返回:** `{ synced: number, skipped: number, errors: string[] }`

```typescript
const result = syncDivisionToGlobal('miiow');
```

### `syncBidirectional(divisionId: string)`

**方向:** 双向 (先 G→D, 再 D→G)  
**返回:** `{ globalToDivision: ..., divisionToGlobal: ... }`

```typescript
const result = syncBidirectional('miiow');
```

### `startAutoSync(divisionId: string)`

启动自动同步 (每 5 分钟执行一次双向同步)

```typescript
startAutoSync('miiow');
```

### `stopAutoSync()`

停止自动同步

```typescript
stopAutoSync();
```

---

## 🔄 同步逻辑

```typescript
// 核心同步函数
function syncFile(src: string, dest: string) {
  const srcMtime = fs.statSync(src).mtimeMs;
  const destMtime = fs.statSync(dest).mtimeMs;
  
  // 时间戳比较：新的覆盖旧的
  if (srcMtime > destMtime) {
    fs.copyFileSync(src, dest);
  }
}
```

---

## 📁 目录结构

```
~/.openclaw/memory/
├── global/
│   └── shared/           # 全局共享文件
└── divisions/
    └── {divisionId}/
        └── shared/       # 分队共享文件
```

---

## ✅ 交付清单

- [x] `division-sync-lite.ts` (6.5KB < 10KB)
- [x] 核心同步逻辑 (时间戳比较)
- [x] 自动同步 (每 5 分钟)
- [x] 双向同步支持
- [x] TypeScript 类型安全
- [x] 错误处理

---

**完成时间:** 2026-03-13 14:51  
**作者:** ARIA (设计分队)

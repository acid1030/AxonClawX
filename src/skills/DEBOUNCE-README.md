# 防抖节流工具 (Debounce Utils)

> 函数执行控制工具集 - 防抖、节流、请求动画帧

## 📦 安装

无需额外安装，直接使用：

```typescript
import {
  debounce,
  throttle,
  raf,
  rafThrottle,
  debounceThrottle,
  createSmartUpdater,
} from '@/skills/debounce-utils-skill';
```

## 🚀 快速开始

### 1. 防抖函数 (Debounce)

**原理**: 延迟执行，如果在延迟期间再次触发则重新计时

**适用场景**: 搜索框输入、窗口 resize、表单验证

```typescript
// 基础用法
const searchHandler = debounce((query: string) => {
  console.log('搜索:', query);
}, 300);

// 立即执行第一次
const clickHandler = debounce(() => {
  console.log('点击');
}, 500, { immediate: true });

// 取消待执行的调用
searchHandler.cancel();

// 立即执行待处理的调用
searchHandler.flush('最终搜索词');

// 检查是否有待执行的调用
const isPending = searchHandler.pending();
```

### 2. 节流函数 (Throttle)

**原理**: 限制执行频率，在指定时间内只执行一次

**适用场景**: 滚动事件、按钮防重复点击、API 请求限制

```typescript
// 基础用法
const scrollHandler = throttle(() => {
  console.log('滚动中...');
}, 100);

// 配置 leading/trailing
const resizeHandler = throttle(() => {
  console.log('窗口调整');
}, 500, {
  leading: true,   // 开始时执行
  trailing: true   // 结束时执行
});

// 取消节流
scrollHandler.cancel();

// 立即执行
scrollHandler.flush();
```

### 3. 请求动画帧 (RAF)

**原理**: 使用 requestAnimationFrame 进行性能优化的动画执行

**适用场景**: 动画、游戏循环、滚动优化

```typescript
// 基础动画循环
const animation = raf((timestamp) => {
  console.log('动画帧:', timestamp);
  animation.flush(); // 继续下一帧
});

animation.flush(); // 启动动画
animation.cancel(); // 停止动画
animation.isRunning(); // 检查是否运行中

// 节流动画 (限制帧率)
const throttledAnimation = rafThrottle((timestamp) => {
  console.log('节流动画帧:', timestamp);
}, 33); // 限制为 30fps (1000/30 ≈ 33ms)

throttledAnimation.flush();
```

## 📖 API 文档

### debounce

```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options?: DebounceOptions
): T & {
  cancel: () => void;
  pending: () => boolean;
  flush: (...args: Parameters<T>) => void;
}
```

**参数**:
- `fn`: 要执行的函数
- `delay`: 延迟时间 (毫秒)
- `options.immediate`: 是否立即执行第一次 (默认 false)
- `options.context`: 回调函数上下文

**返回**: 防抖后的函数，附加 `cancel`、`pending`、`flush` 方法

### throttle

```typescript
function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options?: ThrottleOptions
): T & {
  cancel: () => void;
  flush: (...args: Parameters<T>) => void;
}
```

**参数**:
- `fn`: 要执行的函数
- `delay`: 时间间隔 (毫秒)
- `options.leading`: 是否在开始时执行 (默认 true)
- `options.trailing`: 是否在结束时执行 (默认 true)
- `options.context`: 回调函数上下文

**返回**: 节流后的函数，附加 `cancel`、`flush` 方法

### raf

```typescript
function raf(
  callback: (timestamp: number) => void
): RafController
```

**参数**:
- `callback`: 回调函数，接收时间戳参数

**返回**: RafController 对象
- `cancel()`: 取消动画帧
- `isRunning()`: 检查是否正在运行
- `flush()`: 立即执行下一帧

### rafThrottle

```typescript
function rafThrottle(
  callback: (timestamp: number) => void,
  interval?: number
): RafController
```

**参数**:
- `callback`: 回调函数
- `interval`: 最小间隔时间 (毫秒，默认 16ms ≈ 60fps)

**返回**: RafController 对象

### debounceThrottle

```typescript
function debounceThrottle<T extends (...args: any[]) => any>(
  fn: T,
  debounceDelay: number,
  throttleDelay: number
): T
```

**参数**:
- `fn`: 要执行的函数
- `debounceDelay`: 防抖延迟
- `throttleDelay`: 节流间隔

**返回**: 组合后的函数

### createSmartUpdater

```typescript
function createSmartUpdater<T extends (...args: any[]) => any>(
  callback: T,
  useRaf?: boolean
): T
```

**参数**:
- `callback`: 回调函数
- `useRaf`: 是否优先使用 RAF (默认 true)

**返回**: 智能更新函数

## 🎯 实际应用场景

### 搜索框优化

```typescript
const searchApi = debounceThrottle(
  async (query: string) => {
    const results = await fetch(`/api/search?q=${query}`);
    updateSuggestions(results);
  },
  300,  // 300ms 防抖
  1000  // 最少间隔 1 秒
);

input.addEventListener('input', (e) => {
  searchApi(e.target.value);
});
```

### 无限滚动加载

```typescript
const loadMore = throttle(() => {
  fetchMoreData();
}, 500);

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;

  if (scrollTop + windowHeight >= documentHeight - 200) {
    loadMore();
  }
});
```

### 平滑滚动动画

```typescript
function scrollTo(target: number, duration: number = 1000) {
  const start = window.scrollY;
  const change = target - start;
  let startTime: number | null = null;

  const animation = raf((timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 缓动函数 (easeInOutQuad)
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    window.scrollTo(0, start + change * ease);

    if (progress < 1) {
      animation.flush();
    }
  });

  animation.flush();
}
```

### 表单自动保存

```typescript
const autoSave = debounce((content: string) => {
  saveToServer(content);
}, 5000);

textarea.addEventListener('input', (e) => {
  autoSave(e.target.value);
});

// 页面关闭前立即保存
window.addEventListener('beforeunload', () => {
  autoSave.flush(textarea.value);
});
```

### 游戏循环

```typescript
const gameState = {
  player: { x: 0, y: 0 },
  score: 0
};

const gameLoop = raf((timestamp) => {
  // 更新游戏状态
  gameState.player.x += 1;
  
  // 渲染游戏
  render(gameState);
  
  gameLoop.flush();
});

gameLoop.flush();
```

## ⚡ 性能对比

| 场景 | 普通处理 | 防抖 (300ms) | 节流 (100ms) |
|------|---------|-------------|-------------|
| 1 秒内触发 1000 次 | 1000 次 | 1 次 | 10 次 |
| 内存占用 | 高 | 低 | 中 |
| CPU 使用 | 高 | 低 | 中 |

## 📝 注意事项

1. **内存泄漏**: 组件卸载时记得调用 `cancel()` 方法
2. **上下文绑定**: 使用 `options.context` 或箭头函数保持正确的 `this`
3. **延迟选择**: 
   - 搜索框：200-500ms
   - Resize: 100-200ms
   - 滚动：50-100ms
4. **RAF 兼容性**: 在 SSR 环境中检查 `requestAnimationFrame` 是否存在

## 📚 相关文件

- 源代码：`src/skills/debounce-utils-skill.ts`
- 使用示例：`src/skills/debounce-utils-skill.examples.ts`

## 🤝 贡献

遵循项目代码规范，确保类型安全和测试覆盖。

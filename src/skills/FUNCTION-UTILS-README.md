# ACE Function Utils - 函数式编程工具集

> 优雅、高效、类型安全的函数式编程工具

## 📦 功能概览

### 1. 函数柯里化 (Currying)
- **`curry(fn)`** - 将多参数函数转换为柯里化函数
- **`partial(fn, ...args)`** - 从左到右部分应用参数
- **`partialRight(fn, ...args)`** - 从右到左部分应用参数

### 2. 函数组合 (Composition)
- **`compose(...fns)`** - 从右到左组合函数
- **`pipe(...fns)`** - 从左到右组合函数 (更直观)
- **`composeAsync(...fns)`** - 异步函数组合
- **`pipeAsync(...fns)`** - 异步函数管道

### 3. 防抖节流 (Debounce/Throttle)
- **`debounce(fn, wait, options)`** - 防抖函数，延迟执行
- **`throttle(fn, limit, options)`** - 节流函数，限制执行频率
- **`rafThrottle(fn)`** - requestAnimationFrame 节流，用于动画优化

### 4. 辅助工具
- **`identity(value)`** - 恒等函数
- **`noop()`** - 空函数
- **`once(fn)`** - 只执行一次的函数
- **`negate(predicate)`** - 取反函数

## 🚀 快速开始

### 安装
```bash
# 直接导入使用
import { curry, pipe, debounce } from './src/skills/function-utils-skill';
```

### 基础示例

```typescript
// 柯里化
const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);
curriedAdd(1)(2)(3); // 6

// 部分应用
const double = partial((a: number, b: number) => a * b, 2);
double(5); // 10

// 函数管道
const add2 = (x: number) => x + 2;
const multiply3 = (x: number) => x * 3;
const result = pipe(add2, multiply3)(5); // 21

// 防抖
const debouncedSave = debounce(saveData, 1000);
input.oninput = (e) => debouncedSave(e.target.value);

// 节流
const throttledScroll = throttle(handleScroll, 200);
window.onscroll = throttledScroll;
```

## 📖 详细文档

### 柯里化 (Currying)

将多参数函数转换为一系列单参数函数，支持灵活的部分应用。

```typescript
// 基础柯里化
const curriedAdd = curry((a, b, c) => a + b + c);
curriedAdd(1)(2)(3);     // 6
curriedAdd(1, 2)(3);     // 6
curriedAdd(1)(2, 3);     // 6

// 创建专用函数
const fetchAPI = (base: string, endpoint: string, params: any) => {...};
const fetchFromGitHub = partial(fetchAPI, 'https://api.github.com');
fetchFromGitHub('/users', { username: 'axon' });
```

### 函数组合 (Composition)

将多个函数组合成一个函数，数据在函数间流动。

```typescript
// compose - 从右到左 (数学风格)
const addThenMultiply = compose(multiply3, add2);
addThenMultiply(5); // 21

// pipe - 从左到右 (更直观)
const processData = pipe(
  filterActive,
  getNames,
  toUpperCase
);
processData(users); // ['ALICE', 'CHARLIE']

// 异步组合
const getUserGreeting = pipeAsync(
  fetchUser,
  getUserName,
  toGreeting
);
await getUserGreeting('123'); // "Hello, John!"
```

### 防抖节流 (Debounce/Throttle)

控制函数执行频率，优化性能。

```typescript
// 防抖 - 延迟执行，重置计时器
const debouncedSave = debounce(saveData, 1000);
// 可选：立即执行
const debouncedImmediate = debounce(saveData, 1000, { immediate: true });
// 取消或立即刷新
debouncedSave.cancel();
debouncedSave.flush();

// 节流 - 限制执行频率
const throttledScroll = throttle(handleScroll, 200);
// 可选：控制首尾执行
throttle(handleScroll, 200, { leading: true, trailing: false });
// 取消或立即刷新
throttledScroll.cancel();
throttledScroll.flush();

// 动画优化
const rafAnimated = rafThrottle(animate);
requestAnimationFrame(rafAnimated);
```

## 🎯 实际应用场景

### 1. Redux Reducer 组合
```typescript
const withLoading = (state) => ({ ...state, loading: true });
const withData = (data) => (state) => ({ ...state, data, loading: false });
const reducer = pipe(withLoading, withData(data));
```

### 2. 表单验证管道
```typescript
const validateEmail = pipe(
  isRequired,
  isEmail,
  isLength(5, 50)
);
validateEmail('test@example.com'); // true
```

### 3. 日志装饰器
```typescript
const withLogging = (fn, name) => (...args) => {
  console.log(`[${name}] Called:`, args);
  return fn(...args);
};
const loggedAdd = withLogging(add, 'add');
```

### 4. 缓存 (Memoization)
```typescript
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};
```

## 📝 API 参考

### Curry
```typescript
function curry<F extends AnyFunction>(fn: F): Curry<F>
```

### Partial
```typescript
function partial<F extends AnyFunction>(fn: F, ...partialArgs: any[]): F
function partialRight<F extends AnyFunction>(fn: F, ...partialArgs: any[]): F
```

### Compose/Pipe
```typescript
function compose<A, B, C, D>(
  f: (arg: C) => D,
  g: (arg: B) => C,
  h: (arg: A) => B
): (arg: A) => D

function pipe<A, B, C, D>(
  f: (arg: A) => B,
  g: (arg: B) => C,
  h: (arg: C) => D
): (arg: A) => D
```

### Debounce
```typescript
interface DebounceOptions {
  immediate?: boolean;
}

function debounce<F extends AnyFunction>(
  fn: F,
  wait: number,
  options?: DebounceOptions
): F & {
  cancel: () => void;
  flush: (...args: any[]) => any;
}
```

### Throttle
```typescript
interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

function throttle<F extends AnyFunction>(
  fn: F,
  limit: number,
  options?: ThrottleOptions
): F & {
  cancel: () => void;
  flush: (...args: any[]) => any;
}
```

## 🔧 配置选项

### Debounce 选项
- `immediate` (默认: `false`) - 是否在调用开始时立即执行

### Throttle 选项
- `leading` (默认: `true`) - 是否在时间窗口开始时执行
- `trailing` (默认: `true`) - 是否在时间窗口结束时执行

## 📊 性能提示

1. **防抖 vs 节流**
   - 防抖：适合搜索框、窗口调整等场景
   - 节流：适合滚动、拖拽等高频事件

2. **组合性能**
   - 函数组合不会增加额外性能开销
   - 异步组合会自动处理 Promise

3. **内存管理**
   - 防抖/节流函数提供 `cancel()` 方法清理定时器
   - 组件卸载时记得调用 `cancel()`

## 📚 相关文件

- 源码：`src/skills/function-utils-skill.ts`
- 示例：`src/skills/function-utils-skill.examples.ts`

## 🎓 学习资源

- [Functional Programming in TypeScript](https://www.typescriptlang.org/)
- [Compose vs Pipe](https://medium.com/@jamesjefferyuk/javascript-what-are-pure-functions-4d4d5392d49c)
- [Debounce and Throttle](https://css-tricks.com/debouncing-throttling-explained-and-examples/)

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**维护者:** ACE (Agent of Code Excellence)

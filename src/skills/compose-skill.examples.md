# Compose Skill - 使用示例

函数组合技能提供函数式编程工具，包括 compose/pipe 组合、curry 柯里化、debounce/throttle 防抖节流。

---

## 1. 函数组合 (compose/pipe)

### 1.1 compose - 右到左组合

```typescript
import { compose } from './compose-skill';

// 基础示例
const add1 = (x: number) => x + 1;
const mul2 = (x: number) => x * 2;
const toString = (x: number) => `Result: ${x}`;

// 从右到左执行：add1 → mul2 → toString
const process = compose(toString, mul2, add1);

console.log(process(5)); 
// 执行过程：5 → 5+1=6 → 6*2=12 → "Result: 12"
// 输出："Result: 12"
```

### 1.2 pipe - 左到右组合

```typescript
import { pipe } from './compose-skill';

// 基础示例
const add1 = (x: number) => x + 1;
const mul2 = (x: number) => x * 2;
const toString = (x: number) => `Result: ${x}`;

// 从左到右执行：add1 → mul2 → toString (更符合阅读习惯)
const process = pipe(add1, mul2, toString);

console.log(process(5));
// 执行过程：5 → 5+1=6 → 6*2=12 → "Result: 12"
// 输出："Result: 12"
```

### 1.3 实际应用场景 - 数据处理管道

```typescript
import { pipe } from './compose-skill';

// 定义转换函数
const trim = (s: string) => s.trim();
const toLowerCase = (s: string) => s.toLowerCase();
const removeSpaces = (s: string) => s.replace(/\s+/g, '');
const validate = (s: string) => s.length > 0 ? s : null;

// 创建数据处理管道
const cleanInput = pipe(
  trim,
  toLowerCase,
  removeSpaces,
  validate
);

// 使用
console.log(cleanInput('  Hello World  ')); 
// 输出："helloworld"

console.log(cleanInput('   ')); 
// 输出：null
```

### 1.4 实际应用场景 - 对象转换

```typescript
import { compose } from './compose-skill';

interface User {
  name: string;
  email: string;
  age: number;
}

interface UserDTO {
  fullName: string;
  contact: string;
  isAdult: boolean;
}

// 转换函数
const addExclamation = (user: User) => ({
  ...user,
  name: `${user.name}!`
});

const toDTO = (user: User): UserDTO => ({
  fullName: user.name,
  contact: user.email,
  isAdult: user.age >= 18
});

const sanitize = (dto: UserDTO) => ({
  ...dto,
  contact: dto.contact.toLowerCase()
});

// 组合转换管道
const transformUser = compose(
  sanitize,
  toDTO,
  addExclamation
);

const user: User = {
  name: 'John',
  email: 'JOHN@EXAMPLE.COM',
  age: 25
};

console.log(transformUser(user));
// 输出：{ fullName: 'John!', contact: 'john@example.com', isAdult: true }
```

---

## 2. 柯里化 (curry/partial)

### 2.1 curry - 完全柯里化

```typescript
import { curry } from './compose-skill';

// 基础示例
const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);

// 可以分多次调用
console.log(curriedAdd(1)(2)(3));      // 输出：6
console.log(curriedAdd(1, 2)(3));      // 输出：6
console.log(curriedAdd(1)(2, 3));      // 输出：6
console.log(curriedAdd(1, 2, 3));      // 输出：6

// 部分应用
const add5 = curriedAdd(5);
const add5And2 = add5(2);

console.log(add5And2(3));              // 输出：10
console.log(add5(2, 3));               // 输出：10
```

### 2.2 实际应用场景 - 配置函数

```typescript
import { curry } from './compose-skill';

// 创建带配置的日志函数
const log = curry(
  (prefix: string, level: string, message: string) => {
    console.log(`[${prefix}] ${level}: ${message}`);
  }
);

// 创建特定前缀的日志函数
const appLog = log('[MyApp]');
const errorLog = appLog('ERROR');
const warnLog = appLog('WARN');

// 使用
errorLog('Something went wrong!');
// 输出：[MyApp] ERROR: Something went wrong!

warnLog('This is a warning');
// 输出：[MyApp] WARN: This is a warning
```

### 2.3 partial - 部分应用

```typescript
import { partial, partialRight } from './compose-skill';

// 基础示例
const greet = (greeting: string, punctuation: string, name: string) => {
  return `${greeting}${punctuation} ${name}`;
};

// 预先填充前面的参数
const sayHello = partial(greet, 'Hello', '!');
console.log(sayHello('World'));  // 输出："Hello! World"

// 预先填充后面的参数
const greetWorld = partialRight(greet, 'World');
console.log(greetWorld('Hi', '!'));  // 输出："Hi! World"
```

### 2.4 实际应用场景 - API 请求封装

```typescript
import { partial } from './compose-skill';

// 通用请求函数
const request = async (
  baseUrl: string,
  endpoint: string,
  method: string,
  data: any
) => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
};

// 创建特定 API 的请求函数
const apiBase = 'https://api.example.com';
const apiRequest = partial(request, apiBase);

// 创建特定端点的请求函数
const getUser = apiRequest('/users', 'GET');
const createUser = apiRequest('/users', 'POST');

// 使用
const user = await getUser(null);
const newUser = await createUser({ name: 'John' });
```

---

## 3. 防抖节流 (debounce/throttle)

### 3.1 debounce - 防抖

```typescript
import { debounce } from './compose-skill';

// 基础示例
const logSearch = (query: string) => {
  console.log('Searching for:', query);
};

// 300ms 防抖
const debouncedSearch = debounce(logSearch, { delay: 300 });

// 快速连续调用
debouncedSearch('a');
debouncedSearch('ab');
debouncedSearch('abc');
// 300ms 后只执行一次，输出："Searching for: abc"

// 取消执行
debouncedSearch('test');
debouncedSearch.cancel();
// 不会输出，因为被取消了
```

### 3.2 实际应用场景 - 搜索框

```typescript
import { debounce } from './compose-skill';

// React 示例
function SearchBox() {
  const [query, setQuery] = useState('');
  
  // 防抖搜索函数
  const searchAPI = debounce(async (q: string) => {
    if (!q) return;
    const results = await fetch(`/api/search?q=${q}`);
    console.log('Results:', results);
  }, { delay: 500 });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    searchAPI(value);  // 只在停止输入 500ms 后执行
  };
  
  return <input value={query} onChange={handleChange} />;
}
```

### 3.3 throttle - 节流

```typescript
import { throttle } from './compose-skill';

// 基础示例
const logClick = () => {
  console.log('Button clicked at', new Date().toISOString());
};

// 1 秒节流
const throttledClick = throttle(logClick, { interval: 1000 });

// 快速连续点击
throttledClick();  // 立即执行
throttledClick();  // 忽略
throttledClick();  // 忽略
// 1 秒后可以再次执行
```

### 3.4 实际应用场景 - 滚动事件

```typescript
import { throttle } from './compose-skill';

// 监听滚动事件
const handleScroll = throttle(() => {
  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = window.innerHeight;
  
  // 检查是否滚动到底部
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    console.log('Load more content...');
    // loadMoreContent();
  }
}, { interval: 200 });

window.addEventListener('scroll', handleScroll);

// 清理
// window.removeEventListener('scroll', handleScroll);
// handleScroll.cancel();
```

### 3.5 实际应用场景 - 表单提交

```typescript
import { debounce } from './compose-skill';

// 防止重复提交
const submitForm = debounce(async (data: FormData) => {
  console.log('Submitting form...');
  await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}, { delay: 1000, leading: true });

// 用户快速点击多次，只会提交一次
submitButton.addEventListener('click', () => {
  submitForm(formData);
});
```

---

## 4. 工具函数

### 4.1 identity - 恒等函数

```typescript
import { identity, pipe } from './compose-skill';

// 作为默认值
const getValue = (condition: boolean) => {
  return pipe(
    condition ? transform : identity,
    validate
  )(defaultValue);
};

// 占位符
const process = pipe(
  step1,
  shouldSkipStep2 ? identity : step2,
  step3
);
```

### 4.2 once - 只执行一次

```typescript
import { once } from './compose-skill';

// 初始化只执行一次
const initialize = once(() => {
  console.log('Initializing...');
  // 执行初始化逻辑
  return { config: {} };
});

initialize();  // 输出："Initializing..."
initialize();  // 无输出
initialize();  // 无输出
```

### 4.3 memoize - 记忆化

```typescript
import { memoize } from './compose-skill';

// 优化递归计算
const fibonacci = memoize((n: number): number => {
  console.log(`Computing fib(${n})`);
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

console.log(fibonacci(10));  // 会输出多次 Computing
console.log(fibonacci(10));  // 直接返回缓存，无输出
```

### 4.4 negate - 取反

```typescript
import { negate, filter } from './compose-skill';

// 基础示例
const isEven = (n: number) => n % 2 === 0;
const isOdd = negate(isEven);

console.log(isEven(2));  // true
console.log(isOdd(2));   // false

// 配合 filter 使用
const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(isEven);  // [2, 4, 6]
const odds = numbers.filter(isOdd);    // [1, 3, 5]
```

---

## 5. 综合示例

### 5.1 数据处理流水线

```typescript
import { pipe, curry, debounce } from './compose-skill';

// 柯里化的数据处理函数
const transform = curry((
  format: 'json' | 'csv',
  filter: (item: any) => boolean,
  data: any[]
) => {
  const filtered = data.filter(filter);
  return format === 'json' 
    ? JSON.stringify(filtered)
    : filtered.map(Object.values).join('\n');
});

// 创建特定的转换器
const jsonTransformer = transform('json');
const csvTransformer = transform('csv');

// 防抖的执行函数
const executeTransform = debounce(
  (transformFn: any, filterFn: any, data: any[]) => {
    const result = transformFn(filterFn, data);
    console.log('Transform result:', result);
  },
  { delay: 300 }
);

// 使用
const activeFilter = (item: any) => item.active;
executeTransform(jsonTransformer, activeFilter, testData);
```

### 5.2 React 自定义 Hook

```typescript
import { debounce, throttle } from './compose-skill';
import { useEffect, useRef } from 'react';

// 使用防抖的搜索 Hook
function useDebounceSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const debouncedSearch = useRef(
    debounce(searchFn, { delay })
  ).current;
  
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);
  
  return debouncedSearch;
}

// 使用节流的滚动 Hook
function useThrottledScroll(callback: () => void, interval: number = 100) {
  const throttledCallback = useRef(
    throttle(callback, { interval })
  ).current;
  
  useEffect(() => {
    window.addEventListener('scroll', throttledCallback);
    return () => {
      throttledCallback.cancel();
      window.removeEventListener('scroll', throttledCallback);
    };
  }, [throttledCallback]);
}
```

---

## 6. 性能对比

### 6.1 防抖 vs 节流

| 场景 | 推荐 | 原因 |
|------|------|------|
| 搜索框输入 | debounce | 只需处理最终输入 |
| 窗口 resize | debounce | 只需处理最终大小 |
| 滚动事件 | throttle | 需要定期响应 |
| 按钮点击 | throttle | 防止重复提交 |
| 鼠标移动 | throttle | 需要平滑跟踪 |
| API 轮询 | throttle | 限制请求频率 |

### 6.2 curry vs partial

| 特性 | curry | partial |
|------|-------|---------|
| 参数应用 | 逐个或批量 | 一次批量 |
| 灵活性 | 高 | 中 |
| 性能 | 略低 (多次调用) | 略高 |
| 适用场景 | 函数式组合 | 配置预设 |

---

## 7. 最佳实践

1. **compose/pipe**: 用于创建清晰的数据处理管道
2. **curry**: 用于创建可配置的高阶函数
3. **partial**: 用于预设常用配置
4. **debounce**: 用于"等待完成"的场景
5. **throttle**: 用于"定期执行"的场景
6. **memoize**: 用于纯函数的性能优化
7. **once**: 用于初始化/单次操作

---

**作者:** Axon  
**版本:** 1.0.0  
**最后更新:** 2026-03-13

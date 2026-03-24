/**
 * ACE Function Utils - 使用示例
 * 
 * 演示如何使用函数式编程工具集
 */

import {
  curry,
  partial,
  partialRight,
  compose,
  pipe,
  composeAsync,
  pipeAsync,
  debounce,
  throttle,
  rafThrottle,
  once,
  negate,
} from './function-utils-skill';

// ============= 1. 函数柯里化示例 =============

console.log('=== 柯里化示例 ===');

// 基础柯里化
const add = (a: number, b: number, c: number): number => a + b + c;
const curriedAdd = curry(add);

console.log(curriedAdd(1)(2)(3)); // 6
console.log(curriedAdd(1, 2)(3)); // 6
console.log(curriedAdd(1)(2, 3)); // 6
console.log(curriedAdd(1, 2, 3)); // 6

// 部分应用 - 创建专用函数
const multiply = (a: number, b: number, c: number): number => a * b * c;
const double = partial(multiply, 2); // 固定第一个参数为 2

console.log(double(3, 4)); // 24 (2 * 3 * 4)

// 从右侧部分应用
const greet = (greeting: string, name: string): string => `${greeting}, ${name}!`;
const greetHello = partialRight(greet, 'World');

console.log(greetHello('Hello')); // "Hello, World!"

// 实际场景：创建 API 请求函数
const fetchAPI = async (baseUrl: string, endpoint: string, params: Record<string, any>) => {
  const url = `${baseUrl}/${endpoint}?${new URLSearchParams(params).toString()}`;
  console.log(`Fetching: ${url}`);
  return { url };
};

const fetchFromGitHub = partial(fetchAPI, 'https://api.github.com');
// 现在可以复用这个配置好的函数
// fetchFromGitHub('/users', { username: 'axon' });

// ============= 2. 函数组合/管道示例 =============

console.log('\n=== 组合/管道示例 ===');

// 基础函数
const add2 = (x: number): number => x + 2;
const multiply3 = (x: number): number => x * 3;
const toString = (x: number): string => x.toString();

// compose - 从右到左执行
const addThenMultiply = compose(multiply3, add2);
console.log(addThenMultiply(5)); // 21 (5+2=7, 7*3=21)

// pipe - 从左到右执行 (更直观)
const addThenMultiplyPipe = pipe(add2, multiply3);
console.log(addThenMultiplyPipe(5)); // 21

// 复杂管道：数据处理
const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true },
];

const filterActive = (users: typeof users) => users.filter(u => u.active);
const getNames = (users: typeof users) => users.map(u => u.name);
const toUpperCase = (names: string[]) => names.map(n => n.toUpperCase());

const getActiveUserNames = pipe(filterActive, getNames, toUpperCase);
console.log(getActiveUserNames(users)); // ['ALICE', 'CHARLIE']

// 异步组合
const fetchUser = async (id: string) => {
  console.log(`Fetching user ${id}...`);
  return { id, name: 'John', email: 'john@example.com' };
};

const getUserName = (user: { name: string }): string => user.name;
const toGreeting = (name: string): string => `Hello, ${name}!`;

const getUserGreeting = pipeAsync(fetchUser, getUserName, toGreeting);
// getUserGreeting('123').then(console.log); // "Hello, John!"

// ============= 3. 防抖/节流示例 =============

console.log('\n=== 防抖/节流示例 ===');

// 防抖：搜索框自动保存
const saveToServer = (data: string) => {
  console.log(`Saving: ${data}`);
};

const debouncedSave = debounce(saveToServer, 1000); // 1 秒防抖

// 模拟快速输入
debouncedSave('A');
debouncedSave('AB');
debouncedSave('ABC');
debouncedSave('ABCD');
// 只会保存最后一次 "ABCD"，在 1 秒后执行

// 立即执行的防抖
const debouncedSaveImmediate = debounce(saveToServer, 1000, { immediate: true });
debouncedSaveImmediate('First'); // 立即执行
debouncedSaveImmediate('Second'); // 重置计时器

// 节流：滚动事件处理
const handleScroll = () => {
  console.log('Scroll event handled');
};

const throttledScroll = throttle(handleScroll, 200); // 200ms 节流

// 模拟快速滚动
for (let i = 0; i < 10; i++) {
  throttledScroll();
}
// 只会执行几次，而不是 10 次

// 节流选项：控制首尾执行
const throttledLeading = throttle(handleScroll, 200, { leading: true, trailing: false });
const throttledTrailing = throttle(handleScroll, 200, { leading: false, trailing: true });

// 动画优化：requestAnimationFrame 节流
const animate = () => {
  console.log('Animating...');
};

const rafAnimated = rafThrottle(animate);
// requestAnimationFrame(rafAnimated);

// ============= 4. 辅助工具示例 =============

console.log('\n=== 辅助工具示例 ===');

// once - 只执行一次
let initCount = 0;
const initialize = once(() => {
  initCount++;
  console.log('Initialized');
});

initialize(); // 输出: Initialized
initialize(); // 无输出
console.log('Init count:', initCount); // 1

// negate - 取反
const isEven = (n: number): boolean => n % 2 === 0;
const isOdd = negate(isEven);

console.log(isEven(4)); // true
console.log(isOdd(4));  // false
console.log(isOdd(3));  // true

// ============= 5. 实际应用场景 =============

console.log('\n=== 实际应用场景 ===');

// 场景 1: Redux reducer 组合
const withLoading = (state: any) => ({ ...state, loading: true });
const withData = (data: any) => (state: any) => ({ ...state, data, loading: false });
const withError = (error: any) => (state: any) => ({ ...state, error, loading: false });

// 场景 2: 表单验证管道
const isRequired = (value: string) => value.trim() !== '';
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isLength = (min: number, max: number) => (value: string) => 
  value.length >= min && value.length <= max;

const validateEmail = pipe(
  (value: string) => isRequired(value) && isEmail(value) && isLength(5, 50)(value)
);

console.log(validateEmail('test@example.com')); // true
console.log(validateEmail('invalid')); // false

// 场景 3: 日志装饰器
const withLogging = <F extends AnyFunction>(fn: F, name: string): F => {
  return function (this: any, ...args: any[]) {
    console.log(`[${name}] Called with:`, args);
    const result = fn.apply(this, args);
    console.log(`[${name}] Returned:`, result);
    return result;
  } as F;
};

const loggedAdd = withLogging(add, 'add');
console.log(loggedAdd(1, 2, 3)); // 6

// 场景 4: 缓存装饰器
const memoize = <F extends AnyFunction>(fn: F): F => {
  const cache = new Map<string, any>();
  
  return function (this: any, ...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log(`[Cache Hit] ${key}`);
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    console.log(`[Cache Miss] ${key}`);
    return result;
  } as F;
};

const expensiveCalculation = (n: number): number => {
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += n;
  }
  return result;
};

const memoizedCalc = memoize(expensiveCalc);
console.log(memoizedCalc(5)); // 第一次计算
console.log(memoizedCalc(5)); // 从缓存读取

console.log('\n=== 示例完成 ===');

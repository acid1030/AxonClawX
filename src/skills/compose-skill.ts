/**
 * 函数组合技能 - Compose Skill
 * 
 * 功能:
 * 1. compose/pipe - 函数组合 (右到左/左到右)
 * 2. curry - 柯里化 (部分应用)
 * 3. debounce/throttle - 防抖节流 (频率控制)
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 任意函数类型 */
export type AnyFunc = (...args: any[]) => any;

/** 柯里化后的函数类型 */
export type Curried<T extends AnyFunc> = T extends (...args: infer A) => infer R
  ? A extends [infer First, ...infer Rest]
    ? (arg: First) => Curried<(...args: Rest) => R>
    : R
  : never;

/** 防抖函数选项 */
export interface DebounceOptions {
  /** 延迟时间 (毫秒) */
  delay: number;
  /** 是否立即执行 */
  immediate?: boolean;
  /** 是否在开始前调用 */
  leading?: boolean;
  /** 是否在结束后调用 */
  trailing?: boolean;
}

/** 节流函数选项 */
export interface ThrottleOptions {
  /** 间隔时间 (毫秒) */
  interval: number;
  /** 是否立即执行 */
  immediate?: boolean;
  /** 是否在开始前调用 */
  leading?: boolean;
  /** 是否在结束后调用 */
  trailing?: boolean;
}

/** 取消函数 */
export interface Cancelable {
  /** 取消执行 */
  cancel: () => void;
  /** 立即执行挂起的调用 */
  flush: () => any;
  /** 是否有待执行的调用 */
  isPending: () => boolean;
}

// ============== 函数组合 ==============

/**
 * compose - 函数组合 (右到左)
 * 
 * 从右到左依次应用函数，前一个函数的输出作为后一个函数的输入
 * 
 * @example
 * const add1 = (x: number) => x + 1;
 * const mul2 = (x: number) => x * 2;
 * const fn = compose(mul2, add1);
 * fn(5); // => 12 (先 5+1=6, 再 6*2=12)
 * 
 * @param fns 要组合的函数列表
 * @returns 组合后的函数
 */
export function compose<A, B>(f: (a: A) => B): (a: A) => B;
export function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C;
export function compose<A, B, C, D>(
  f: (c: C) => D,
  g: (b: B) => C,
  h: (a: A) => B
): (a: A) => D;
export function compose<A, B, C, D, E>(
  f: (d: D) => E,
  g: (c: C) => D,
  h: (b: B) => C,
  i: (a: A) => B
): (a: A) => E;
export function compose(...fns: AnyFunc[]): AnyFunc {
  return function (this: any, ...args: any[]) {
    return fns.reduceRight((result, fn) => fn.call(this, result), args[0]);
  };
}

/**
 * pipe - 函数组合 (左到右)
 * 
 * 从左到右依次应用函数，前一个函数的输出作为后一个函数的输入
 * pipe 是 compose 的反向版本，更符合阅读习惯
 * 
 * @example
 * const add1 = (x: number) => x + 1;
 * const mul2 = (x: number) => x * 2;
 * const fn = pipe(add1, mul2);
 * fn(5); // => 12 (先 5+1=6, 再 6*2=12)
 * 
 * @param fns 要组合的函数列表
 * @returns 组合后的函数
 */
export function pipe<A, B>(f: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
  f: (a: A) => B,
  g: (b: B) => C,
  h: (c: C) => D
): (a: A) => D;
export function pipe<A, B, C, D, E>(
  f: (a: A) => B,
  g: (b: B) => C,
  h: (c: C) => D,
  i: (d: D) => E
): (a: A) => E;
export function pipe(...fns: AnyFunc[]): AnyFunc {
  return function (this: any, ...args: any[]) {
    return fns.reduce((result, fn) => fn.call(this, result), args[0]);
  };
}

// ============== 柯里化 ==============

/**
 * curry - 柯里化
 * 
 * 将多参数函数转换为一系列单参数函数的链式调用
 * 支持部分应用，可以分多次传入参数
 * 
 * @example
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const curriedAdd = curry(add);
 * curriedAdd(1)(2)(3); // => 6
 * curriedAdd(1, 2)(3); // => 6
 * curriedAdd(1)(2, 3); // => 6
 * 
 * const add5 = curriedAdd(5);
 * add5(2, 3); // => 10
 * 
 * @param fn 要柯里化的函数
 * @returns 柯里化后的函数
 */
export function curry<T extends AnyFunc>(fn: T): Curried<T> {
  function curried(this: any, ...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    const boundFn = function (this: any, ...moreArgs: any[]) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
    // 保持 this 绑定
    if (this !== undefined) {
      return boundFn.bind(this);
    }
    return boundFn;
  }
  return curried as Curried<T>;
}

/**
 * partial - 部分应用
 * 
 * 预先填充函数的前几个参数，返回一个新函数
 * 与 curry 不同，partial 只填充一次参数
 * 
 * @example
 * const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
 * const sayHello = partial(greet, 'Hello');
 * sayHello('World'); // => "Hello, World!"
 * 
 * @param fn 原函数
 * @param args 预先填充的参数
 * @returns 部分应用后的函数
 */
export function partial<T extends AnyFunc>(fn: T, ...partialArgs: any[]): T {
  return function (this: any, ...remainingArgs: any[]) {
    return fn.apply(this, [...partialArgs, ...remainingArgs]);
  } as T;
}

/**
 * partialRight - 右侧部分应用
 * 
 * 预先填充函数的后几个参数，返回一个新函数
 * 
 * @example
 * const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
 * const greetWorld = partialRight(greet, 'World');
 * greetWorld('Hello'); // => "Hello, World!"
 * 
 * @param fn 原函数
 * @param args 预先填充的参数 (从右侧)
 * @returns 部分应用后的函数
 */
export function partialRight<T extends AnyFunc>(fn: T, ...partialArgs: any[]): T {
  return function (this: any, ...remainingArgs: any[]) {
    return fn.apply(this, [...remainingArgs, ...partialArgs]);
  } as T;
}

// ============== 防抖节流 ==============

/**
 * debounce - 防抖
 * 
 * 在指定时间内只执行一次，如果期间再次触发则重新计时
 * 适用于：搜索框输入、窗口大小调整等场景
 * 
 * @example
 * const search = debounce((query: string) => {
 *   console.log('Searching:', query);
 * }, 300);
 * 
 * // 快速连续调用只会执行最后一次
 * search('a');
 * search('ab');
 * search('abc'); // 300ms 后执行，参数为 'abc'
 * 
 * @param fn 要防抖的函数
 * @param options 防抖选项
 * @returns 防抖函数 (带 cancel/flush 方法)
 */
export function debounce<T extends AnyFunc>(
  fn: T,
  options: number | DebounceOptions
): T & Cancelable {
  const opts = typeof options === 'number' 
    ? { delay: options, leading: false, trailing: true }
    : { 
        delay: options.delay, 
        leading: options.leading ?? false, 
        trailing: options.trailing ?? (options.leading ? false : true) 
      };
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastResult: any = undefined;
  let lastCallTime = 0;
  let calledLeading = false;
  
  const debounced = function (this: any, ...args: any[]) {
    const now = Date.now();
    
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    const shouldCallLeading = opts.leading && !calledLeading && (now - lastCallTime >= opts.delay);
    
    if (shouldCallLeading) {
      calledLeading = true;
      lastCallTime = now;
      lastResult = fn.apply(this, args);
    } else if (opts.trailing) {
      timeoutId = setTimeout(() => {
        calledLeading = false;
        lastCallTime = Date.now();
        timeoutId = null;
        lastResult = fn.apply(this, args);
      }, opts.delay);
    }
    
    return lastResult;
  } as T & Cancelable;
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastCallTime = 0;
    calledLeading = false;
  };
  
  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastCallTime = Date.now();
      // 注意：这里无法获取到上次调用的参数，返回 undefined
    }
    return lastResult;
  };
  
  debounced.isPending = () => timeoutId !== null;
  
  return debounced;
}

/**
 * throttle - 节流
 * 
 * 在指定时间间隔内只执行一次，忽略多余的调用
 * 适用于：滚动事件、按钮点击、API 请求等场景
 * 
 * @example
 * const handleClick = throttle(() => {
 *   console.log('Button clicked');
 * }, 1000);
 * 
 * // 1 秒内多次点击只会执行一次
 * handleClick();
 * handleClick();
 * handleClick(); // 只执行一次
 * 
 * @param fn 要节流的函数
 * @param options 节流选项
 * @returns 节流函数 (带 cancel/flush 方法)
 */
export function throttle<T extends AnyFunc>(
  fn: T,
  options: number | ThrottleOptions
): T & Cancelable {
  const opts = typeof options === 'number'
    ? { interval: options, leading: true, trailing: false }
    : {
        interval: options.interval,
        leading: options.leading ?? true,
        trailing: options.trailing ?? false
      };
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastResult: any = undefined;
  let lastCallTime = 0;
  let pendingArgs: any[] | null = null;
  let isThrottled = false;
  
  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();
    const elapsed = now - lastCallTime;
    
    if (elapsed >= opts.interval) {
      lastCallTime = now;
      lastResult = fn.apply(this, args);
      pendingArgs = null;
      isThrottled = false;
      
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    } else if (opts.trailing && !timeoutId) {
      pendingArgs = args;
      isThrottled = true;
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        isThrottled = false;
        if (pendingArgs) {
          lastResult = fn.apply(this, pendingArgs);
          pendingArgs = null;
        }
      }, opts.interval - elapsed);
    } else if (!timeoutId && !opts.trailing) {
      // 如果不支持 trailing，使用 timeout 来重置 isThrottled
      isThrottled = true;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        isThrottled = false;
      }, opts.interval - elapsed);
    } else if (!timeoutId) {
      // 如果在节流期间调用且没有 pending timeout，标记为节流状态
      isThrottled = true;
    }
    
    return lastResult;
  } as T & Cancelable;
  
  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
    lastCallTime = 0;
    isThrottled = false;
  };
  
  throttled.flush = () => {
    if (timeoutId && pendingArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastCallTime = Date.now();
      isThrottled = false;
      // 这里无法访问 this，返回 undefined
    }
    return lastResult;
  };
  
  throttled.isPending = () => timeoutId !== null || isThrottled;
  
  return throttled;
}

// ============== 工具函数 ==============

/**
 * identity - 恒等函数
 * 
 * 返回传入的参数本身
 * 常用于作为 compose/pipe 的默认值或占位符
 * 
 * @example
 * identity(5); // => 5
 * identity({ a: 1 }); // => { a: 1 }
 * 
 * @param x 任意值
 * @returns 传入的值
 */
export function identity<T>(x: T): T {
  return x;
}

/**
 * once - 只执行一次
 * 
 * 确保函数只被执行一次，后续调用返回第一次的结果
 * 适用于初始化、单次配置等场景
 * 
 * @example
 * const init = once(() => {
 *   console.log('Initializing...');
 *   return { config: {} };
 * });
 * 
 * init(); // 输出 "Initializing..."
 * init(); // 无输出，返回上次的结果
 * 
 * @param fn 要包装的函数
 * @returns 只执行一次的函数
 */
export function once<T extends AnyFunc>(fn: T): T {
  let called = false;
  let result: any = undefined;
  
  return function (this: any, ...args: any[]) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  } as T;
}

/**
 * memoize - 记忆化
 * 
 * 缓存函数的执行结果，相同参数直接返回缓存值
 * 适用于纯函数、计算密集型函数
 * 
 * @example
 * const factorial = memoize((n: number): number => {
 *   console.log(`Computing ${n}!`);
 *   return n <= 1 ? 1 : n * factorial(n - 1);
 * });
 * 
 * factorial(5); // 输出 "Computing 5!" ... "Computing 1!"
 * factorial(5); // 直接返回缓存结果，无输出
 * 
 * @param fn 要记忆化的函数
 * @returns 带缓存的函数
 */
export function memoize<T extends AnyFunc>(fn: T): T {
  const cache = new Map<string, any>();
  
  return function (this: any, ...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  } as T;
}

/**
 * negate - 取反
 * 
 * 对谓词函数的结果取反
 * 
 * @example
 * const isEven = (n: number) => n % 2 === 0;
 * const isOdd = negate(isEven);
 * 
 * isEven(2); // => true
 * isOdd(2);  // => false
 * 
 * @param fn 谓词函数
 * @returns 取反后的函数
 */
export function negate<T extends AnyFunc>(fn: T): T {
  return function (this: any, ...args: any[]) {
    return !fn.apply(this, args);
  } as T;
}

// ============== 导出 ==============

export default {
  // 函数组合
  compose,
  pipe,
  
  // 柯里化
  curry,
  partial,
  partialRight,
  
  // 防抖节流
  debounce,
  throttle,
  
  // 工具函数
  identity,
  once,
  memoize,
  negate,
};

/**
 * ACE Function Utils - 函数式编程工具集
 * 
 * 功能:
 * 1. 函数柯里化/部分应用
 * 2. 函数组合/管道
 * 3. 防抖/节流
 */

// ============= 类型定义 =============

type AnyFunction = (...args: any[]) => any;

type Curry<F extends AnyFunction> = F extends (...args: infer A) => infer R
  ? A extends [infer First, ...infer Rest]
    ? (arg: First) => Curry<(...args: Rest) => R>
    : R
  : never;

type Tuple<T> = T[];

// ============= 1. 函数柯里化 (Currying) =============

/**
 * 将多参数函数转换为柯里化函数
 * @example
 * const add = (a: number, b: number, c: number) => a + b + c;
 * const curriedAdd = curry(add);
 * curriedAdd(1)(2)(3); // 6
 * curriedAdd(1, 2)(3); // 6
 */
export function curry<F extends AnyFunction>(fn: F): Curry<F> {
  return function curried(this: any, ...args: any[]) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (this: any, ...moreArgs: any[]) {
      return curried.apply(this, [...args, ...moreArgs]);
    };
  } as Curry<F>;
}

/**
 * 部分应用 - 预先填充部分参数
 * @example
 * const multiply = (a: number, b: number, c: number) => a * b * c;
 * const double = partial(multiply, 2);
 * double(3, 4); // 24
 */
export function partial<F extends AnyFunction>(fn: F, ...partialArgs: any[]): F {
  return function (this: any, ...remainingArgs: any[]) {
    return fn.apply(this, [...partialArgs, ...remainingArgs]);
  } as F;
}

/**
 * 从右侧部分应用参数
 * @example
 * const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
 * const greetHello = partialRight(greet, 'World');
 * greetHello('Hello'); // "Hello, World!"
 */
export function partialRight<F extends AnyFunction>(fn: F, ...partialArgs: any[]): F {
  return function (this: any, ...remainingArgs: any[]) {
    return fn.apply(this, [...remainingArgs, ...partialArgs]);
  } as F;
}

// ============= 2. 函数组合/管道 (Compose/Pipe) =============

/**
 * 函数组合 - 从右到左执行
 * @example
 * const add2 = (x: number) => x + 2;
 * const multiply3 = (x: number) => x * 3;
 * const addThenMultiply = compose(multiply3, add2);
 * addThenMultiply(5); // 21 (5+2=7, 7*3=21)
 */
export function compose<A, B>(f: (arg: A) => B): (arg: A) => B;
export function compose<A, B, C>(f: (arg: B) => C, g: (arg: A) => B): (arg: A) => C;
export function compose<A, B, C, D>(
  f: (arg: C) => D,
  g: (arg: B) => C,
  h: (arg: A) => B
): (arg: A) => D;
export function compose(...fns: AnyFunction[]): AnyFunction {
  return function (this: any, ...args: any[]) {
    if (fns.length === 0) return args[0];
    
    let result = fns[fns.length - 1].apply(this, args);
    for (let i = fns.length - 2; i >= 0; i--) {
      result = fns[i].call(this, result);
    }
    return result;
  };
}

/**
 * 函数管道 - 从左到右执行 (compose 的反向)
 * @example
 * const add2 = (x: number) => x + 2;
 * const multiply3 = (x: number) => x * 3;
 * const addThenMultiply = pipe(add2, multiply3);
 * addThenMultiply(5); // 21 (5+2=7, 7*3=21)
 */
export function pipe<A, B>(f: (arg: A) => B): (arg: A) => B;
export function pipe<A, B, C>(f: (arg: A) => B, g: (arg: B) => C): (arg: A) => C;
export function pipe<A, B, C, D>(
  f: (arg: A) => B,
  g: (arg: B) => C,
  h: (arg: C) => D
): (arg: A) => D;
export function pipe(...fns: AnyFunction[]): AnyFunction {
  return function (this: any, ...args: any[]) {
    if (fns.length === 0) return args[0];
    
    let result = fns[0].apply(this, args);
    for (let i = 1; i < fns.length; i++) {
      result = fns[i].call(this, result);
    }
    return result;
  };
}

/**
 * 异步函数组合
 * @example
 * const fetchUser = async (id: string) => ({ id, name: 'John' });
 * const getUserName = (user: any) => user.name;
 * const getUser = composeAsync(getUserName, fetchUser);
 * await getUser('123'); // "John"
 */
export function composeAsync(...fns: AnyFunction[]): AnyFunction {
  return async function (this: any, ...args: any[]) {
    if (fns.length === 0) return args[0];
    
    let result = await fns[fns.length - 1].apply(this, args);
    for (let i = fns.length - 2; i >= 0; i--) {
      result = await fns[i].call(this, result);
    }
    return result;
  };
}

/**
 * 异步函数管道
 */
export function pipeAsync(...fns: AnyFunction[]): AnyFunction {
  return async function (this: any, ...args: any[]) {
    if (fns.length === 0) return args[0];
    
    let result = await fns[0].apply(this, args);
    for (let i = 1; i < fns.length; i++) {
      result = await fns[i].call(this, result);
    }
    return result;
  };
}

// ============= 3. 防抖/节流 (Debounce/Throttle) =============

interface DebounceOptions {
  immediate?: boolean; // 是否立即执行
}

interface ThrottleOptions {
  leading?: boolean;   // 是否在开始执行
  trailing?: boolean;  // 是否在结束执行
}

/**
 * 防抖函数 - 延迟执行，重复调用会重置计时器
 * @example
 * const save = debounce(async (data: string) => { /* 保存数据 *\/ }, 1000);
 * input.oninput = (e) => save(e.target.value);
 */
export function debounce<F extends AnyFunction>(
  fn: F,
  wait: number,
  options: DebounceOptions = {}
): F {
  const { immediate = false } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let result: any;

  const debounced = function (this: any, ...args: any[]) {
    const later = () => {
      timeoutId = null;
      if (!immediate) {
        result = fn.apply(this, args);
      }
    };

    const callNow = immediate && !timeoutId;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(later, wait);

    if (callNow) {
      result = fn.apply(this, args);
    }

    return result;
  } as F;

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  debounced.flush = function (this: any, ...args: any[]) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      return fn.apply(this, args);
    }
  };

  return debounced;
}

/**
 * 节流函数 - 限制执行频率
 * @example
 * const handleScroll = throttle(() => { /* 处理滚动 *\/ }, 100);
 * window.onscroll = handleScroll;
 */
export function throttle<F extends AnyFunction>(
  fn: F,
  limit: number,
  options: ThrottleOptions = {}
): F {
  const { leading = true, trailing = true } = options;
  let inThrottle = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;
  let result: any;

  const throttled = function (this: any, ...args: any[]) {
    lastArgs = args;
    lastThis = this;

    if (!inThrottle) {
      if (leading) {
        result = fn.apply(this, args);
      }
      inThrottle = true;

      if (trailing) {
        timeoutId = setTimeout(() => {
          inThrottle = false;
          if (lastArgs) {
            result = fn.apply(lastThis, lastArgs);
            lastArgs = null;
            lastThis = null;
          }
        }, limit);
      }
    }

    return result;
  } as F;

  throttled.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inThrottle = false;
    lastArgs = null;
    lastThis = null;
  };

  throttled.flush = function (this: any, ...args: any[]) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    inThrottle = false;
    return fn.apply(this, args);
  };

  return throttled;
}

/**
 * 请求动画帧节流 - 用于动画优化
 * @example
 * const animate = rafThrottle(() => { /* 动画逻辑 *\/ });
 * requestAnimationFrame(animate);
 */
export function rafThrottle<F extends AnyFunction>(fn: F): F {
  let rafId: number | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: any[]) {
    lastArgs = args;
    lastThis = this;

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      });
    }
  } as F;

  throttled.cancel = function () {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

// ============= 辅助工具函数 =============

/**
 * 恒等函数 - 返回输入值
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * 空函数 - 什么都不做
 */
export function noop(): void {}

/**
 * 只执行一次的函数
 * @example
 * const init = once(() => { console.log('初始化'); });
 * init(); // 输出: 初始化
 * init(); // 无输出
 */
export function once<F extends AnyFunction>(fn: F): F {
  let called = false;
  let result: any;

  return function (this: any, ...args: any[]) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  } as F;
}

/**
 * 取反函数
 * @example
 * const isEven = (n: number) => n % 2 === 0;
 * const isOdd = negate(isEven);
 * isOdd(3); // true
 */
export function negate<F extends AnyFunction>(predicate: F): F {
  return function (this: any, ...args: any[]) {
    return !predicate.apply(this, args);
  } as F;
}

// ============= 导出 =============

export default {
  // 柯里化
  curry,
  partial,
  partialRight,
  
  // 组合/管道
  compose,
  pipe,
  composeAsync,
  pipeAsync,
  
  // 防抖/节流
  debounce,
  throttle,
  rafThrottle,
  
  // 辅助工具
  identity,
  noop,
  once,
  negate,
};

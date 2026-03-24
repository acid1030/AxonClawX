/**
 * 防抖节流工具技能
 * 
 * 功能:
 * 1. 防抖函数 (debounce) - 延迟执行，适用于搜索框、窗口调整等
 * 2. 节流函数 (throttle) - 限制频率，适用于滚动、按钮点击等
 * 3. 请求动画帧 (raf) - 性能优化的动画执行
 * 
 * @module skills/debounce-utils
 */

// ==================== 防抖函数 ====================

/**
 * 防抖函数选项
 */
export interface DebounceOptions {
  /** 是否立即执行第一次 */
  immediate?: boolean;
  /** 回调函数上下文 */
  context?: any;
}

/**
 * 防抖函数
 * 
 * 原理：在事件被触发 n 秒后再执行回调，如果在 n 秒内又被触发，则重新计时
 * 适用场景：搜索框输入、窗口 resize、表单验证等
 * 
 * @param fn - 要执行的函数
 * @param delay - 延迟时间 (毫秒)
 * @param options - 选项配置
 * @returns 防抖后的函数
 * 
 * @example
 * // 基础用法
 * const searchHandler = debounce((query) => {
 *   console.log('搜索:', query);
 * }, 300);
 * 
 * // 立即执行第一次
 * const clickHandler = debounce(() => {
 *   console.log('点击');
 * }, 500, { immediate: true });
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const { immediate = false, context } = options;
  let isImmediateExecuted = false;

  const debounced = function (this: any, ...args: Parameters<T>) {
    const callNow = immediate && !isImmediateExecuted;
    const currentContext = context || this;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (callNow) {
      fn.apply(currentContext, args);
      isImmediateExecuted = true;
    } else {
      timeoutId = setTimeout(() => {
        fn.apply(currentContext, args);
        isImmediateExecuted = false;
        timeoutId = null;
      }, delay);
    }
  };

  /**
   * 取消防抖
   * 立即执行待处理的调用并清除定时器
   */
  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      isImmediateExecuted = false;
    }
  };

  /**
   * 检查是否有待执行的调用
   */
  debounced.pending = function (): boolean {
    return timeoutId !== null;
  };

  /**
   * 立即执行函数
   * 如果有待处理的调用，立即执行并清除定时器
   */
  debounced.flush = function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn.apply(context || this, args);
      isImmediateExecuted = false;
    }
  };

  return debounced;
}

// ==================== 节流函数 ====================

/**
 * 节流函数选项
 */
export interface ThrottleOptions {
  /** 是否在开始时执行 */
  leading?: boolean;
  /** 是否在结束时执行 */
  trailing?: boolean;
  /** 回调函数上下文 */
  context?: any;
}

/**
 * 节流函数
 * 
 * 原理：在 n 秒内只执行一次函数，如果在 n 秒内重复触发，只执行一次
 * 适用场景：滚动事件、按钮防重复点击、API 请求限制等
 * 
 * @param fn - 要执行的函数
 * @param delay - 时间间隔 (毫秒)
 * @param options - 选项配置
 * @returns 节流后的函数
 * 
 * @example
 * // 基础用法
 * const scrollHandler = throttle(() => {
 *   console.log('滚动中...');
 * }, 200);
 * 
 * // 只执行开始和结束
 * const resizeHandler = throttle(() => {
 *   console.log('窗口调整');
 * }, 500, { leading: true, trailing: true });
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  options: ThrottleOptions = {}
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastExecTime = 0;
  const { leading = true, trailing = true, context } = options;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const currentContext = context || this;
    lastArgs = args;
    lastThis = currentContext;

    // 首次执行且允许 leading
    if (!lastExecTime && !leading) {
      lastExecTime = now;
    }

    const elapsed = now - lastExecTime;

    // 时间到，执行函数
    if (elapsed >= delay) {
      lastExecTime = now;
      fn.apply(currentContext, args);
      lastArgs = null;
      lastThis = null;
    } 
    // 允许 trailing 且没有待处理的定时器
    else if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        lastExecTime = Date.now();
        timeoutId = null;
        if (lastArgs && lastThis) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, delay - elapsed);
    }
  };

  /**
   * 取消节流
   */
  throttled.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastExecTime = 0;
    lastArgs = null;
    lastThis = null;
  };

  /**
   * 立即执行函数
   */
  throttled.flush = function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastExecTime = Date.now();
    fn.apply(context || this, args);
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

// ==================== 请求动画帧 ====================

/**
 * RAF 控制器
 */
export interface RafController {
  /** 取消动画帧 */
  cancel: () => void;
  /** 检查是否正在运行 */
  isRunning: () => boolean;
  /** 立即执行下一帧 */
  flush: () => void;
}

/**
 * 请求动画帧封装
 * 
 * 原理：使用 requestAnimationFrame 进行性能优化的动画执行
 * 适用场景：动画、游戏循环、滚动优化等
 * 
 * @param callback - 回调函数，接收时间戳参数
 * @returns RAF 控制器
 * 
 * @example
 * // 基础动画循环
 * const animation = raf((timestamp) => {
 *   console.log('动画帧:', timestamp);
 *   // 继续下一帧
 *   animation.flush();
 * });
 * 
 * // 启动动画
 * animation.flush();
 * 
 * // 停止动画
 * animation.cancel();
 */
export function raf(callback: (timestamp: number) => void): RafController {
  let rafId: number | null = null;
  let isRunning = false;

  const loop = (timestamp: number) => {
    isRunning = true;
    callback(timestamp);
    isRunning = false;
  };

  const controller: RafController = {
    cancel: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      isRunning = false;
    },

    isRunning: () => isRunning,

    flush: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(loop);
    }
  };

  return controller;
}

/**
 * 节流版 RAF
 * 
 * 原理：限制 RAF 的执行频率，避免过度渲染
 * 适用场景：高频更新的动画、数据可视化等
 * 
 * @param callback - 回调函数
 * @param interval - 最小间隔时间 (毫秒)
 * @returns RAF 控制器
 * 
 * @example
 * // 限制为每秒 30 帧
 * const throttledRaf = rafThrottle((timestamp) => {
 *   console.log('节流动画帧:', timestamp);
 * }, 33); // 1000/30 ≈ 33ms
 * 
 * throttledRaf.flush();
 */
export function rafThrottle(
  callback: (timestamp: number) => void,
  interval: number = 16 // 默认约 60fps
): RafController {
  let rafId: number | null = null;
  let lastTime = 0;
  let isRunning = false;

  const loop = (timestamp: number) => {
    const elapsed = timestamp - lastTime;

    if (elapsed >= interval) {
      isRunning = true;
      callback(timestamp);
      isRunning = false;
      lastTime = timestamp;
    }

    rafId = requestAnimationFrame(loop);
  };

  const controller: RafController = {
    cancel: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      isRunning = false;
    },

    isRunning: () => isRunning,

    flush: () => {
      if (rafId === null) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    }
  };

  return controller;
}

// ==================== 组合工具 ====================

/**
 * 防抖 + 节流组合
 * 
 * 原理：先防抖后节流，适用于复杂场景
 * 适用场景：搜索建议、实时保存等
 * 
 * @param fn - 要执行的函数
 * @param debounceDelay - 防抖延迟
 * @param throttleDelay - 节流间隔
 * @returns 组合后的函数
 * 
 * @example
 * const smartSearch = debounceThrottle(
 *   (query) => fetchSuggestions(query),
 *   300, // 300ms 防抖
 *   1000 // 最少间隔 1 秒
 * );
 */
export function debounceThrottle<T extends (...args: any[]) => any>(
  fn: T,
  debounceDelay: number,
  throttleDelay: number
): (...args: Parameters<T>) => void {
  const throttledFn = throttle(fn, throttleDelay);
  return debounce(throttledFn, debounceDelay);
}

/**
 * 创建智能更新函数
 * 
 * 原理：自动选择 RAF 或 setTimeout，根据浏览器支持
 * 适用场景：需要兼容性的动画系统
 * 
 * @param callback - 回调函数
 * @param useRaf - 是否优先使用 RAF，默认 true
 * @returns 更新函数
 */
export function createSmartUpdater<T extends (...args: any[]) => any>(
  callback: T,
  useRaf: boolean = true
): (...args: Parameters<T>) => void {
  if (useRaf && typeof requestAnimationFrame !== 'undefined') {
    let rafId: number | null = null;
    
    return function (this: any, ...args: Parameters<T>) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        callback.apply(this, args);
        rafId = null;
      });
    };
  } else {
    return debounce(callback, 0);
  }
}

// ==================== 导出 ====================

export const DebounceUtils = {
  // 防抖
  debounce,
  
  // 节流
  throttle,
  
  // 请求动画帧
  raf,
  rafThrottle,
  
  // 组合工具
  debounceThrottle,
  createSmartUpdater,
};

export default DebounceUtils;

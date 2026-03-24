/**
 * ACE Observer Utils - Observable 响应式编程工具
 * 
 * 功能:
 * 1. Observable 创建
 * 2. 订阅/取消订阅
 * 3. 操作符 (map/filter/reduce)
 */

// ============== 类型定义 ==============

type Observer<T> = {
  next: (value: T) => void;
  error?: (err: any) => void;
  complete?: () => void;
};

type Subscription = {
  unsubscribe: () => void;
  closed: boolean;
};

type Operator<T, R> = (source: Observable<T>) => Observable<R>;

// ============== Observable 核心类 ==============

export class Observable<T> {
  private subscribeFn: (observer: Observer<T>) => Subscription;

  constructor(subscribeFn: (observer: Observer<T>) => Subscription) {
    this.subscribeFn = subscribeFn;
  }

  /**
   * 订阅 Observable
   */
  subscribe(observerOrNext?: Observer<T> | ((value: T) => void), error?: (err: any) => void, complete?: () => void): Subscription {
    const observer: Observer<T> = typeof observerOrNext === 'function' 
      ? { next: observerOrNext, error, complete }
      : observerOrNext || { next: () => {} };

    return this.subscribeFn(observer);
  }

  /**
   * 操作符：map - 转换数据
   */
  map<R>(project: (value: T, index: number) => R): Observable<R> {
    return new Observable<R>((observer) => {
      let index = 0;
      return this.subscribe({
        next: (value) => {
          try {
            observer.next(project(value, index++));
          } catch (err) {
            observer.error?.(err);
          }
        },
        error: (err) => observer.error?.(err),
        complete: () => observer.complete?.(),
      });
    });
  }

  /**
   * 操作符：filter - 过滤数据
   */
  filter(predicate: (value: T, index: number) => boolean): Observable<T> {
    return new Observable<T>((observer) => {
      let index = 0;
      return this.subscribe({
        next: (value) => {
          try {
            if (predicate(value, index++)) {
              observer.next(value);
            }
          } catch (err) {
            observer.error?.(err);
          }
        },
        error: (err) => observer.error?.(err),
        complete: () => observer.complete?.(),
      });
    });
  }

  /**
   * 操作符：reduce - 累积数据
   */
  reduce<R>(accumulator: (acc: R, value: T, index: number) => R, seed: R): Observable<R> {
    return new Observable<R>((observer) => {
      let acc = seed;
      let index = 0;
      let hasValue = false;

      return this.subscribe({
        next: (value) => {
          try {
            acc = accumulator(acc, value, index++);
            hasValue = true;
          } catch (err) {
            observer.error?.(err);
          }
        },
        error: (err) => observer.error?.(err),
        complete: () => {
          if (hasValue) {
            observer.next(acc);
          }
          observer.complete?.();
        },
      });
    });
  }

  /**
   * 操作符：take - 取前 N 个值
   */
  take(count: number): Observable<T> {
    return new Observable<T>((observer) => {
      let taken = 0;
      const subscription = this.subscribe({
        next: (value) => {
          if (taken < count) {
            observer.next(value);
            taken++;
            if (taken >= count) {
              observer.complete?.();
              subscription.unsubscribe();
            }
          }
        },
        error: (err) => observer.error?.(err),
        complete: () => observer.complete?.(),
      });
      return subscription;
    });
  }

  /**
   * 操作符：debounce - 防抖
   */
  debounce(delayMs: number): Observable<T> {
    return new Observable<T>((observer) => {
      let timeoutId: any = null;

      return this.subscribe({
        next: (value) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          timeoutId = setTimeout(() => {
            observer.next(value);
          }, delayMs);
        },
        error: (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          observer.error?.(err);
        },
        complete: () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            observer.complete?.();
          }
        },
      });
    });
  }

  /**
   * 操作符：merge - 合并多个 Observable
   */
  merge(...sources: Observable<T>[]): Observable<T> {
    return merge(this, ...sources);
  }

  /**
   * 转换为 Promise
   */
  toPromise(): Promise<T> {
    return new Promise((resolve, reject) => {
      let lastValue: T;
      this.subscribe({
        next: (value) => { lastValue = value; },
        error: reject,
        complete: () => resolve(lastValue!),
      });
    });
  }
}

// ============== 创建函数 ==============

/**
 * 从数组创建 Observable
 */
export function from<T>(array: T[]): Observable<T> {
  return new Observable<T>((observer) => {
    let cancelled = false;
    
    array.forEach((value, index) => {
      if (cancelled) return;
      observer.next(value);
    });
    
    if (!cancelled) {
      observer.complete?.();
    }

    return {
      unsubscribe: () => { cancelled = true; },
      closed: false,
    };
  });
}

/**
 * 从事件创建 Observable
 */
export function fromEvent<T>(target: EventTarget, eventName: string): Observable<T> {
  return new Observable<T>((observer) => {
    const handler = (event: T) => observer.next(event);
    target.addEventListener(eventName, handler as EventListener);

    return {
      unsubscribe: () => {
        target.removeEventListener(eventName, handler as EventListener);
      },
      closed: false,
    };
  });
}

/**
 * 创建定时器 Observable
 */
export function interval(periodMs: number): Observable<number> {
  return new Observable<number>((observer) => {
    let count = 0;
    const intervalId = setInterval(() => {
      observer.next(count++);
    }, periodMs);

    return {
      unsubscribe: () => clearInterval(intervalId),
      closed: false,
    };
  });
}

/**
 * 创建立即发射值的 Observable
 */
export function of<T>(...values: T[]): Observable<T> {
  return from(values);
}

/**
 * 创建空 Observable
 */
export function empty<T>(): Observable<T> {
  return new Observable<T>((observer) => {
    observer.complete?.();
    return { unsubscribe: () => {}, closed: true };
  });
}

/**
 * 创建错误 Observable
 */
export function throwError<T>(error: any): Observable<T> {
  return new Observable<T>((observer) => {
    observer.error?.(error);
    return { unsubscribe: () => {}, closed: true };
  });
}

// ============== 静态操作符 ==============

/**
 * 合并多个 Observable
 */
export function merge<T>(...sources: Observable<T>[]): Observable<T> {
  return new Observable<T>((observer) => {
    const subscriptions: Subscription[] = [];
    let completed = 0;

    sources.forEach((source) => {
      const sub = source.subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error?.(err),
        complete: () => {
          completed++;
          if (completed === sources.length) {
            observer.complete?.();
          }
        },
      });
      subscriptions.push(sub);
    });

    return {
      unsubscribe: () => subscriptions.forEach((s) => s.unsubscribe()),
      closed: false,
    };
  });
}

/**
 * 组合多个 Observable (按顺序)
 */
export function concat<T>(...sources: Observable<T>[]): Observable<T> {
  return new Observable<T>((observer) => {
    let index = 0;

    const subscribeNext = () => {
      if (index >= sources.length) {
        observer.complete?.();
        return;
      }

      const source = sources[index++];
      source.subscribe({
        next: (value) => observer.next(value),
        error: (err) => observer.error?.(err),
        complete: subscribeNext,
      });
    };

    subscribeNext();

    return { unsubscribe: () => {}, closed: false };
  });
}

/**
 * 组合操作符管道
 */
export function pipe<T>(...operators: Operator<T, T>[]): Operator<T, T> {
  return (source) => operators.reduce((acc, op) => op(acc), source);
}

// ============== 使用示例 ==============

/**
 * 使用示例代码
 * 
 * 运行方式：将此文件导入后执行以下示例
 */
export function runExamples() {
  console.log('=== ACE Observer Utils 示例 ===\n');

  // 示例 1: 从数组创建并 map
  console.log('示例 1: from + map');
  from([1, 2, 3, 4, 5])
    .map(x => x * 2)
    .subscribe({
      next: v => console.log(`  ${v}`),
      complete: () => console.log('  ✓ 完成\n'),
    });

  // 示例 2: filter 过滤
  console.log('示例 2: from + filter');
  from([1, 2, 3, 4, 5, 6])
    .filter(x => x % 2 === 0)
    .subscribe({
      next: v => console.log(`  ${v}`),
      complete: () => console.log('  ✓ 完成\n'),
    });

  // 示例 3: reduce 累积
  console.log('示例 3: from + reduce');
  from([1, 2, 3, 4, 5])
    .reduce((acc, x) => acc + x, 0)
    .subscribe({
      next: v => console.log(`  总和：${v}`),
      complete: () => console.log('  ✓ 完成\n'),
    });

  // 示例 4: 链式操作
  console.log('示例 4: 链式操作 (map + filter + take)');
  from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .map(x => x * 10)
    .filter(x => x > 30)
    .take(3)
    .subscribe({
      next: v => console.log(`  ${v}`),
      complete: () => console.log('  ✓ 完成\n'),
    });

  // 示例 5: 取消订阅
  console.log('示例 5: 取消订阅');
  const interval$ = interval(500);
  const subscription = interval$.subscribe({
    next: v => console.log(`  计时：${v}`),
  });
  setTimeout(() => {
    subscription.unsubscribe();
    console.log('  ✗ 已取消订阅\n');
  }, 1600);

  // 示例 6: merge 合并
  console.log('示例 6: merge 合并');
  merge(
    of(1, 2, 3),
    of('a', 'b', 'c')
  ).subscribe({
    next: v => console.log(`  ${v}`),
    complete: () => console.log('  ✓ 完成\n'),
  });

  // 示例 7: pipe 管道
  console.log('示例 7: pipe 管道');
  const transform = pipe<number, number>(
    x => x.map(v => v * 2),
    x => x.filter(v => v > 5),
    x => x.take(2),
  );
  from([1, 2, 3, 4, 5])
    |> transform
    |> (obs => obs.subscribe({
      next: v => console.log(`  ${v}`),
      complete: () => console.log('  ✓ 完成\n'),
    }));
}

// 导出默认
export default {
  Observable,
  from,
  fromEvent,
  interval,
  of,
  empty,
  throwError,
  merge,
  concat,
  pipe,
};

/**
 * Compose Skill - 单元测试
 * 
 * 测试函数组合、柯里化、防抖节流等功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  compose,
  pipe,
  curry,
  partial,
  partialRight,
  debounce,
  throttle,
  identity,
  once,
  memoize,
  negate,
} from './compose-skill';

describe('Compose Skill', () => {
  describe('compose', () => {
    it('应该组合单个函数', () => {
      const add1 = (x: number) => x + 1;
      const fn = compose(add1);
      expect(fn(5)).toBe(6);
    });

    it('应该从右到左组合多个函数', () => {
      const add1 = (x: number) => x + 1;
      const mul2 = (x: number) => x * 2;
      const toString = (x: number) => `Result: ${x}`;
      
      const fn = compose(toString, mul2, add1);
      expect(fn(5)).toBe('Result: 12');
    });

    it('应该保持 this 上下文', () => {
      const obj = {
        value: 10,
        add: function(x: number) {
          return this.value + x;
        },
        mul: function(x: number) {
          return this.value * x;
        }
      };
      
      const fn = compose(obj.mul, obj.add);
      expect(fn.call(obj, 5)).toBe(150); // (10+5)*10
    });

    it('应该处理单个参数', () => {
      const square = (x: number) => x * x;
      const fn = compose(square);
      expect(fn(4)).toBe(16);
    });
  });

  describe('pipe', () => {
    it('应该组合单个函数', () => {
      const add1 = (x: number) => x + 1;
      const fn = pipe(add1);
      expect(fn(5)).toBe(6);
    });

    it('应该从左到右组合多个函数', () => {
      const add1 = (x: number) => x + 1;
      const mul2 = (x: number) => x * 2;
      const toString = (x: number) => `Result: ${x}`;
      
      const fn = pipe(add1, mul2, toString);
      expect(fn(5)).toBe('Result: 12');
    });

    it('应该是 compose 的反向版本', () => {
      const f = (x: number) => x + 1;
      const g = (x: number) => x * 2;
      const h = (x: number) => x - 3;
      
      const piped = pipe(f, g, h);
      const composed = compose(h, g, f);
      
      expect(piped(5)).toBe(composed(5));
    });

    it('应该保持 this 上下文', () => {
      const obj = {
        value: 10,
        add: function(x: number) {
          return this.value + x;
        },
        mul: function(x: number) {
          return this.value * x;
        }
      };
      
      const fn = pipe(obj.add, obj.mul);
      expect(fn.call(obj, 5)).toBe(150); // (10+5)*10
    });
  });

  describe('curry', () => {
    it('应该柯里化两参数函数', () => {
      const add = (a: number, b: number) => a + b;
      const curried = curry(add);
      
      expect(curried(1)(2)).toBe(3);
      expect(curried(1, 2)).toBe(3);
    });

    it('应该柯里化三参数函数', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const curried = curry(add);
      
      expect(curried(1)(2)(3)).toBe(6);
      expect(curried(1, 2)(3)).toBe(6);
      expect(curried(1)(2, 3)).toBe(6);
      expect(curried(1, 2, 3)).toBe(6);
    });

    it('应该支持部分应用', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const curried = curry(add);
      
      const add5 = curried(5);
      expect(add5(2, 3)).toBe(10);
      expect(add5(2)(3)).toBe(10);
      
      const add5And2 = add5(2);
      expect(add5And2(3)).toBe(10);
    });

    it('应该保持 this 上下文', () => {
      const obj = {
        multiplier: 2,
        multiply: function(a: number, b: number) {
          return this.multiplier * a * b;
        }
      };
      
      const curried = curry(obj.multiply);
      expect(curried.call(obj, 3)(4)).toBe(24);
    });
  });

  describe('partial', () => {
    it('应该预先填充前面的参数', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const add5 = partial(add, 5);
      
      expect(add5(2, 3)).toBe(10);
    });

    it('应该支持多个预设参数', () => {
      const add = (a: number, b: number, c: number) => a + b + c;
      const add5And2 = partial(add, 5, 2);
      
      expect(add5And2(3)).toBe(10);
    });

    it('应该保持 this 上下文', () => {
      const obj = {
        prefix: 'Hello',
        greet: function(punctuation: string, name: string) {
          return `${this.prefix}${punctuation} ${name}`;
        }
      };
      
      const greetWithPunctuation = partial(obj.greet, '!');
      expect(greetWithPunctuation.call(obj, 'World')).toBe('Hello! World');
    });
  });

  describe('partialRight', () => {
    it('应该预先填充后面的参数', () => {
      const greet = (greeting: string, name: string) => `${greeting}, ${name}!`;
      const greetWorld = partialRight(greet, 'World');
      
      expect(greetWorld('Hello')).toBe('Hello, World!');
    });

    it('应该支持多个预设参数', () => {
      const fn = (a: number, b: number, c: number) => a * 100 + b * 10 + c;
      const withLastTwo = partialRight(fn, 2, 3);
      
      expect(withLastTwo(1)).toBe(123);
    });
  });

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该延迟执行函数', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, { delay: 100 });
      
      debounced();
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该取消之前的调用', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, { delay: 100 });
      
      debounced('a');
      debounced('b');
      debounced('c');
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });

    it('应该支持 cancel 方法', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, { delay: 100 });
      
      debounced();
      debounced.cancel();
      
      vi.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
    });

    it('应该支持 isPending 方法', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, { delay: 100 });
      
      debounced();
      expect(debounced.isPending()).toBe(true);
      
      vi.advanceTimersByTime(100);
      expect(debounced.isPending()).toBe(false);
    });

    it('应该支持 leading 选项', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, { delay: 100, leading: true });
      
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(50);
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该限制执行频率', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, { interval: 100 });
      
      throttled();
      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该立即执行第一次调用', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, { interval: 100 });
      
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该支持 cancel 方法', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, { interval: 100 });
      
      throttled();
      throttled();
      throttled.cancel();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该支持 isPending 方法', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, { interval: 100 });
      
      throttled();
      throttled();
      expect(throttled.isPending()).toBe(true);
      
      vi.advanceTimersByTime(100);
      expect(throttled.isPending()).toBe(false);
    });

    it('应该支持 trailing 选项', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, { interval: 100, trailing: true });
      
      throttled();
      throttled();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('identity', () => {
    it('应该返回传入的值', () => {
      expect(identity(5)).toBe(5);
      expect(identity('hello')).toBe('hello');
      expect(identity({ a: 1 })).toEqual({ a: 1 });
      expect(identity(null)).toBe(null);
      expect(identity(undefined)).toBe(undefined);
    });
  });

  describe('once', () => {
    it('应该只执行一次', () => {
      const fn = vi.fn(() => 'result');
      const onceFn = once(fn);
      
      expect(onceFn()).toBe('result');
      expect(onceFn()).toBe('result');
      expect(onceFn()).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该保持 this 上下文', () => {
      const obj = {
        count: 0,
        increment: function() {
          this.count++;
          return this.count;
        }
      };
      
      const onceFn = once(obj.increment);
      expect(onceFn.call(obj)).toBe(1);
      expect(onceFn.call(obj)).toBe(1);
      expect(obj.count).toBe(1);
    });
  });

  describe('memoize', () => {
    it('应该缓存结果', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);
      
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
      
      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该对不同参数分别缓存', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);
      
      memoized(1);
      memoized(2);
      memoized(1);
      memoized(2);
      
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('negate', () => {
    it('应该取反谓词函数', () => {
      const isEven = (x: number) => x % 2 === 0;
      const isOdd = negate(isEven);
      
      expect(isOdd(2)).toBe(false);
      expect(isOdd(3)).toBe(true);
    });

    it('应该保持 this 上下文', () => {
      const obj = {
        threshold: 10,
        check: function(x: number) {
          return x > this.threshold;
        }
      };
      
      const notGreaterThan10 = negate(obj.check);
      expect(notGreaterThan10.call(obj, 5)).toBe(true);
      expect(notGreaterThan10.call(obj, 15)).toBe(false);
    });

    it('应该配合 filter 使用', () => {
      const isEven = (x: number) => x % 2 === 0;
      const isOdd = negate(isEven);
      
      const numbers = [1, 2, 3, 4, 5, 6];
      const odds = numbers.filter(isOdd);
      
      expect(odds).toEqual([1, 3, 5]);
    });
  });
});

/**
 * ACE Observer Utils - 使用示例
 * 
 * 展示 Observable 响应式编程的各种使用场景
 */

import { 
  Observable, 
  from, 
  fromEvent, 
  interval, 
  of, 
  merge, 
  concat,
  pipe 
} from './observer-utils-skill';

// ============== 示例 1: 基础数据流处理 ==============

function example1_BasicDataFlow() {
  console.log('\n=== 示例 1: 基础数据流处理 ===');
  
  // 创建数据流并转换
  const numbers$ = from([1, 2, 3, 4, 5]);
  
  numbers$
    .map(x => x * 2)           // 乘以 2
    .filter(x => x > 5)        // 过滤大于 5 的
    .subscribe({
      next: value => console.log(`  收到：${value}`),
      complete: () => console.log('  ✓ 数据流完成'),
    });
}

// ============== 示例 2: 用户输入防抖 ==============

function example2_InputDebounce() {
  console.log('\n=== 示例 2: 用户输入防抖 ===');
  
  // 模拟用户输入事件
  const input$ = from(['H', 'He', 'Hel', 'Hell', 'Hello']);
  
  input$
    .debounce(300)  // 300ms 防抖
    .subscribe({
      next: value => console.log(`  搜索：${value}`),
    });
  
  // 实际使用中：
  // fromEvent<HTMLInputElement>(searchInput, 'input')
  //   .map(e => e.target.value)
  //   .debounce(300)
  //   .subscribe(query => fetchResults(query));
}

// ============== 示例 3: 多数据源合并 ==============

function example3_MergeStreams() {
  console.log('\n=== 示例 3: 多数据源合并 ===');
  
  const stream1$ = of(1, 2, 3);
  const stream2$ = of('a', 'b', 'c');
  const stream3$ = of(true, false);
  
  merge(stream1$, stream2$, stream3$)
    .subscribe({
      next: value => console.log(`  合并值：${value}`),
      complete: () => console.log('  ✓ 所有流完成'),
    });
}

// ============== 示例 4: 顺序执行 ==============

function example4_ConcatStreams() {
  console.log('\n=== 示例 4: 顺序执行 ===');
  
  const first$ = of('第一步', '第二步');
  const second$ = of('第三步', '第四步');
  
  concat(first$, second$)
    .subscribe({
      next: value => console.log(`  执行：${value}`),
      complete: () => console.log('  ✓ 顺序完成'),
    });
}

// ============== 示例 5: 操作符管道 ==============

function example5_OperatorPipe() {
  console.log('\n=== 示例 5: 操作符管道 ===');
  
  // 定义可复用的转换管道
  const dataPipeline = pipe<number, number>(
    source => source.map(x => x * 10),
    source => source.filter(x => x >= 50),
    source => source.take(3),
  );
  
  from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    |> dataPipeline
    |> (obs => obs.subscribe({
      next: value => console.log(`  管道输出：${value}`),
      complete: () => console.log('  ✓ 管道完成'),
    }));
}

// ============== 示例 6: 定时器与取消 ==============

function example6_IntervalWithCancel() {
  console.log('\n=== 示例 6: 定时器与取消 ===');
  
  const timer$ = interval(1000);
  const subscription = timer$.subscribe({
    next: count => console.log(`  秒数：${count}`),
  });
  
  // 5 秒后取消
  setTimeout(() => {
    subscription.unsubscribe();
    console.log('  ✗ 定时器已取消');
  }, 5000);
}

// ============== 示例 7: 错误处理 ==============

function example7_ErrorHandling() {
  console.log('\n=== 示例 7: 错误处理 ===');
  
  from([1, 2, 3, 4, 5])
    .map(x => {
      if (x === 3) throw new Error('遇到 3 了！');
      return x * 2;
    })
    .subscribe({
      next: value => console.log(`  值：${value}`),
      error: err => console.log(`  ✗ 错误：${err.message}`),
    });
}

// ============== 示例 8: 累加计算 ==============

function example8_Reducer() {
  console.log('\n=== 示例 8: 累加计算 ===');
  
  const transactions$ = from([100, 200, 150, 300, 50]);
  
  // 计算总和
  transactions$
    .reduce((total, amount) => total + amount, 0)
    .subscribe({
      next: total => console.log(`  总金额：¥${total}`),
      complete: () => console.log('  ✓ 计算完成'),
    });
}

// ============== 示例 9: 异步转 Promise ==============

async function example9_ToPromise() {
  console.log('\n=== 示例 9: 异步转 Promise ===');
  
  const lastValue$ = from([1, 2, 3, 4, 5]);
  
  try {
    const result = await lastValue$.toPromise();
    console.log(`  最后一个值：${result}`);
  } catch (err) {
    console.log(`  ✗ 错误：${err}`);
  }
}

// ============== 示例 10: 实际场景 - 搜索建议 ==============

function example10_SearchSuggestions() {
  console.log('\n=== 示例 10: 搜索建议 (模拟) ===');
  
  // 模拟用户输入
  const userInput$ = from(['a', 'ab', 'abc', 'abcd', 'abcde']);
  
  userInput$
    .debounce(300)                    // 防抖 300ms
    .map(query => query.trim())       // 去除空格
    .filter(query => query.length > 2) // 至少 3 个字符
    .map(query => `搜索：${query}`)    // 格式化
    .subscribe({
      next: suggestion => console.log(`  💡 ${suggestion}`),
      complete: () => console.log('  ✓ 搜索完成'),
    });
}

// ============== 运行所有示例 ==============

export function runAllExamples() {
  console.log('🜏 ACE Observer Utils - 完整示例集');
  console.log('=====================================\n');
  
  example1_BasicDataFlow();
  example2_InputDebounce();
  example3_MergeStreams();
  example4_ConcatStreams();
  example5_OperatorPipe();
  example6_IntervalWithCancel();
  example7_ErrorHandling();
  example8_Reducer();
  example10_SearchSuggestions();
  
  // 异步示例单独运行
  example9_ToPromise().then(() => {
    console.log('\n=====================================');
    console.log('✓ 所有示例执行完成');
  });
}

// 导出单个示例供选择运行
export const examples = {
  basicDataFlow: example1_BasicDataFlow,
  inputDebounce: example2_InputDebounce,
  mergeStreams: example3_MergeStreams,
  concatStreams: example4_ConcatStreams,
  operatorPipe: example5_OperatorPipe,
  intervalWithCancel: example6_IntervalWithCancel,
  errorHandling: example7_ErrorHandling,
  reducer: example8_Reducer,
  toPromise: example9_ToPromise,
  searchSuggestions: example10_SearchSuggestions,
};

// 默认导出
export default { runAllExamples, examples };

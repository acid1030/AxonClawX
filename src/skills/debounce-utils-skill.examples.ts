/**
 * 防抖节流工具使用示例
 * 
 * 此文件展示了 debounce-utils-skill.ts 的各种使用场景
 */

import {
  debounce,
  throttle,
  raf,
  rafThrottle,
  debounceThrottle,
  createSmartUpdater,
} from './debounce-utils-skill';

// ==================== 防抖函数示例 ====================

/**
 * 示例 1: 搜索框防抖
 * 
 * 场景：用户输入时，延迟 300ms 后执行搜索，避免频繁请求
 */
function exampleSearchDebounce() {
  const searchHandler = debounce((query: string) => {
    console.log('🔍 搜索:', query);
    // fetch(`/api/search?q=${query}`)
  }, 300);

  // 模拟用户快速输入
  searchHandler('a');
  searchHandler('ab');
  searchHandler('abc');
  // 只在输入停止 300ms 后执行一次
}

/**
 * 示例 2: 窗口 Resize 防抖
 * 
 * 场景：窗口大小改变时，延迟执行布局计算
 */
function exampleResizeDebounce() {
  const resizeHandler = debounce(() => {
    console.log('📐 窗口尺寸:', window.innerWidth, 'x', window.innerHeight);
    // 重新计算布局
  }, 200);

  window.addEventListener('resize', resizeHandler);
}

/**
 * 示例 3: 立即执行的防抖
 * 
 * 场景：按钮点击时立即响应，但防止重复点击
 */
function exampleImmediateDebounce() {
  const clickHandler = debounce(() => {
    console.log('🖱️ 按钮点击');
    // 提交表单
  }, 500, { immediate: true });

  // 第一次点击立即执行
  clickHandler();
  // 500ms 内的点击会被忽略
  clickHandler();
  clickHandler();
}

/**
 * 示例 4: 使用 cancel 取消
 * 
 * 场景：组件卸载时取消待执行的回调
 */
function exampleCancelDebounce() {
  const saveHandler = debounce((data: any) => {
    console.log('💾 保存数据:', data);
  }, 1000);

  // 触发保存
  saveHandler({ name: 'test' });

  // 组件卸载时取消
  // saveHandler.cancel();
}

/**
 * 示例 5: 使用 flush 立即执行
 * 
 * 场景：用户离开页面时立即保存
 */
function exampleFlushDebounce() {
  const autoSave = debounce((content: string) => {
    console.log('💾 自动保存:', content);
  }, 5000);

  // 正常自动保存
  autoSave('正在编辑的内容...');

  // 用户关闭页面前立即保存
  window.addEventListener('beforeunload', () => {
    (autoSave as any).flush('最终内容');
  });
}

// ==================== 节流函数示例 ====================

/**
 * 示例 6: 滚动事件节流
 * 
 * 场景：限制滚动事件处理频率，提升性能
 */
function exampleScrollThrottle() {
  const scrollHandler = throttle(() => {
    console.log('📜 滚动位置:', window.scrollY);
    // 更新滚动进度条、懒加载等
  }, 100);

  window.addEventListener('scroll', scrollHandler);
}

/**
 * 示例 7: 按钮防重复点击
 * 
 * 场景：防止用户快速多次点击提交按钮
 */
function exampleSubmitThrottle() {
  const submitHandler = throttle((formData: any) => {
    console.log('📤 提交表单:', formData);
    // submitForm(formData)
  }, 2000, { leading: true, trailing: false });

  // 第一次点击立即执行
  // submitHandler({ name: 'test' });
  // 2 秒内的点击都会被忽略
}

/**
 * 示例 8: 鼠标移动跟踪
 * 
 * 场景：限制鼠标位置更新频率
 */
function exampleMouseMoveThrottle() {
  const mouseHandler = throttle((e: MouseEvent) => {
    console.log('🖱️ 鼠标位置:', e.clientX, e.clientY);
    // 更新自定义光标、显示提示等
  }, 50);

  document.addEventListener('mousemove', mouseHandler);
}

/**
 * 示例 9: 拖拽操作节流
 * 
 * 场景：拖拽时限制更新频率
 */
function exampleDragThrottle() {
  const dragHandler = throttle((e: MouseEvent) => {
    console.log('🎯 拖拽位置:', e.clientX, e.clientY);
    // 更新拖拽元素位置
  }, 16); // 约 60fps

  document.addEventListener('mousemove', dragHandler);
}

/**
 * 示例 10: 使用 flush 立即执行
 * 
 * 场景：拖拽结束时立即更新最终位置
 */
function exampleFlushThrottle() {
  const moveHandler = throttle((x: number, y: number) => {
    console.log('📍 移动到新位置:', x, y);
  }, 100);

  // 正常移动
  moveHandler(100, 100);
  moveHandler(150, 150);

  // 拖拽结束，立即执行最后一次
  // moveHandler.flush(200, 200);
}

// ==================== 请求动画帧示例 ====================

/**
 * 示例 11: 基础动画循环
 * 
 * 场景：创建平滑的动画效果
 */
function exampleBasicAnimation() {
  let progress = 0;

  const animation = raf((timestamp) => {
    progress += 0.01;
    
    if (progress >= 1) {
      progress = 0;
    }

    console.log('🎬 动画进度:', (progress * 100).toFixed(1) + '%');
    
    // 继续下一帧
    animation.flush();
  });

  // 启动动画
  animation.flush();

  // 5 秒后停止
  setTimeout(() => {
    animation.cancel();
    console.log('⏹️ 动画停止');
  }, 5000);
}

/**
 * 示例 12: 滚动动画
 * 
 * 场景：平滑滚动到指定位置
 */
function exampleScrollAnimation() {
  const targetScroll = 500;
  const startScroll = window.scrollY;
  const duration = 1000;
  let startTime: number | null = null;

  const animation = raf((timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 缓动函数 (easeInOutQuad)
    const ease = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentScroll = startScroll + (targetScroll - startScroll) * ease;
    window.scrollTo(0, currentScroll);

    if (progress < 1) {
      animation.flush();
    }
  });

  animation.flush();
}

/**
 * 示例 13: 节流动画
 * 
 * 场景：限制动画帧率以节省性能
 */
function exampleThrottledAnimation() {
  let rotation = 0;

  const animation = rafThrottle((timestamp) => {
    rotation += 1;
    console.log('🔄 旋转角度:', rotation % 360);
    
    // 自动继续
    // animation.flush(); // rafThrottle 会自动循环
  }, 33); // 限制为 30fps

  animation.flush();

  // 3 秒后停止
  setTimeout(() => {
    animation.cancel();
  }, 3000);
}

// ==================== 组合工具示例 ====================

/**
 * 示例 14: 智能搜索 (防抖 + 节流)
 * 
 * 场景：搜索建议，既防抖又限制请求频率
 */
function exampleSmartSearch() {
  const searchApi = debounceThrottle(
    async (query: string) => {
      console.log('🔍 搜索 API 调用:', query);
      // const results = await fetchSuggestions(query);
      // updateSuggestions(results);
    },
    300,  // 300ms 防抖
    1000  // 最少间隔 1 秒
  );

  // 用户快速输入多个字符
  searchApi('a');
  searchApi('ab');
  searchApi('abc');
  // 只会在停止输入后执行一次，且距离上次请求至少 1 秒
}

/**
 * 示例 15: 智能更新器
 * 
 * 场景：自动选择最佳更新方式
 */
function exampleSmartUpdater() {
  const updateUI = createSmartUpdater((data: any) => {
    console.log('🎨 更新 UI:', data);
    // 渲染组件
  }, true); // 优先使用 RAF

  // 多次调用只会执行最后一次
  updateUI({ value: 1 });
  updateUI({ value: 2 });
  updateUI({ value: 3 });
  // 最终只渲染 value: 3
}

// ==================== 实际应用场景 ====================

/**
 * 场景 1: 实时表单验证
 */
function exampleFormValidation() {
  const validateEmail = debounce((email: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    console.log('✅ 邮箱验证:', email, isValid ? '有效' : '无效');
  }, 500);

  // 监听输入
  // emailInput.addEventListener('input', (e) => {
  //   validateEmail(e.target.value);
  // });
}

/**
 * 场景 2: 无限滚动加载
 */
function exampleInfiniteScroll() {
  const loadMore = throttle(() => {
    console.log('📥 加载更多数据...');
    // fetchMoreData()
  }, 500);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // 距离底部 200px 时加载
    if (scrollTop + windowHeight >= documentHeight - 200) {
      loadMore();
    }
  });
}

/**
 * 场景 3: 画布绘图
 */
function exampleCanvasDrawing() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  const draw = throttle((e: MouseEvent) => {
    if (!isDrawing) return;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();

    [lastX, lastY] = [e.offsetX, e.offsetY];
  }, 16);

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
  });

  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', () => isDrawing = false);
}

/**
 * 场景 4: 视频播放器进度更新
 */
function exampleVideoProgress() {
  const video = document.createElement('video');
  
  const updateProgress = throttle(() => {
    const progress = (video.currentTime / video.duration) * 100;
    console.log('📺 播放进度:', progress.toFixed(1) + '%');
    // updateProgressBar(progress)
  }, 250);

  video.addEventListener('timeupdate', updateProgress);
}

/**
 * 场景 5: 游戏循环
 */
function exampleGameLoop() {
  const gameState = {
    player: { x: 0, y: 0 },
    enemies: [] as Array<{ x: number; y: number }>,
    score: 0
  };

  const gameLoop = raf((timestamp) => {
    // 更新游戏状态
    gameState.player.x += 1;
    gameState.player.y += 0.5;

    // 渲染游戏
    console.log('🎮 游戏帧:', {
      timestamp,
      player: gameState.player,
      score: gameState.score
    });

    gameLoop.flush();
  });

  gameLoop.flush();
}

// ==================== 性能对比示例 ====================

/**
 * 性能对比：普通事件处理 vs 防抖 vs 节流
 */
function performanceComparison() {
  let normalCount = 0;
  let debounceCount = 0;
  let throttleCount = 0;

  // 普通处理 (性能最差)
  const normalHandler = () => {
    normalCount++;
  };

  // 防抖处理
  const debouncedHandler = debounce(() => {
    debounceCount++;
  }, 100);

  // 节流处理
  const throttledHandler = throttle(() => {
    throttleCount++;
  }, 100);

  // 模拟 1 秒内触发 1000 次
  console.log('⚡ 开始性能测试...');
  const start = Date.now();

  for (let i = 0; i < 1000; i++) {
    normalHandler();
    debouncedHandler();
    throttledHandler();
  }

  // 等待防抖执行
  setTimeout(() => {
    console.log('📊 执行次数统计:');
    console.log('  普通处理:', normalCount, '次');
    console.log('  防抖处理:', debounceCount, '次');
    console.log('  节流处理:', throttleCount, '次');
    console.log('⏱️ 耗时:', Date.now() - start, 'ms');
  }, 200);
}

// ==================== 导出所有示例 ====================

export const DebounceExamples = {
  // 防抖示例
  exampleSearchDebounce,
  exampleResizeDebounce,
  exampleImmediateDebounce,
  exampleCancelDebounce,
  exampleFlushDebounce,

  // 节流示例
  exampleScrollThrottle,
  exampleSubmitThrottle,
  exampleMouseMoveThrottle,
  exampleDragThrottle,
  exampleFlushThrottle,

  // RAF 示例
  exampleBasicAnimation,
  exampleScrollAnimation,
  exampleThrottledAnimation,

  // 组合示例
  exampleSmartSearch,
  exampleSmartUpdater,

  // 实际场景
  exampleFormValidation,
  exampleInfiniteScroll,
  exampleCanvasDrawing,
  exampleVideoProgress,
  exampleGameLoop,

  // 性能对比
  performanceComparison,
};

export default DebounceExamples;

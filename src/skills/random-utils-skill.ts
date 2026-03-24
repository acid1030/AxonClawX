/**
 * 随机工具技能 - KAEL
 * 
 * 提供常用随机数生成功能：
 * 1. 随机数生成
 * 2. 随机字符串
 * 3. 随机选择
 */

/**
 * 生成指定范围内的随机整数
 * 
 * @param min - 最小值 (包含)
 * @param max - 最大值 (包含)
 * @returns 随机整数
 * 
 * @example
 * randomInt(1, 10) // 返回 1-10 之间的随机整数
 * randomInt(0, 100) // 返回 0-100 之间的随机整数
 */
export function randomInt(min: number, max: number): number {
  if (min > max) {
    throw new Error('min must be less than or equal to max');
  }
  
  min = Math.ceil(min);
  max = Math.floor(max);
  
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成指定范围内的随机浮点数
 * 
 * @param min - 最小值 (包含)
 * @param max - 最大值 (不包含)
 * @param precision - 小数精度，默认为 2
 * @returns 随机浮点数
 * 
 * @example
 * randomFloat(0, 1) // 返回 0-1 之间的随机浮点数
 * randomFloat(1.5, 5.5, 3) // 返回 1.5-5.5 之间的随机浮点数，保留 3 位小数
 */
export function randomFloat(min: number, max: number, precision: number = 2): number {
  if (min >= max) {
    throw new Error('min must be less than max');
  }
  
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(precision));
}

/**
 * 生成随机字符串
 * 
 * @param length - 字符串长度
 * @param options - 配置选项
 * @param options.chars - 自定义字符集，默认包含字母和数字
 * @param options.includeUppercase - 是否包含大写字母，默认 true
 * @param options.includeLowercase - 是否包含小写字母，默认 true
 * @param options.includeNumbers - 是否包含数字，默认 true
 * @param options.includeSymbols - 是否包含特殊符号，默认 false
 * @returns 随机字符串
 * 
 * @example
 * randomString(10) // 生成 10 位随机字符串
 * randomString(16, { includeSymbols: true }) // 生成包含特殊符号的 16 位随机字符串
 */
export function randomString(
  length: number,
  options: {
    chars?: string;
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
  } = {}
): string {
  if (length <= 0) {
    throw new Error('Length must be greater than 0');
  }
  
  const {
    chars,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = false,
  } = options;
  
  // 如果提供了自定义字符集，直接使用
  if (chars) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // 构建默认字符集
  let characterSet = '';
  if (includeUppercase) characterSet += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeLowercase) characterSet += 'abcdefghijklmnopqrstuvwxyz';
  if (includeNumbers) characterSet += '0123456789';
  if (includeSymbols) characterSet += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (characterSet === '') {
    throw new Error('At least one character type must be included');
  }
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characterSet.charAt(Math.floor(Math.random() * characterSet.length));
  }
  
  return result;
}

/**
 * 从数组中随机选择一个或多个元素
 * 
 * @param arr - 源数组
 * @param count - 选择数量，默认为 1
 * @returns 随机选择的元素 (单个元素返回元素本身，多个元素返回数组)
 * 
 * @example
 * randomChoice([1, 2, 3, 4, 5]) // 返回数组中的一个随机元素
 * randomChoice(['a', 'b', 'c', 'd'], 2) // 返回包含 2 个随机元素的数组
 * randomChoice([1, 2, 3], 5) // 如果 count > 数组长度，返回所有元素
 */
export function randomChoice<T>(arr: T[], count: number = 1): T | T[] {
  if (!Array.isArray(arr)) {
    throw new Error('First argument must be an array');
  }
  
  if (arr.length === 0) {
    throw new Error('Cannot choose from empty array');
  }
  
  if (count <= 0) {
    throw new Error('Count must be greater than 0');
  }
  
  // 创建数组副本以避免修改原数组
  const shuffled = [...arr];
  
  // Fisher-Yates 洗牌算法
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // 如果只需要一个元素，返回单个值
  if (count === 1) {
    return shuffled[0];
  }
  
  // 返回指定数量的元素 (不超过数组长度)
  return shuffled.slice(0, Math.min(count, arr.length));
}

/**
 * 随机打乱数组 (Fisher-Yates 洗牌算法)
 * 
 * @param arr - 需要打乱的数组
 * @returns 打乱后的新数组
 * 
 * @example
 * shuffle([1, 2, 3, 4, 5]) // 返回打乱顺序的新数组
 * shuffle(['a', 'b', 'c']) // 返回打乱顺序的新数组
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * 生成随机布尔值
 * 
 * @param probability - 返回 true 的概率 (0-1)，默认 0.5
 * @returns 随机布尔值
 * 
 * @example
 * randomBool() // 50% 概率返回 true
 * randomBool(0.7) // 70% 概率返回 true
 */
export function randomBool(probability: number = 0.5): boolean {
  if (probability < 0 || probability > 1) {
    throw new Error('Probability must be between 0 and 1');
  }
  
  return Math.random() < probability;
}

/**
 * 生成随机 UUID (v4)
 * 
 * @returns 随机 UUID 字符串
 * 
 * @example
 * randomUUID() // 返回类似 "550e8400-e29b-41d4-a716-446655440000"
 */
export function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 随机工具技能 - 使用示例 ===\n');
  
  // 1. 随机整数生成示例
  console.log('1️⃣ 随机整数生成:');
  console.log(`   randomInt(1, 10): ${randomInt(1, 10)}`);
  console.log(`   randomInt(0, 100): ${randomInt(0, 100)}`);
  console.log(`   randomInt(-50, 50): ${randomInt(-50, 50)}\n`);
  
  // 2. 随机浮点数生成示例
  console.log('2️⃣ 随机浮点数生成:');
  console.log(`   randomFloat(0, 1): ${randomFloat(0, 1)}`);
  console.log(`   randomFloat(1.5, 5.5, 3): ${randomFloat(1.5, 5.5, 3)}`);
  console.log(`   randomFloat(0, 100, 4): ${randomFloat(0, 100, 4)}\n`);
  
  // 3. 随机字符串生成示例
  console.log('3️⃣ 随机字符串生成:');
  console.log(`   randomString(10): ${randomString(10)}`);
  console.log(`   randomString(16): ${randomString(16)}`);
  console.log(`   randomString(20, { includeSymbols: true }): ${randomString(20, { includeSymbols: true })}`);
  console.log(`   randomString(8, { includeUppercase: false, includeNumbers: false }): ${randomString(8, { includeUppercase: false, includeNumbers: false })}\n`);
  
  // 4. 随机选择示例
  console.log('4️⃣ 随机选择:');
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(`   randomChoice([1-10]): ${randomChoice(numbers)}`);
  console.log(`   randomChoice([1-10], 3): ${JSON.stringify(randomChoice(numbers, 3))}`);
  
  const colors = ['red', 'green', 'blue', 'yellow', 'purple'];
  console.log(`   randomChoice(['red', 'green', 'blue', 'yellow', 'purple']): ${randomChoice(colors)}`);
  console.log(`   randomChoice(['red', 'green', 'blue', 'yellow', 'purple'], 2): ${JSON.stringify(randomChoice(colors, 2))}\n`);
  
  // 5. 数组打乱示例
  console.log('5️⃣ 数组打乱:');
  const original = [1, 2, 3, 4, 5];
  console.log(`   原始数组: [${original.join(', ')}]`);
  console.log(`   打乱结果: [${shuffle(original).join(', ')}]`);
  console.log(`   再次打乱：[${shuffle(original).join(', ')}]\n`);
  
  // 6. 随机布尔值示例
  console.log('6️⃣ 随机布尔值:');
  console.log(`   randomBool(): ${randomBool()}`);
  console.log(`   randomBool(0.7): ${randomBool(0.7)}`);
  console.log(`   randomBool(0.3): ${randomBool(0.3)}\n`);
  
  // 7. 随机 UUID 示例
  console.log('7️⃣ 随机 UUID:');
  console.log(`   randomUUID(): ${randomUUID()}`);
  console.log(`   randomUUID(): ${randomUUID()}`);
  console.log(`   randomUUID(): ${randomUUID()}\n`);
  
  console.log('✅ 所有示例执行完成!');
}

/**
 * 数组工具技能 - KAEL
 * 
 * 提供常用数组操作功能：
 * 1. 数组去重
 * 2. 数组扁平化
 * 3. 数组分块
 */

/**
 * 数组去重
 * 使用 Set 数据结构实现高效去重
 * 
 * @param arr - 需要去重的数组
 * @returns 去重后的新数组
 * 
 * @example
 * deduplicate([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 * deduplicate(['a', 'b', 'a', 'c']) // ['a', 'b', 'c']
 */
export function deduplicate<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * 数组扁平化
 * 将嵌套数组展平到指定深度
 * 
 * @param arr - 需要扁平化的嵌套数组
 * @param depth - 扁平化深度，默认为 1
 * @returns 扁平化后的新数组
 * 
 * @example
 * flatten([1, [2, 3], [4, [5, 6]]]) // [1, 2, 3, 4, [5, 6]]
 * flatten([1, [2, 3], [4, [5, 6]]], 2) // [1, 2, 3, 4, 5, 6]
 * flatten([1, [2, [3, [4]]]], Infinity) // [1, 2, 3, 4]
 */
export function flatten<T>(arr: any[], depth: number = 1): T[] {
  if (depth < 1) {
    return arr.slice();
  }
  
  return arr.reduce((acc: T[], val: any) => {
    if (Array.isArray(val)) {
      acc.push(...flatten<T>(val, depth - 1));
    } else {
      acc.push(val as T);
    }
    return acc;
  }, []);
}

/**
 * 数组分块
 * 将数组分割成指定大小的块
 * 
 * @param arr - 需要分块的数组
 * @param size - 每个块的大小
 * @returns 分块后的二维数组
 * 
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 * chunk([1, 2, 3, 4, 5], 3) // [[1, 2, 3], [4, 5]]
 * chunk([1, 2, 3], 5) // [[1, 2, 3]]
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }
  
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 数组工具技能 - 使用示例 ===\n');
  
  // 1. 数组去重示例
  console.log('1️⃣ 数组去重:');
  const numbers = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4];
  console.log(`   原始数组: [${numbers.join(', ')}]`);
  console.log(`   去重结果: [${deduplicate(numbers).join(', ')}]`);
  
  const strings = ['apple', 'banana', 'apple', 'orange', 'banana'];
  console.log(`   原始数组: [${strings.join(', ')}]`);
  console.log(`   去重结果: [${deduplicate(strings).join(', ')}]\n`);
  
  // 2. 数组扁平化示例
  console.log('2️⃣ 数组扁平化:');
  const nested = [1, [2, 3], [4, [5, 6]], [7, [8, [9, 10]]]];
  console.log(`   原始数组: ${JSON.stringify(nested)}`);
  console.log(`   扁平化 (depth=1): ${JSON.stringify(flatten(nested, 1))}`);
  console.log(`   扁平化 (depth=2): ${JSON.stringify(flatten(nested, 2))}`);
  console.log(`   扁平化 (depth=Infinity): ${JSON.stringify(flatten(nested, Infinity))}\n`);
  
  // 3. 数组分块示例
  console.log('3️⃣ 数组分块:');
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  console.log(`   原始数组: [${data.join(', ')}]`);
  console.log(`   分块 (size=3): ${JSON.stringify(chunk(data, 3))}`);
  console.log(`   分块 (size=4): ${JSON.stringify(chunk(data, 4))}`);
  console.log(`   分块 (size=2): ${JSON.stringify(chunk(data, 2))}\n`);
  
  console.log('✅ 所有示例执行完成!');
}

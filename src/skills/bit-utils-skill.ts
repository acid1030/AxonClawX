/**
 * BitUtils Skill - 位运算工具
 * 
 * 功能:
 * 1. 位操作 (AND/OR/XOR/NOT)
 * 2. 位掩码
 * 3. 位字段管理
 * 
 * @author KAEL
 * @version 1.0.0
 */

export class BitUtils {
  /**
   * 位操作 - AND
   * @param a 第一个操作数
   * @param b 第二个操作数
   * @returns a & b
   */
  static and(a: number, b: number): number {
    return a & b;
  }

  /**
   * 位操作 - OR
   * @param a 第一个操作数
   * @param b 第二个操作数
   * @returns a | b
   */
  static or(a: number, b: number): number {
    return a | b;
  }

  /**
   * 位操作 - XOR
   * @param a 第一个操作数
   * @param b 第二个操作数
   * @returns a ^ b
   */
  static xor(a: number, b: number): number {
    return a ^ b;
  }

  /**
   * 位操作 - NOT
   * @param a 操作数
   * @returns ~a
   */
  static not(a: number): number {
    return ~a;
  }

  /**
   * 位操作 - 左移
   * @param value 要移动的值
   * @param positions 移动的位数
   * @returns value << positions
   */
  static shiftLeft(value: number, positions: number): number {
    return value << positions;
  }

  /**
   * 位操作 - 右移 (带符号)
   * @param value 要移动的值
   * @param positions 移动的位数
   * @returns value >> positions
   */
  static shiftRight(value: number, positions: number): number {
    return value >> positions;
  }

  /**
   * 位操作 - 无符号右移
   * @param value 要移动的值
   * @param positions 移动的位数
   * @returns value >>> positions
   */
  static shiftRightUnsigned(value: number, positions: number): number {
    return value >>> positions;
  }

  /**
   * 创建位掩码
   * @param position 位位置 (从 0 开始)
   * @returns 1 << position
   */
  static createMask(position: number): number {
    return 1 << position;
  }

  /**
   * 创建范围掩码
   * @param start 起始位 (包含)
   * @param end 结束位 (包含)
   * @returns 掩码值
   */
  static createRangeMask(start: number, end: number): number {
    return ((1 << (end - start + 1)) - 1) << start;
  }

  /**
   * 设置位
   * @param value 原值
   * @param position 要设置的位位置
   * @returns 设置后的值
   */
  static setBit(value: number, position: number): number {
    return value | this.createMask(position);
  }

  /**
   * 清除位
   * @param value 原值
   * @param position 要清除的位位置
   * @returns 清除后的值
   */
  static clearBit(value: number, position: number): number {
    return value & ~this.createMask(position);
  }

  /**
   * 切换位
   * @param value 原值
   * @param position 要切换的位位置
   * @returns 切换后的值
   */
  static toggleBit(value: number, position: number): number {
    return value ^ this.createMask(position);
  }

  /**
   * 检查位是否设置
   * @param value 要检查的值
   * @param position 位位置
   * @returns 该位是否为 1
   */
  static isBitSet(value: number, position: number): boolean {
    return (value & this.createMask(position)) !== 0;
  }

  /**
   * 提取位字段
   * @param value 原值
   * @param start 起始位
   * @param end 结束位
   * @returns 提取的字段值
   */
  static extractField(value: number, start: number, end: number): number {
    const mask = this.createRangeMask(start, end);
    return (value & mask) >>> start;
  }

  /**
   * 设置位字段
   * @param value 原值
   * @param fieldValue 要设置的字段值
   * @param start 起始位
   * @param end 结束位
   * @returns 设置后的值
   */
  static setField(value: number, fieldValue: number, start: number, end: number): number {
    const mask = this.createRangeMask(start, end);
    const clearedValue = value & ~mask;
    const shiftedField = (fieldValue << start) & mask;
    return clearedValue | shiftedField;
  }

  /**
   * 计算值的二进制表示长度
   * @param value 要计算的值
   * @returns 二进制位数
   */
  static bitLength(value: number): number {
    if (value === 0) return 0;
    return Math.floor(Math.log2(Math.abs(value))) + 1;
  }

  /**
   * 统计 1 的个数 (population count)
   * @param value 要统计的值
   * @returns 1 的个数
   */
  static countOnes(value: number): number {
    let count = 0;
    let v = value;
    while (v !== 0) {
      count += v & 1;
      v >>>= 1;
    }
    return count;
  }

  /**
   * 统计 0 的个数
   * @param value 要统计的值
   * @param totalBits 总位数 (默认 32)
   * @returns 0 的个数
   */
  static countZeros(value: number, totalBits: number = 32): number {
    return totalBits - this.countOnes(value);
  }

  /**
   * 反转位的顺序
   * @param value 要反转的值
   * @param totalBits 总位数 (默认 32)
   * @returns 反转后的值
   */
  static reverseBits(value: number, totalBits: number = 32): number {
    let result = 0;
    let v = value;
    for (let i = 0; i < totalBits; i++) {
      result = (result << 1) | (v & 1);
      v >>>= 1;
    }
    return result;
  }

  /**
   * 将值格式化为二进制字符串
   * @param value 要格式化的值
   * @param padLength 填充长度 (默认 32)
   * @returns 二进制字符串
   */
  static toBinaryString(value: number, padLength: number = 32): string {
    return (value >>> 0).toString(2).padStart(padLength, '0');
  }

  /**
   * 将二进制字符串转换为数值
   * @param binaryString 二进制字符串
   * @returns 数值
   */
  static fromBinaryString(binaryString: string): number {
    return parseInt(binaryString, 2);
  }
}

// ============== 使用示例 ==============

/**
 * 使用示例 1: 基础位操作
 */
export function exampleBasicOperations() {
  const a = 0b1100; // 12
  const b = 0b1010; // 10

  console.log('AND:', BitUtils.and(a, b).toString(2));      // 1000 (8)
  console.log('OR:', BitUtils.or(a, b).toString(2));        // 1110 (14)
  console.log('XOR:', BitUtils.xor(a, b).toString(2));      // 0110 (6)
  console.log('NOT a:', BitUtils.not(a).toString(2));       // ...11110011
}

/**
 * 使用示例 2: 位掩码操作
 */
export function exampleBitMasks() {
  let flags = 0;

  // 设置第 0、2、4 位
  flags = BitUtils.setBit(flags, 0);
  flags = BitUtils.setBit(flags, 2);
  flags = BitUtils.setBit(flags, 4);

  console.log('Flags:', BitUtils.toBinaryString(flags, 8));  // 00010101

  // 检查第 2 位是否设置
  console.log('Bit 2 set:', BitUtils.isBitSet(flags, 2));    // true

  // 清除第 2 位
  flags = BitUtils.clearBit(flags, 2);
  console.log('After clear bit 2:', BitUtils.toBinaryString(flags, 8)); // 00010001

  // 切换第 0 位
  flags = BitUtils.toggleBit(flags, 0);
  console.log('After toggle bit 0:', BitUtils.toBinaryString(flags, 8));  // 00010000
}

/**
 * 使用示例 3: 位字段管理
 */
export function exampleBitFields() {
  // 假设有一个 32 位寄存器:
  // [31:24] 操作码
  // [23:16] 源寄存器
  // [15:8]  目标寄存器
  // [7:0]   立即数

  let register = 0;

  // 设置操作码为 0x5A
  register = BitUtils.setField(register, 0x5A, 24, 31);

  // 设置源寄存器为 3
  register = BitUtils.setField(register, 3, 16, 23);

  // 设置目标寄存器为 7
  register = BitUtils.setField(register, 7, 8, 15);

  // 设置立即数为 42
  register = BitUtils.setField(register, 42, 0, 7);

  console.log('Register:', register.toString(16).padStart(8, '0')); // 5a03072a

  // 提取字段
  const opcode = BitUtils.extractField(register, 24, 31);
  const srcReg = BitUtils.extractField(register, 16, 23);
  const dstReg = BitUtils.extractField(register, 8, 15);
  const imm = BitUtils.extractField(register, 0, 7);

  console.log('Opcode:', opcode.toString(16));  // 5a
  console.log('Src Reg:', srcReg);              // 3
  console.log('Dst Reg:', dstReg);              // 7
  console.log('Immediate:', imm);               // 42
}

/**
 * 使用示例 4: 位统计与转换
 */
export function exampleBitStatistics() {
  const value = 0b10110110;

  console.log('Binary:', BitUtils.toBinaryString(value, 8));  // 10110110
  console.log('Bit length:', BitUtils.bitLength(value));      // 7
  console.log('Count of 1s:', BitUtils.countOnes(value));     // 4
  console.log('Count of 0s:', BitUtils.countZeros(value, 8)); // 4
  console.log('Reversed:', BitUtils.toBinaryString(BitUtils.reverseBits(value, 8), 8)); // 01101101
}

/**
 * 使用示例 5: 实际应用场景 - 权限标志
 */
export function examplePermissionFlags() {
  // 定义权限位
  const READ = 0;    // 第 0 位
  const WRITE = 1;   // 第 1 位
  const EXECUTE = 2; // 第 2 位
  const ADMIN = 3;   // 第 3 位

  let userPermissions = 0;

  // 授予读取和执行权限
  userPermissions = BitUtils.setBit(userPermissions, READ);
  userPermissions = BitUtils.setBit(userPermissions, EXECUTE);

  console.log('User permissions:', BitUtils.toBinaryString(userPermissions, 4)); // 0101

  // 检查权限
  console.log('Can read:', BitUtils.isBitSet(userPermissions, READ));      // true
  console.log('Can write:', BitUtils.isBitSet(userPermissions, WRITE));    // false
  console.log('Can execute:', BitUtils.isBitSet(userPermissions, EXECUTE)); // true
  console.log('Is admin:', BitUtils.isBitSet(userPermissions, ADMIN));     // false

  // 提升权限 (授予写入权限)
  userPermissions = BitUtils.setBit(userPermissions, WRITE);
  console.log('After promotion:', BitUtils.toBinaryString(userPermissions, 4)); // 0111
}

// 导出所有示例函数
export const examples = {
  basicOperations: exampleBasicOperations,
  bitMasks: exampleBitMasks,
  bitFields: exampleBitFields,
  statistics: exampleBitStatistics,
  permissions: examplePermissionFlags,
};

export default BitUtils;

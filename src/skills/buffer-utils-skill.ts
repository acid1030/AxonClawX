/**
 * Buffer Utils Skill - ACE Buffer 二进制处理工具
 * 
 * @module buffer-utils-skill
 * @description 提供 Buffer 转换、拼接、切片、读写等功能
 * @version 1.0.0
 * @author Axon
 */

// ============================================================================
// 类型定义
// ============================================================================

export type BufferEncoding = 'hex' | 'base64' | 'utf8' | 'ascii' | 'latin1' | 'binary';

export interface BufferConvertOptions {
  from: BufferEncoding;
  to: BufferEncoding;
}

export interface BufferWriteOptions {
  offset?: number;
  encoding?: BufferEncoding;
}

export interface BufferReadOptions {
  offset?: number;
  length?: number;
  encoding?: BufferEncoding;
}

// ============================================================================
// 核心工具类
// ============================================================================

export class BufferUtils {
  /**
   * 将任意输入转换为 Buffer
   */
  static toBuffer(input: string | number[] | ArrayBuffer | Buffer, encoding: BufferEncoding = 'utf8'): Buffer {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    
    if (typeof input === 'string') {
      return Buffer.from(input, encoding);
    }
    
    if (Array.isArray(input)) {
      return Buffer.from(input);
    }
    
    if (input instanceof ArrayBuffer) {
      return Buffer.from(input);
    }
    
    throw new Error(`Unsupported input type: ${typeof input}`);
  }

  // ============================================================================
  // 1. Buffer 转换功能
  // ============================================================================

  /**
   * Buffer 转 HEX 字符串
   */
  static toHex(buffer: Buffer | string | number[], uppercase: boolean = false): string {
    const buf = this.toBuffer(buffer);
    const hex = buf.toString('hex');
    return uppercase ? hex.toUpperCase() : hex;
  }

  /**
   * Buffer 转 Base64 字符串
   */
  static toBase64(buffer: Buffer | string | number[]): string {
    const buf = this.toBuffer(buffer);
    return buf.toString('base64');
  }

  /**
   * Buffer 转 UTF8 字符串
   */
  static toUTF8(buffer: Buffer | string | number[]): string {
    const buf = this.toBuffer(buffer);
    return buf.toString('utf8');
  }

  /**
   * HEX 字符串转 Buffer
   */
  static fromHex(hex: string): Buffer {
    const cleanHex = hex.replace(/\s/g, '').replace(/^0x/i, '');
    return Buffer.from(cleanHex, 'hex');
  }

  /**
   * Base64 字符串转 Buffer
   */
  static fromBase64(base64: string): Buffer {
    return Buffer.from(base64, 'base64');
  }

  /**
   * UTF8 字符串转 Buffer
   */
  static fromUTF8(text: string): Buffer {
    return Buffer.from(text, 'utf8');
  }

  /**
   * 通用转换：支持任意编码间转换
   */
  static convert(input: string | Buffer, options: BufferConvertOptions): string {
    const buf = this.toBuffer(input, options.from);
    
    switch (options.to) {
      case 'hex':
        return buf.toString('hex');
      case 'base64':
        return buf.toString('base64');
      case 'utf8':
        return buf.toString('utf8');
      case 'ascii':
        return buf.toString('ascii');
      case 'latin1':
        return buf.toString('latin1');
      case 'binary':
        return buf.toString('binary');
      default:
        throw new Error(`Unsupported target encoding: ${options.to}`);
    }
  }

  // ============================================================================
  // 2. Buffer 拼接与切片
  // ============================================================================

  /**
   * 拼接多个 Buffer
   */
  static concat(...buffers: Array<Buffer | string | number[]>): Buffer {
    const bufList = buffers.map(b => BufferUtils.toBuffer(b));
    return Buffer.concat(bufList);
  }

  /**
   * 切片 Buffer (类似 Array.slice)
   */
  static slice(buffer: Buffer | string | number[], start: number, end?: number): Buffer {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.slice(start, end);
  }

  /**
   * 复制 Buffer 的一部分到新 Buffer
   */
  static copy(
    source: Buffer | string | number[],
    targetStart: number = 0,
    sourceStart: number = 0,
    sourceEnd?: number
  ): Buffer {
    const src = BufferUtils.toBuffer(source);
    const end = sourceEnd ?? src.length;
    const length = end - sourceStart;
    const target = Buffer.alloc(length);
    src.copy(target, 0, sourceStart, end);
    return target;
  }

  /**
   * 在指定位置插入 Buffer
   */
  static insert(
    original: Buffer | string | number[],
    insert: Buffer | string | number[],
    position: number
  ): Buffer {
    const orig = BufferUtils.toBuffer(original);
    const ins = BufferUtils.toBuffer(insert);
    
    if (position <= 0) {
      return this.concat(ins, orig);
    }
    
    if (position >= orig.length) {
      return this.concat(orig, ins);
    }
    
    const before = orig.slice(0, position);
    const after = orig.slice(position);
    return this.concat(before, ins, after);
  }

  // ============================================================================
  // 3. 二进制读取功能
  // ============================================================================

  /**
   * 读取字节 (UInt8)
   */
  static readUInt8(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readUInt8(offset);
  }

  /**
   * 读取有符号字节 (Int8)
   */
  static readInt8(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readInt8(offset);
  }

  /**
   * 读取 UInt16 (大端)
   */
  static readUInt16BE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readUInt16BE(offset);
  }

  /**
   * 读取 UInt16 (小端)
   */
  static readUInt16LE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readUInt16LE(offset);
  }

  /**
   * 读取 UInt32 (大端)
   */
  static readUInt32BE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readUInt32BE(offset);
  }

  /**
   * 读取 UInt32 (小端)
   */
  static readUInt32LE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readUInt32LE(offset);
  }

  /**
   * 读取 Float (大端)
   */
  static readFloatBE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readFloatBE(offset);
  }

  /**
   * 读取 Float (小端)
   */
  static readFloatLE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readFloatLE(offset);
  }

  /**
   * 读取 Double (大端)
   */
  static readDoubleBE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readDoubleBE(offset);
  }

  /**
   * 读取 Double (小端)
   */
  static readDoubleLE(buffer: Buffer | string | number[], offset: number = 0): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.readDoubleLE(offset);
  }

  /**
   * 读取指定长度的字符串
   */
  static readString(buffer: Buffer | string | number[], options: BufferReadOptions = {}): string {
    const buf = BufferUtils.toBuffer(buffer);
    const { offset = 0, length, encoding = 'utf8' } = options;
    const end = length ? offset + length : buf.length;
    return buf.toString(encoding, offset, end);
  }

  // ============================================================================
  // 4. 二进制写入功能
  // ============================================================================

  /**
   * 写入字节 (UInt8)
   */
  static writeUInt8(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(value, offset);
    return buf;
  }

  /**
   * 写入有符号字节 (Int8)
   */
  static writeInt8(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(1);
    buf.writeInt8(value, offset);
    return buf;
  }

  /**
   * 写入 UInt16 (大端)
   */
  static writeUInt16BE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(2);
    buf.writeUInt16BE(value, offset);
    return buf;
  }

  /**
   * 写入 UInt16 (小端)
   */
  static writeUInt16LE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(2);
    buf.writeUInt16LE(value, offset);
    return buf;
  }

  /**
   * 写入 UInt32 (大端)
   */
  static writeUInt32BE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32BE(value, offset);
    return buf;
  }

  /**
   * 写入 UInt32 (小端)
   */
  static writeUInt32LE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(value, offset);
    return buf;
  }

  /**
   * 写入 Float (大端)
   */
  static writeFloatBE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeFloatBE(value, offset);
    return buf;
  }

  /**
   * 写入 Float (小端)
   */
  static writeFloatLE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(4);
    buf.writeFloatLE(value, offset);
    return buf;
  }

  /**
   * 写入 Double (大端)
   */
  static writeDoubleBE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(value, offset);
    return buf;
  }

  /**
   * 写入 Double (小端)
   */
  static writeDoubleLE(value: number, offset: number = 0): Buffer {
    const buf = Buffer.alloc(8);
    buf.writeDoubleLE(value, offset);
    return buf;
  }

  /**
   * 写入字符串
   */
  static writeString(text: string, options: BufferWriteOptions = {}): Buffer {
    const { offset = 0, encoding = 'utf8' } = options;
    const buf = Buffer.from(text, encoding);
    return buf;
  }

  /**
   * 创建指定大小的 Buffer 并填充
   */
  static alloc(size: number, fill?: number | string | Buffer, encoding: BufferEncoding = 'utf8'): Buffer {
    if (fill === undefined) {
      return Buffer.alloc(size);
    }
    return Buffer.alloc(size, fill, encoding);
  }

  /**
   * 创建未初始化的 Buffer (性能更高，但包含敏感数据风险)
   */
  static allocUnsafe(size: number): Buffer {
    return Buffer.allocUnsafe(size);
  }

  // ============================================================================
  // 5. 工具方法
  // ============================================================================

  /**
   * 获取 Buffer 长度
   */
  static getSize(buffer: Buffer | string | number[]): number {
    const buf = BufferUtils.toBuffer(buffer);
    return buf.length;
  }

  /**
   * 比较两个 Buffer 是否相等
   */
  static equals(a: Buffer | string | number[], b: Buffer | string | number[]): boolean {
    const bufA = BufferUtils.toBuffer(a);
    const bufB = BufferUtils.toBuffer(b);
    return bufA.equals(bufB);
  }

  /**
   * 比较两个 Buffer (返回 -1/0/1)
   */
  static compare(a: Buffer | string | number[], b: Buffer | string | number[]): number {
    const bufA = BufferUtils.toBuffer(a);
    const bufB = BufferUtils.toBuffer(b);
    return Buffer.compare(bufA, bufB);
  }

  /**
   * 填充 Buffer
   */
  static fill(
    buffer: Buffer | string | number[],
    value: number | string | Buffer = 0,
    encoding: BufferEncoding = 'utf8'
  ): Buffer {
    const buf = BufferUtils.toBuffer(buffer);
    buf.fill(value, 0, buf.length, encoding);
    return buf;
  }

  /**
   * 反转 Buffer
   */
  static reverse(buffer: Buffer | string | number[]): Buffer {
    const buf = BufferUtils.toBuffer(buffer);
    const reversed = Buffer.from(buf);
    for (let i = 0, j = reversed.length - 1; i < j; i++, j--) {
      const temp = reversed[i];
      reversed[i] = reversed[j];
      reversed[j] = temp;
    }
    return reversed;
  }

  /**
   * 计算 Buffer 的哈希 (使用内置 crypto)
   */
  static async hash(buffer: Buffer | string | number[], algorithm: string = 'sha256'): Promise<string> {
    const crypto = await import('crypto');
    const buf = BufferUtils.toBuffer(buffer);
    const hash = crypto.createHash(algorithm);
    hash.update(buf);
    return hash.digest('hex');
  }
}

// ============================================================================
// 便捷函数 (函数式 API) - 绑定 this 上下文
// ============================================================================

export const toHex = BufferUtils.toHex.bind(BufferUtils);
export const toBase64 = BufferUtils.toBase64.bind(BufferUtils);
export const toUTF8 = BufferUtils.toUTF8.bind(BufferUtils);
export const fromHex = BufferUtils.fromHex.bind(BufferUtils);
export const fromBase64 = BufferUtils.fromBase64.bind(BufferUtils);
export const fromUTF8 = BufferUtils.fromUTF8.bind(BufferUtils);
export const convert = BufferUtils.convert.bind(BufferUtils);
export const concat = BufferUtils.concat.bind(BufferUtils);
export const slice = BufferUtils.slice.bind(BufferUtils);
export const copy = BufferUtils.copy.bind(BufferUtils);
export const insert = BufferUtils.insert.bind(BufferUtils);
export const readUInt8 = BufferUtils.readUInt8.bind(BufferUtils);
export const readUInt16BE = BufferUtils.readUInt16BE.bind(BufferUtils);
export const readUInt16LE = BufferUtils.readUInt16LE.bind(BufferUtils);
export const readUInt32BE = BufferUtils.readUInt32BE.bind(BufferUtils);
export const readUInt32LE = BufferUtils.readUInt32LE.bind(BufferUtils);
export const readFloatBE = BufferUtils.readFloatBE.bind(BufferUtils);
export const readFloatLE = BufferUtils.readFloatLE.bind(BufferUtils);
export const readDoubleBE = BufferUtils.readDoubleBE.bind(BufferUtils);
export const readDoubleLE = BufferUtils.readDoubleLE.bind(BufferUtils);
export const readString = BufferUtils.readString.bind(BufferUtils);
export const writeUInt8 = BufferUtils.writeUInt8.bind(BufferUtils);
export const writeUInt16BE = BufferUtils.writeUInt16BE.bind(BufferUtils);
export const writeUInt16LE = BufferUtils.writeUInt16LE.bind(BufferUtils);
export const writeUInt32BE = BufferUtils.writeUInt32BE.bind(BufferUtils);
export const writeUInt32LE = BufferUtils.writeUInt32LE.bind(BufferUtils);
export const writeFloatBE = BufferUtils.writeFloatBE.bind(BufferUtils);
export const writeFloatLE = BufferUtils.writeFloatLE.bind(BufferUtils);
export const writeDoubleBE = BufferUtils.writeDoubleBE.bind(BufferUtils);
export const writeDoubleLE = BufferUtils.writeDoubleLE.bind(BufferUtils);
export const writeString = BufferUtils.writeString.bind(BufferUtils);
export const alloc = BufferUtils.alloc.bind(BufferUtils);
export const getSize = BufferUtils.getSize.bind(BufferUtils);
export const equals = BufferUtils.equals.bind(BufferUtils);
export const compare = BufferUtils.compare.bind(BufferUtils);
export const reverse = BufferUtils.reverse.bind(BufferUtils);
export const hash = BufferUtils.hash.bind(BufferUtils);

// ============================================================================
// 默认导出
// ============================================================================

export default BufferUtils;

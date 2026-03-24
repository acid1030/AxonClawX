/**
 * Buffer Utils Skill - 使用示例
 * 
 * @description 展示 BufferUtils 的各种使用场景
 * @author Axon
 */

import { BufferUtils, toHex, toBase64, fromHex, fromBase64, concat, slice, toUTF8 } from './buffer-utils-skill';

// ============================================================================
// 示例 1: 基础转换
// ============================================================================

console.log('=== 示例 1: 基础转换 ===\n');

// 字符串转 Buffer
const text = 'Hello, Axon!';
const buffer = BufferUtils.fromUTF8(text);
console.log('原始文本:', text);
console.log('Buffer:', buffer);

// Buffer 转 HEX
const hexString = BufferUtils.toHex(buffer);
console.log('HEX 编码:', hexString);
// 输出: 48656c6c6f2c2041786f6e21

// Buffer 转 Base64
const base64String = BufferUtils.toBase64(buffer);
console.log('Base64 编码:', base64String);
// 输出: SGVsbG8sIEF4b24h

// HEX 转 Buffer
const hexBuffer = BufferUtils.fromHex(hexString);
console.log('HEX 解码:', BufferUtils.toUTF8(hexBuffer));

// Base64 转 Buffer
const base64Buffer = BufferUtils.fromBase64(base64String);
console.log('Base64 解码:', BufferUtils.toUTF8(base64Buffer));

console.log('\n');

// ============================================================================
// 示例 2: 编码间转换
// ============================================================================

console.log('=== 示例 2: 编码间转换 ===\n');

// 直接转换：HEX → Base64
const hexInput = '48656c6c6f';
const converted = BufferUtils.convert(hexInput, { from: 'hex', to: 'base64' });
console.log(`${hexInput} (HEX) → ${converted} (Base64)`);
// 输出: 48656c6c6f (HEX) → SGVsbG8= (Base64)

// 直接转换：Base64 → UTF8
const base64Input = 'QXhvbg==';
const utf8Text = BufferUtils.convert(base64Input, { from: 'base64', to: 'utf8' });
console.log(`${base64Input} (Base64) → ${utf8Text} (UTF8)`);
// 输出: QXhvbg== (Base64) → Axon (UTF8)

console.log('\n');

// ============================================================================
// 示例 3: Buffer 拼接与切片
// ============================================================================

console.log('=== 示例 3: Buffer 拼接与切片 ===\n');

// 拼接多个 Buffer
const buf1 = BufferUtils.fromUTF8('Hello, ');
const buf2 = BufferUtils.fromUTF8('Axon');
const buf3 = BufferUtils.fromUTF8('!');
const combined = BufferUtils.concat(buf1, buf2, buf3);
console.log('拼接结果:', BufferUtils.toUTF8(combined));
// 输出: Hello, Axon!

// 也可以使用便捷函数
const combined2 = concat('Part1 ', 'Part2 ', 'Part3');
console.log('便捷拼接:', BufferUtils.toUTF8(combined2));

// 切片 Buffer
const source = BufferUtils.fromUTF8('0123456789');
const sliced = BufferUtils.slice(source, 2, 6);
console.log('切片 [2:6]:', BufferUtils.toUTF8(sliced));
// 输出: 2345

// 复制 Buffer 的一部分
const copied = BufferUtils.copy(source, 0, 3, 7);
console.log('复制 [3:7]:', BufferUtils.toUTF8(copied));
// 输出: 3456

// 在指定位置插入
const original = BufferUtils.fromUTF8('Hello World!');
const inserted = BufferUtils.insert(original, BufferUtils.fromUTF8('Beautiful '), 6);
console.log('插入结果:', BufferUtils.toUTF8(inserted));
// 输出: Hello Beautiful World!

console.log('\n');

// ============================================================================
// 示例 4: 二进制读取
// ============================================================================

console.log('=== 示例 4: 二进制读取 ===\n');

// 创建包含多种数据类型的 Buffer (1+2+4+4+8 = 19 字节)
const header = Buffer.alloc(19);
header.writeUInt8(1, 0);           // 版本号 (1 字节)
header.writeUInt16BE(256, 1);      // 长度 (2 字节，大端)
header.writeUInt32LE(12345, 3);    // ID (4 字节，小端)
header.writeFloatBE(3.14, 7);      // 浮点数 (4 字节)
header.writeDoubleBE(2.71828, 11); // 双精度 (8 字节)

console.log('Header Buffer:', BufferUtils.toHex(header));

// 读取各个字段
const version = BufferUtils.readUInt8(header, 0);
console.log('版本号:', version);

const length = BufferUtils.readUInt16BE(header, 1);
console.log('长度 (大端):', length);

const id = BufferUtils.readUInt32LE(header, 3);
console.log('ID (小端):', id);

const pi = BufferUtils.readFloatBE(header, 7);
console.log('浮点数 (π):', pi.toFixed(2));

const e = BufferUtils.readDoubleBE(header, 11);
console.log('双精度 (e):', e.toFixed(5));

console.log('\n');

// ============================================================================
// 示例 5: 二进制写入
// ============================================================================

console.log('=== 示例 5: 二进制写入 ===\n');

// 构建协议包
const versionBuf = BufferUtils.writeUInt8(2);           // 版本 2
const typeBuf = BufferUtils.writeUInt8(1);              // 类型：请求
const lengthBuf = BufferUtils.writeUInt16BE(1024);      // 数据长度
const payloadBuf = BufferUtils.writeString('{"action":"ping"}');

// 拼接成完整包
const packet = BufferUtils.concat(versionBuf, typeBuf, lengthBuf, payloadBuf);
console.log('协议包 HEX:', BufferUtils.toHex(packet));
console.log('协议包长度:', BufferUtils.getSize(packet));

console.log('\n');

// ============================================================================
// 示例 6: 实用工具
// ============================================================================

console.log('=== 示例 6: 实用工具 ===\n');

// 获取长度
const data = BufferUtils.fromUTF8('AxonClaw');
console.log('数据长度:', BufferUtils.getSize(data));

// 比较 Buffer
const bufA = BufferUtils.fromUTF8('test');
const bufB = BufferUtils.fromUTF8('test');
const bufC = BufferUtils.fromUTF8('Test');
console.log('bufA === bufB:', BufferUtils.equals(bufA, bufB)); // true
console.log('bufA === bufC:', BufferUtils.equals(bufA, bufC)); // false

// 比较大小
console.log('bufA vs bufC:', BufferUtils.compare(bufA, bufC)); // 正数 (小写 > 大写)

// 反转 Buffer
const original2 = BufferUtils.fromUTF8('12345');
const reversed = BufferUtils.reverse(original2);
console.log('反转前:', BufferUtils.toUTF8(original2));
console.log('反转后:', BufferUtils.toUTF8(reversed));

// 填充 Buffer
const zeros = BufferUtils.alloc(8, 0);
console.log('零填充:', BufferUtils.toHex(zeros));

const filled = BufferUtils.alloc(8, 'A');
console.log('字符填充:', BufferUtils.toUTF8(filled));

console.log('\n');

// ============================================================================
// 示例 7: 哈希计算 (异步)
// ============================================================================

console.log('=== 示例 7: 哈希计算 ===\n');

async function runHashExamples() {
  const message = BufferUtils.fromUTF8('Hello, Axon!');

  // SHA256
  const sha256Hash = await BufferUtils.hash(message, 'sha256');
  console.log('SHA256:', sha256Hash);

  // MD5
  const md5Hash = await BufferUtils.hash(message, 'md5');
  console.log('MD5:', md5Hash);

  // SHA1
  const sha1Hash = await BufferUtils.hash(message, 'sha1');
  console.log('SHA1:', sha1Hash);

  console.log('\n');
}

// ============================================================================
// 示例 8: 实际应用场景
// ============================================================================

console.log('=== 示例 8: 实际应用场景 ===\n');

// 场景 1: WebSocket 二进制消息处理
interface WSMessage {
  type: number;
  payload: string;
  timestamp: number;
}

function encodeWSMessage(msg: WSMessage): Buffer {
  const typeBuf = BufferUtils.writeUInt8(msg.type);
  const timestampBuf = BufferUtils.writeUInt32LE(Math.floor(msg.timestamp / 1000));
  const payloadBuf = BufferUtils.writeString(msg.payload);
  const lengthBuf = BufferUtils.writeUInt16BE(payloadBuf.length);
  
  return BufferUtils.concat(typeBuf, timestampBuf, lengthBuf, payloadBuf);
}

function decodeWSMessage(buffer: Buffer): WSMessage {
  const type = BufferUtils.readUInt8(buffer, 0);
  const timestamp = BufferUtils.readUInt32LE(buffer, 1) * 1000;
  const payloadLength = BufferUtils.readUInt16BE(buffer, 5);
  const payload = BufferUtils.readString(buffer, { offset: 7, length: payloadLength });
  
  return { type, payload, timestamp };
}

const wsMsg: WSMessage = { type: 1, payload: 'Hello', timestamp: Date.now() };
const encoded = encodeWSMessage(wsMsg);
console.log('WS 消息编码:', BufferUtils.toHex(encoded));

const decoded = decodeWSMessage(encoded);
console.log('WS 消息解码:', decoded);

// 场景 2: 文件头解析 (PNG 示例)
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
console.log('PNG 魔数:', BufferUtils.toHex(pngHeader));
console.log('是 PNG 文件吗？', BufferUtils.equals(pngHeader, '89504e470d0a1a0a'));

// 场景 3: 网络字节序转换
const hostShort = 0x1234;
const networkShort = BufferUtils.writeUInt16BE(hostShort);
console.log('主机序 0x1234 → 网络序:', BufferUtils.toHex(networkShort));

console.log('\n');

// ============================================================================
// 示例 9: 函数式 API
// ============================================================================

console.log('=== 示例 9: 函数式 API (便捷函数) ===\n');

// 直接使用导出函数，无需类前缀
const hex = toHex('Axon');
console.log('toHex("Axon"):', hex);

const base64 = toBase64('Axon');
console.log('toBase64("Axon"):', base64);

const utf8 = toUTF8(fromHex(hex));
console.log('toUTF8(fromHex(hex)):', utf8);

const joined = concat('Hello', ' ', 'World');
console.log('concat("Hello", " ", "World"):', toUTF8(joined));

const part = slice('Hello World', 0, 5);
console.log('slice("Hello World", 0, 5):', toUTF8(part));

console.log('\n');

// 运行异步示例
runHashExamples().then(() => {
  console.log('=== 所有示例执行完成 ===');
});

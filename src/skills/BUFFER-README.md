# Buffer Utils Skill - ACE Buffer 处理工具

**版本:** 1.0.0  
**作者:** Axon  
**位置:** `src/skills/buffer-utils-skill.ts`

---

## 🎯 功能概览

| 功能类别 | 方法数 | 描述 |
|---------|--------|------|
| **Buffer 转换** | 6+ | HEX/Base64/UTF8 互转 |
| **拼接与切片** | 4 | concat/slice/copy/insert |
| **二进制读取** | 12+ | UInt8/16/32, Float, Double |
| **二进制写入** | 12+ | 写入各种数据类型 |
| **工具方法** | 8+ | 比较/哈希/反转等 |

---

## 🚀 快速开始

### 导入

```typescript
// 类式 API
import { BufferUtils } from './buffer-utils-skill';

// 函数式 API
import { toHex, toBase64, fromHex, concat, slice } from './buffer-utils-skill';
```

### 基础转换

```typescript
// 字符串 → Buffer
const buffer = BufferUtils.fromUTF8('Hello, Axon!');

// Buffer → HEX
const hex = BufferUtils.toHex(buffer);
// 输出: 48656c6c6f2c2041786f6e21

// Buffer → Base64
const base64 = BufferUtils.toBase64(buffer);
// 输出: SGVsbG8sIEF4b24h

// HEX → Buffer
const decoded = BufferUtils.fromHex(hex);
console.log(BufferUtils.toUTF8(decoded)); // "Hello, Axon!"

// 直接转换：HEX → Base64
const converted = BufferUtils.convert('48656c6c6f', { from: 'hex', to: 'base64' });
// 输出: SGVsbG8=
```

### Buffer 拼接与切片

```typescript
// 拼接多个 Buffer
const combined = BufferUtils.concat('Hello, ', 'Axon', '!');
console.log(BufferUtils.toUTF8(combined)); // "Hello, Axon!"

// 切片
const sliced = BufferUtils.slice('0123456789', 2, 6);
console.log(BufferUtils.toUTF8(sliced)); // "2345"

// 复制部分
const copied = BufferUtils.copy('0123456789', 0, 3, 7);
console.log(BufferUtils.toUTF8(copied)); // "3456"

// 插入
const inserted = BufferUtils.insert('Hello World!', 'Beautiful ', 6);
console.log(BufferUtils.toUTF8(inserted)); // "Hello Beautiful World!"
```

### 二进制读写

```typescript
// 构建协议包
const version = BufferUtils.writeUInt8(2);
const length = BufferUtils.writeUInt16BE(1024);
const payload = BufferUtils.writeString('{"action":"ping"}');

const packet = BufferUtils.concat(version, length, payload);
console.log('包长度:', BufferUtils.getSize(packet));

// 读取二进制数据
const header = Buffer.from([0x01, 0x02, 0x03, 0x04]);
const v1 = BufferUtils.readUInt8(header, 0);    // 1
const v2 = BufferUtils.readUInt16BE(header, 1); // 515
const v3 = BufferUtils.readUInt32LE(header, 0); // 67305985
```

### 函数式 API

```typescript
import { toHex, toBase64, concat, slice } from './buffer-utils-skill';

const hex = toHex('Axon');           // 41786f6e
const base64 = toBase64('Axon');     // QXhvbg==
const joined = concat('A', 'B', 'C'); // Buffer
const part = slice('Hello', 0, 2);   // Buffer("He")
```

---

## 📚 API 参考

### 转换方法

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `toHex(buffer, uppercase?)` | Buffer\|string\|number[], boolean | string | 转 HEX |
| `toBase64(buffer)` | Buffer\|string\|number[] | string | 转 Base64 |
| `toUTF8(buffer)` | Buffer\|string\|number[] | string | 转 UTF8 |
| `fromHex(hex)` | string | Buffer | HEX 转 Buffer |
| `fromBase64(base64)` | string | Buffer | Base64 转 Buffer |
| `fromUTF8(text)` | string | Buffer | UTF8 转 Buffer |
| `convert(input, options)` | string\|Buffer, BufferConvertOptions | string | 任意编码转换 |

### 拼接与切片

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `concat(...buffers)` | Array<Buffer\|string\|number[]> | Buffer | 拼接 |
| `slice(buffer, start, end?)` | Buffer\|..., number, number? | Buffer | 切片 |
| `copy(source, targetStart, sourceStart, sourceEnd?)` | Buffer\|..., number, number, number? | Buffer | 复制 |
| `insert(original, insert, position)` | Buffer\|..., Buffer\|..., number | Buffer | 插入 |

### 二进制读取

| 方法 | 字节数 | 描述 |
|------|--------|------|
| `readUInt8(buffer, offset)` | 1 | 无符号字节 |
| `readInt8(buffer, offset)` | 1 | 有符号字节 |
| `readUInt16BE/LE(buffer, offset)` | 2 | 16 位整数 (大/小端) |
| `readUInt32BE/LE(buffer, offset)` | 4 | 32 位整数 (大/小端) |
| `readFloatBE/LE(buffer, offset)` | 4 | 浮点数 (大/小端) |
| `readDoubleBE/LE(buffer, offset)` | 8 | 双精度 (大/小端) |
| `readString(buffer, options)` | 可变 | 字符串 |

### 二进制写入

| 方法 | 字节数 | 描述 |
|------|--------|------|
| `writeUInt8(value, offset)` | 1 | 写入无符号字节 |
| `writeInt8(value, offset)` | 1 | 写入有符号字节 |
| `writeUInt16BE/LE(value, offset)` | 2 | 写入 16 位整数 |
| `writeUInt32BE/LE(value, offset)` | 4 | 写入 32 位整数 |
| `writeFloatBE/LE(value, offset)` | 4 | 写入浮点数 |
| `writeDoubleBE/LE(value, offset)` | 8 | 写入双精度 |
| `writeString(text, options)` | 可变 | 写入字符串 |

### 工具方法

| 方法 | 描述 |
|------|------|
| `getSize(buffer)` | 获取长度 |
| `equals(a, b)` | 比较是否相等 |
| `compare(a, b)` | 比较大小 (-1/0/1) |
| `fill(buffer, value, encoding)` | 填充 |
| `reverse(buffer)` | 反转 |
| `alloc(size, fill?, encoding?)` | 分配 Buffer |
| `hash(buffer, algorithm?)` | 计算哈希 (异步) |

---

## 💡 实际应用场景

### 1. WebSocket 二进制消息

```typescript
interface WSMessage {
  type: number;
  payload: string;
  timestamp: number;
}

function encodeWSMessage(msg: WSMessage): Buffer {
  const typeBuf = BufferUtils.writeUInt8(msg.type);
  const tsBuf = BufferUtils.writeUInt32LE(Math.floor(msg.timestamp / 1000));
  const payloadBuf = BufferUtils.writeString(msg.payload);
  const lengthBuf = BufferUtils.writeUInt16BE(payloadBuf.length);
  
  return BufferUtils.concat(typeBuf, tsBuf, lengthBuf, payloadBuf);
}

function decodeWSMessage(buffer: Buffer): WSMessage {
  const type = BufferUtils.readUInt8(buffer, 0);
  const timestamp = BufferUtils.readUInt32LE(buffer, 1) * 1000;
  const payloadLength = BufferUtils.readUInt16BE(buffer, 5);
  const payload = BufferUtils.readString(buffer, { offset: 7, length: payloadLength });
  
  return { type, payload, timestamp };
}
```

### 2. 文件头解析

```typescript
// PNG 文件验证
const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const isPNG = BufferUtils.equals(pngHeader, '89504e470d0a1a0a');
```

### 3. 网络字节序转换

```typescript
// 主机序 → 网络序 (大端)
const hostShort = 0x1234;
const networkOrder = BufferUtils.writeUInt16BE(hostShort);

// 网络序 → 主机序
const hostOrder = BufferUtils.readUInt16BE(networkOrder, 0);
```

---

## 📝 使用示例文件

完整示例见：`src/skills/buffer-utils-examples.ts`

运行示例：
```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/buffer-utils-examples.ts
```

---

## ⚡ 性能提示

1. **优先使用便捷函数** - 函数式 API 更简洁
2. **避免重复转换** - 缓存已转换的 Buffer
3. **使用 allocUnsafe 需谨慎** - 可能包含敏感数据
4. **大端 vs 小端** - 网络协议用大端 (BE)，x86 用小端 (LE)

---

**最后更新:** 2026-03-13  
**状态:** ✅ 完成

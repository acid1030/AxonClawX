# IP 地址处理工具技能

**文件:** `src/skills/ip-utils-skill.ts`  
**示例:** `src/skills/ip-utils-examples.ts`

---

## 📋 功能概览

### 1. IP 格式验证 ✅
- IPv4 地址验证 (严格的八位组检查)
- IPv6 地址验证 (支持压缩格式)
- 自动版本检测
- 前导零检测

### 2. IP 转换 🔄
- IPv4 ↔ 32 位整数
- IPv6 ↔ 128 位整数 (BigInt)
- IPv4 → IPv6 映射 (::ffff:x.x.x.x)
- IPv6 → IPv4 (仅映射地址)
- IPv4 兼容 IPv6 (::x.x.x.x)

### 3. 子网计算 🌐
- CIDR 前缀 ↔ 子网掩码
- 网络地址/广播地址计算
- 可用主机数统计
- IP 范围计算
- 子网内 IP 检查
- 子网 IP 列表生成

---

## 🚀 快速开始

### 安装/导入

```typescript
import {
  validateIP,
  validateIPv4,
  validateIPv6,
  parseIPv4,
  parseIPv6,
  ipv4ToInt,
  intToIPv4,
  ipv4ToIPv6,
  ipv6ToIPv4,
  calculateIPv4Subnet,
  isIPInSubnet,
  cidrToSubnetMask,
  subnetMaskToCidr
} from './ip-utils-skill';
```

---

## 📖 API 文档

### 验证函数

#### `validateIP(ip: string): IPValidationResult`
验证任意 IP 地址 (自动检测版本)

```typescript
validateIP('192.168.1.1');
// { isValid: true, version: 'IPv4' }

validateIP('2001:db8::1');
// { isValid: true, version: 'IPv6' }

validateIP('invalid');
// { isValid: false, error: '...' }
```

#### `validateIPv4(ip: string): IPValidationResult`
验证 IPv4 地址

```typescript
validateIPv4('192.168.1.1'); // ✅
validateIPv4('256.1.1.1');   // ❌ 超出范围
validateIPv4('192.168.01.1'); // ❌ 前导零
```

#### `validateIPv6(ip: string): IPValidationResult`
验证 IPv6 地址

```typescript
validateIPv6('2001:db8::1');           // ✅ 压缩格式
validateIPv6('2001:0db8:0000::1');     // ✅ 部分压缩
validateIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334'); // ✅ 完整格式
validateIPv6('2001::db8::1');          // ❌ 多个 ::
```

#### `isValidIP(ip: string): boolean`
快速验证 (返回布尔值)

```typescript
isValidIP('192.168.1.1'); // true
isValidIP('invalid');     // false
```

#### `detectIPVersion(ip: string): IPVersion | undefined`
检测 IP 版本

```typescript
detectIPVersion('10.0.0.1'); // 'IPv4'
detectIPVersion('::1');      // 'IPv6'
detectIPVersion('invalid');  // undefined
```

---

### IPv4 工具

#### `parseIPv4(ip: string): IPv4Address`
解析 IPv4 地址

```typescript
parseIPv4('192.168.1.1');
// {
//   version: 'IPv4',
//   address: '192.168.1.1',
//   octets: [192, 168, 1, 1]
// }
```

#### `ipv4ToInt(ip: string | IPv4Address): number`
IPv4 → 32 位整数

```typescript
ipv4ToInt('192.168.1.1'); // 3232235777
```

#### `intToIPv4(num: number): string`
32 位整数 → IPv4

```typescript
intToIPv4(3232235777); // '192.168.1.1'
```

#### `normalizeIPv4(ip: string): string`
标准化 IPv4 格式

```typescript
normalizeIPv4('010.000.001.001'); // '10.0.1.1'
```

---

### IPv6 工具

#### `parseIPv6(ip: string): IPv6Address`
解析 IPv6 地址

```typescript
parseIPv6('2001:db8::1');
// {
//   version: 'IPv6',
//   address: '2001:db8::1',
//   compressed: '2001:db8::1',
//   expanded: '2001:0db8:0000:0000:0000:0000:0000:0001',
//   segments: [8193, 3512, 0, 0, 0, 0, 0, 1]
// }
```

#### `ipv6ToInts(ip: string | IPv6Address): [bigint, bigint]`
IPv6 → 2 个 64 位整数

```typescript
ipv6ToInts('2001:db8::1');
// [2306139525200691200n, 1n]
```

#### `intsToIPv6(high: bigint, low: bigint, compressed?: boolean): string`
2 个 64 位整数 → IPv6

```typescript
intsToIPv6(2306139525200691200n, 1n); // '2001:db8::1'
```

#### `normalizeIPv6(ip: string): string`
标准化 IPv6 格式 (压缩)

```typescript
normalizeIPv6('2001:0DB8:0000:0000:0000:0000:0000:0001');
// '2001:db8::1'
```

---

### IP 转换

#### `ipv4ToIPv6(ipv4: string): string`
IPv4 → IPv6 映射地址

```typescript
ipv4ToIPv6('192.168.1.1'); // '::ffff:c0a8:101'
```

#### `ipv6ToIPv4(ipv6: string): string`
IPv6 映射地址 → IPv4

```typescript
ipv6ToIPv4('::ffff:c0a8:101'); // '192.168.1.1'
```

#### `ipv4ToIPv6Compatible(ipv4: string): string`
IPv4 → IPv4 兼容 IPv6

```typescript
ipv4ToIPv6Compatible('192.168.1.1'); // '::c0a8:101'
```

---

### 子网计算

#### `calculateIPv4Subnet(ip: string): SubnetInfo`
计算 IPv4 子网信息

```typescript
calculateIPv4Subnet('192.168.1.100/24');
// {
//   networkAddress: '192.168.1.0',
//   broadcastAddress: '192.168.1.255',
//   subnetMask: '255.255.255.0',
//   cidr: 24,
//   totalHosts: 256,
//   usableHosts: 254,
//   firstUsableIP: '192.168.1.1',
//   lastUsableIP: '192.168.1.254',
//   ipRange: '192.168.1.1 - 192.168.1.254'
// }
```

#### `cidrToSubnetMask(cidr: number): string`
CIDR → 子网掩码

```typescript
cidrToSubnetMask(24); // '255.255.255.0'
cidrToSubnetMask(26); // '255.255.255.192'
```

#### `subnetMaskToCidr(subnetMask: string): number`
子网掩码 → CIDR

```typescript
subnetMaskToCidr('255.255.255.0');   // 24
subnetMaskToCidr('255.255.255.192'); // 26
```

#### `isIPInSubnet(ip: string, subnet: string): boolean`
检查 IP 是否在子网内

```typescript
isIPInSubnet('192.168.1.50', '192.168.1.0/24'); // true
isIPInSubnet('192.168.2.50', '192.168.1.0/24'); // false
```

#### `getSubnetIPs(subnet: string, limit?: number): string[]`
获取子网内所有 IP (限制：/22 或更小)

```typescript
getSubnetIPs('192.168.1.0/30');
// ['192.168.1.0', '192.168.1.1', '192.168.1.2', '192.168.1.3']
```

---

### 其他工具

#### `normalizeIP(ip: string): string`
标准化任意 IP 地址

```typescript
normalizeIP('010.000.001.001'); // '10.0.1.1'
normalizeIP('2001:0DB8::0001'); // '2001:db8::1'
```

#### `compareIP(ip1: string, ip2: string): number`
比较两个 IP 地址

```typescript
compareIP('10.0.0.1', '10.0.0.2');  // -1
compareIP('10.0.0.2', '10.0.0.1');  // 1
compareIP('10.0.0.1', '10.0.0.1');  // 0

// IP 排序
['192.168.1.10', '192.168.1.2', '192.168.1.100']
  .sort(compareIP);
// ['192.168.1.2', '192.168.1.10', '192.168.1.100']
```

---

## 💡 实际应用场景

### 场景 1: 用户输入验证

```typescript
function validateUserInput(ip: string): string {
  const result = validateIP(ip);
  if (!result.isValid) {
    return `❌ 无效的 IP 地址：${result.error}`;
  }
  return `✅ 有效的 ${result.version} 地址：${normalizeIP(ip)}`;
}
```

### 场景 2: 访问控制列表 (ACL)

```typescript
const allowedSubnets = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16'
];

function isAllowed(ip: string): boolean {
  return allowedSubnets.some(subnet => isIPInSubnet(ip, subnet));
}

isAllowed('10.1.2.3');      // true
isAllowed('8.8.8.8');       // false
```

### 场景 3: 网络配置生成

```typescript
function printNetworkConfig(cidr: string) {
  const info = calculateIPv4Subnet(cidr);
  console.log(`网络：${cidr}`);
  console.log(`  网络地址：${info.networkAddress}`);
  console.log(`  子网掩码：${info.subnetMask}`);
  console.log(`  可用 IP: ${info.firstUsableIP} ~ ${info.lastUsableIP}`);
  console.log(`  可用主机数：${info.usableHosts}`);
}

printNetworkConfig('192.168.1.0/24');
```

### 场景 4: IP 地址排序

```typescript
const ips = ['192.168.1.10', '192.168.1.2', '192.168.1.100', '10.0.0.1'];
const sorted = [...ips].sort(compareIP);
// ['10.0.0.1', '192.168.1.2', '192.168.1.10', '192.168.1.100']
```

---

## ⚠️ 注意事项

### 1. IPv4 前导零
```typescript
validateIPv4('192.168.01.1'); // ❌ 错误：前导零
validateIPv4('192.168.1.1');  // ✅ 正确
```

### 2. IPv6 双冒号限制
```typescript
validateIPv6('2001::db8::1'); // ❌ 错误：多个 ::
validateIPv6('2001:db8::1');  // ✅ 正确
```

### 3. 子网大小限制
```typescript
getSubnetIPs('10.0.0.0/8');   // ❌ 错误：子网太大
getSubnetIPs('192.168.1.0/24'); // ✅ 正确 (256 个 IP)
getSubnetIPs('192.168.1.0/30'); // ✅ 正确 (4 个 IP)
```

### 4. IPv6 转换限制
```typescript
ipv6ToIPv4('::ffff:192.168.1.1'); // ✅ 仅支持 IPv4 映射地址
ipv6ToIPv4('2001:db8::1');        // ❌ 错误：非映射地址
```

---

## 🧪 运行示例

```bash
# 运行示例文件
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/ip-utils-examples.ts
```

---

## 📊 性能特点

- ✅ 零外部依赖
- ✅ 纯函数实现
- ✅ TypeScript 类型安全
- ✅ 完整的错误处理
- ✅ 支持 IPv4/IPv6 双栈

---

## 📝 更新日志

**v1.0.0** (2026-03-13)
- ✅ IPv4/IPv6 验证
- ✅ IPv4 ↔ 整数转换
- ✅ IPv6 ↔ BigInt 转换
- ✅ IPv4 ↔ IPv6 映射
- ✅ 子网计算
- ✅ IP 比较/排序

---

**维护者:** Axon  
**最后更新:** 2026-03-13

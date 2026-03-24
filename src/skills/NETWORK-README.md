# 🔧 网络工具技能 - Network Utils Skill

**技能名称:** `network-utils-skill`  
**创建者:** ACE  
**功能:** TCP 连接、UDP 通信、端口扫描  
**依赖:** Node.js 原生模块 (net, dgram) - 无需额外安装

---

## 📦 安装

无需安装！使用 Node.js 原生模块。

```bash
# 直接使用
uv run ts-node src/skills/network-utils-skill.ts
```

---

## 🚀 快速开始

### 1. TCP 连接测试

```typescript
import { tcpConnect } from './network-utils-skill';

// 测试本地 HTTP 服务
const result = await tcpConnect('127.0.0.1', 80);
console.log(result);
// { success: true, host: '127.0.0.1', port: 80, responseTime: 15 }

// 测试远程服务 (带超时)
const result2 = await tcpConnect('example.com', 443, 3000);
console.log(result2);
// { success: true, host: 'example.com', port: 443, responseTime: 120 }
```

### 2. UDP 通信测试

```typescript
import { udpCommunicate } from './network-utils-skill';

// 发送简单的 UDP 消息
const result = await udpCommunicate('127.0.0.1', 53, Buffer.from('ping'));
console.log(result);
// { success: true, host: '127.0.0.1', port: 53, responseTime: 25, responseData: <Buffer ...> }

// 发送 DNS 查询 (示例)
const dnsQuery = Buffer.from([
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x07, 0x65, 0x78, 0x61,
  0x6d, 0x70, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d,
  0x00, 0x00, 0x01, 0x00, 0x01
]);
const dnsResult = await udpCommunicate('8.8.8.8', 53, dnsQuery, 5000);
```

### 3. 端口扫描

```typescript
import { scanPorts, quickScan } from './network-utils-skill';

// 快速扫描常用端口 (20 个常见服务端口)
const results = await quickScan('192.168.1.1');
console.log(results.filter(r => r.status === 'open'));
// [
//   { port: 22, status: 'open', service: 'SSH', responseTime: 15 },
//   { port: 80, status: 'open', service: 'HTTP', responseTime: 12 }
// ]

// 扫描指定端口范围
const fullScan = await scanPorts('192.168.1.1', 1, 1024, 50, 1000);
// 参数：主机，起始端口，结束端口，并发数，超时时间

// 只查看开放端口
const openPorts = fullScan.filter(r => r.status === 'open');
console.log(`发现 ${openPorts.length} 个开放端口`);
openPorts.forEach(port => {
  console.log(`  端口 ${port.port} - ${port.service || 'Unknown'} (${port.responseTime}ms)`);
});
```

---

## 📖 API 参考

### `tcpConnect(host, port, timeout?)`

测试 TCP 端口连接性。

**参数:**
- `host` (string): 目标主机地址 (IP 或域名)
- `port` (number): 目标端口号
- `timeout` (number, 可选): 连接超时时间 (毫秒)，默认 5000ms

**返回:** `Promise<TCPConnectionResult>`
```typescript
interface TCPConnectionResult {
  success: boolean;
  host: string;
  port: number;
  responseTime?: number;
  error?: string;
  data?: string;
}
```

**示例:**
```typescript
const result = await tcpConnect('google.com', 443);
if (result.success) {
  console.log(`✅ 连接成功，响应时间：${result.responseTime}ms`);
} else {
  console.log(`❌ 连接失败：${result.error}`);
}
```

---

### `udpCommunicate(host, port, message?, timeout?)`

发送 UDP 数据包并等待响应。

**参数:**
- `host` (string): 目标主机地址
- `port` (number): 目标端口号
- `message` (Buffer | string, 可选): 要发送的消息，默认 `Buffer.from('ping')`
- `timeout` (number, 可选): 等待响应超时时间 (毫秒)，默认 5000ms

**返回:** `Promise<UDPCommunicationResult>`
```typescript
interface UDPCommunicationResult {
  success: boolean;
  host: string;
  port: number;
  responseTime?: number;
  error?: string;
  responseData?: Buffer;
}
```

**示例:**
```typescript
const result = await udpCommunicate('dns.google', 53, Buffer.from('test'));
if (result.success) {
  console.log(`✅ 收到响应，数据长度：${result.responseData?.length} bytes`);
} else {
  console.log(`❌ 通信失败：${result.error}`);
}
```

---

### `scanPorts(host, startPort?, endPort?, concurrency?, timeout?)`

扫描指定范围内的端口状态。

**参数:**
- `host` (string): 目标主机地址
- `startPort` (number, 可选): 起始端口号，默认 1
- `endPort` (number, 可选): 结束端口号，默认 1024
- `concurrency` (number, 可选): 并发扫描数量，默认 50
- `timeout` (number, 可选): 单个端口超时时间 (毫秒)，默认 1000ms

**返回:** `Promise<PortScanResult[]>`
```typescript
interface PortScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service?: string;
  responseTime?: number;
}
```

**端口状态说明:**
- `open`: 端口开放，可以连接
- `closed`: 端口关闭，拒绝连接
- `filtered`: 端口被过滤，无响应 (可能被防火墙阻止)

**示例:**
```typescript
// 扫描 Web 服务器常用端口
const results = await scanPorts('192.168.1.100', 80, 90, 10, 500);

// 分类统计
const open = results.filter(r => r.status === 'open');
const closed = results.filter(r => r.status === 'closed');
const filtered = results.filter(r => r.status === 'filtered');

console.log(`开放：${open.length}, 关闭：${closed.length}, 过滤：${filtered.length}`);
```

---

### `quickScan(host, timeout?)`

快速扫描 20 个常见服务端口。

**参数:**
- `host` (string): 目标主机地址
- `timeout` (number, 可选): 单个端口超时时间 (毫秒)，默认 1000ms

**返回:** `Promise<PortScanResult[]>`

**扫描的端口:**
21 (FTP), 22 (SSH), 23 (Telnet), 25 (SMTP), 53 (DNS), 80 (HTTP), 110 (POP3), 143 (IMAP), 443 (HTTPS), 993 (IMAPS), 995 (POP3S), 3306 (MySQL), 3389 (RDP), 5432 (PostgreSQL), 6379 (Redis), 8080 (HTTP-Proxy), 27017 (MongoDB)

**示例:**
```typescript
const results = await quickScan('scanme.nmap.org');
const openPorts = results.filter(r => r.status === 'open');
console.log('开放的服务:');
openPorts.forEach(p => console.log(`  ${p.service} (端口 ${p.port})`));
```

---

## 💡 实用场景

### 场景 1: 服务健康检查

```typescript
async function checkServiceHealth(host: string) {
  const services = [
    { name: 'Web', port: 80 },
    { name: 'HTTPS', port: 443 },
    { name: 'SSH', port: 22 }
  ];
  
  const results = await Promise.all(
    services.map(async (s) => {
      const r = await tcpConnect(host, s.port, 2000);
      return { ...s, ...r };
    })
  );
  
  console.log(`${host} 服务状态:`);
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.name} (端口 ${r.port})`);
  });
}
```

### 场景 2: 网络安全审计

```typescript
async function securityAudit(host: string) {
  console.log(`开始扫描 ${host}...`);
  const results = await scanPorts(host, 1, 65535, 100, 500);
  
  const openPorts = results.filter(r => r.status === 'open');
  
  console.log(`\n⚠️  发现 ${openPorts.length} 个开放端口:`);
  openPorts.forEach(p => {
    console.log(`  端口 ${p.port} - ${p.service || 'Unknown'}`);
  });
  
  // 检查高风险端口
  const riskyPorts = [21, 23, 3389, 445, 135, 139];
  const openRisky = openPorts.filter(p => riskyPorts.includes(p.port));
  
  if (openRisky.length > 0) {
    console.log('\n🚨 高风险端口警告:');
    openRisky.forEach(p => {
      console.log(`  ${p.port} (${p.service}) - 建议关闭或限制访问`);
    });
  }
}
```

### 场景 3: 网络延迟测试

```typescript
async function latencyTest(host: string, iterations: number = 5) {
  const latencies: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await tcpConnect(host, 80, 5000);
    if (result.success && result.responseTime) {
      latencies.push(result.responseTime);
    }
  }
  
  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    
    console.log(`${host} 延迟测试 (${latencies.length} 次):`);
    console.log(`  平均：${avg.toFixed(2)}ms`);
    console.log(`  最小：${min}ms`);
    console.log(`  最大：${max}ms`);
  }
}
```

---

## ⚠️ 注意事项

1. **权限要求**: 扫描 1024 以下端口可能需要管理员权限
2. **网络策略**: 某些网络环境可能阻止端口扫描
3. **道德使用**: 仅扫描你有权限测试的系统
4. **并发限制**: 高并发扫描可能触发防火墙或 IDS 警报
5. **超时设置**: 根据网络环境调整超时时间

---

## 🧪 运行测试

```bash
# 直接运行示例
cd /Users/nike/.openclaw/workspace
uv run ts-node src/skills/network-utils-skill.ts

# 或在 TypeScript 项目中导入使用
import { tcpConnect, udpCommunicate, scanPorts } from './src/skills/network-utils-skill';
```

---

## 📝 更新日志

- **v1.0.0** (2026-03-13): 初始版本
  - ✅ TCP 连接测试
  - ✅ UDP 通信测试
  - ✅ 端口扫描功能
  - ✅ 快速扫描常用端口
  - ✅ 完整 TypeScript 类型支持

---

**创建时间:** 2026-03-13  
**维护者:** ACE

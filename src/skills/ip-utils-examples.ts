/**
 * IP 工具技能使用示例
 * 
 * 此文件展示 ip-utils-skill.ts 的各种用法
 */

import {
  // 验证函数
  validateIP,
  validateIPv4,
  validateIPv6,
  isValidIP,
  isValidIPv4,
  isValidIPv6,
  detectIPVersion,
  
  // IPv4 工具
  parseIPv4,
  ipv4ToInt,
  intToIPv4,
  normalizeIPv4,
  
  // IPv6 工具
  parseIPv6,
  ipv6ToInts,
  intsToIPv6,
  normalizeIPv6,
  
  // IP 转换
  ipv4ToIPv6,
  ipv6ToIPv4,
  ipv4ToIPv6Compatible,
  
  // 子网计算
  calculateIPv4Subnet,
  cidrToSubnetMask,
  subnetMaskToCidr,
  isIPInSubnet,
  
  // 其他工具
  normalizeIP,
  compareIP
} from './ip-utils-skill';

// ==================== 1. IP 格式验证 ====================

console.log('=== 1. IP 格式验证 ===\n');

// 验证 IPv4
console.log('验证 IPv4 地址:');
console.log('192.168.1.1:', validateIPv4('192.168.1.1'));
// { isValid: true, version: 'IPv4' }

console.log('256.1.1.1:', validateIPv4('256.1.1.1'));
// { isValid: false, error: '第 1 个八位组必须在 0-255 范围内' }

console.log('192.168.01.1:', validateIPv4('192.168.01.1'));
// { isValid: false, error: '第 3 个八位组不能有前导零' }

// 验证 IPv6
console.log('\n验证 IPv6 地址:');
console.log('2001:0db8:85a3:0000:0000:8a2e:0370:7334:', validateIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334'));
// { isValid: true, version: 'IPv6' }

console.log('2001:db8:85a3::8a2e:370:7334:', validateIPv6('2001:db8:85a3::8a2e:370:7334'));
// { isValid: true, version: 'IPv6' }

console.log('2001::db8::1:', validateIPv6('2001::db8::1'));
// { isValid: false, error: 'IPv6 地址中最多只能有一个双冒号 (::)' }

// 自动检测版本
console.log('\n自动检测 IP 版本:');
console.log('10.0.0.1:', detectIPVersion('10.0.0.1')); // 'IPv4'
console.log('::1:', detectIPVersion('::1')); // 'IPv6'
console.log('invalid:', detectIPVersion('invalid')); // undefined

// 快速验证
console.log('\n快速验证:');
console.log('isValidIP("192.168.1.1"):', isValidIP('192.168.1.1')); // true
console.log('isValidIPv6("192.168.1.1"):', isValidIPv6('192.168.1.1')); // false

// ==================== 2. IPv4 转换 ====================

console.log('\n=== 2. IPv4 转换 ===\n');

// 字符串 ↔ 整数
console.log('IPv4 ↔ 整数转换:');
const ip = '192.168.1.100';
const ipInt = ipv4ToInt(ip);
console.log(`${ip} → ${ipInt}`); // 3232235876
console.log(`${ipInt} → ${intToIPv4(ipInt)}`); // 192.168.1.100

// 解析 IPv4
console.log('\n解析 IPv4 地址:');
const parsed = parseIPv4('10.0.0.1');
console.log(parsed);
// { version: 'IPv4', address: '10.0.0.1', octets: [10, 0, 0, 1] }

// 标准化格式
console.log('\n标准化 IPv4:');
console.log(normalizeIPv4('010.000.001.001')); // '10.0.1.1'

// ==================== 3. IPv6 转换 ====================

console.log('\n=== 3. IPv6 转换 ===\n');

// 解析 IPv6
console.log('解析 IPv6 地址:');
const ipv6Parsed = parseIPv6('2001:db8::1');
console.log('压缩格式:', ipv6Parsed.compressed); // '2001:db8::1'
console.log('扩展格式:', ipv6Parsed.expanded); // '2001:0db8:0000:0000:0000:0000:0000:0001'
console.log('段数组:', ipv6Parsed.segments); // [8193, 3512, 0, 0, 0, 0, 0, 1]

// IPv6 ↔ 整数数组
console.log('\nIPv6 ↔ 整数数组:');
const [high, low] = ipv6ToInts('2001:db8::1');
console.log(`2001:db8::1 → [${high}, ${low}]`);
console.log(`[${high}, ${low}] → ${intsToIPv6(high, low)}`); // '2001:db8::1'

// 标准化格式
console.log('\n标准化 IPv6:');
console.log(normalizeIPv6('2001:0DB8:0000:0000:0000:0000:0000:0001')); // '2001:db8::1'

// ==================== 4. IPv4 ↔ IPv6 转换 ====================

console.log('\n=== 4. IPv4 ↔ IPv6 转换 ===\n');

// IPv4 映射到 IPv6
console.log('IPv4 映射到 IPv6:');
const mappedIPv6 = ipv4ToIPv6('192.168.1.1');
console.log(`192.168.1.1 → ${mappedIPv6}`); // '::ffff:c0a8:101'

// IPv6 转回 IPv4
console.log('\nIPv6 转回 IPv4:');
const backToIPv4 = ipv6ToIPv4(mappedIPv6);
console.log(`${mappedIPv6} → ${backToIPv4}`); // '192.168.1.1'

// IPv4 兼容的 IPv6
console.log('\nIPv4 兼容的 IPv6:');
console.log(`192.168.1.1 → ${ipv4ToIPv6Compatible('192.168.1.1')}`); // '::c0a8:101'

// ==================== 5. 子网计算 ====================

console.log('\n=== 5. 子网计算 ===\n');

// 计算子网信息
console.log('计算子网信息 (192.168.1.100/24):');
const subnetInfo = calculateIPv4Subnet('192.168.1.100/24');
console.log('网络地址:', subnetInfo.networkAddress); // '192.168.1.0'
console.log('广播地址:', subnetInfo.broadcastAddress); // '192.168.1.255'
console.log('子网掩码:', subnetInfo.subnetMask); // '255.255.255.0'
console.log('CIDR:', subnetInfo.cidr); // 24
console.log('总主机数:', subnetInfo.totalHosts); // 256
console.log('可用主机数:', subnetInfo.usableHosts); // 254
console.log('第一个可用 IP:', subnetInfo.firstUsableIP); // '192.168.1.1'
console.log('最后一个可用 IP:', subnetInfo.lastUsableIP); // '192.168.1.254'
console.log('IP 范围:', subnetInfo.ipRange); // '192.168.1.1 - 192.168.1.254'

// CIDR ↔ 子网掩码
console.log('\nCIDR ↔ 子网掩码转换:');
console.log('/26 →', cidrToSubnetMask(26)); // '255.255.255.192'
console.log('255.255.255.192 →', subnetMaskToCidr('255.255.255.192')); // 26

// 检查 IP 是否在子网内
console.log('\n检查 IP 是否在子网内:');
console.log('192.168.1.50 in 192.168.1.0/24:', isIPInSubnet('192.168.1.50', '192.168.1.0/24')); // true
console.log('192.168.2.50 in 192.168.1.0/24:', isIPInSubnet('192.168.2.50', '192.168.1.0/24')); // false

// 获取子网内所有 IP (小 subnet)
console.log('\n获取子网内所有 IP (192.168.1.0/30):');
const ips = getSubnetIPs('192.168.1.0/30');
console.log(ips); // ['192.168.1.0', '192.168.1.1', '192.168.1.2', '192.168.1.3']

// ==================== 6. 其他工具 ====================

console.log('\n=== 6. 其他工具 ===\n');

// 标准化 IP
console.log('标准化 IP:');
console.log(normalizeIP('010.000.001.001')); // '10.0.1.1'
console.log(normalizeIP('2001:0DB8::0001')); // '2001:db8::1'

// 比较 IP
console.log('\n比较 IP:');
console.log('10.0.0.1 vs 10.0.0.2:', compareIP('10.0.0.1', '10.0.0.2')); // -1
console.log('10.0.0.2 vs 10.0.0.1:', compareIP('10.0.0.2', '10.0.0.1')); // 1
console.log('10.0.0.1 vs 10.0.0.1:', compareIP('10.0.0.1', '10.0.0.1')); // 0

console.log('::1 vs ::2:', compareIP('::1', '::2')); // -1
console.log('10.0.0.1 vs ::1:', compareIP('10.0.0.1', '::1')); // -1 (IPv4 < IPv6)

// ==================== 7. 实际应用场景 ====================

console.log('\n=== 7. 实际应用场景 ===\n');

// 场景 1: 验证用户输入的 IP
console.log('场景 1: 验证用户输入');
function validateUserInput(ip: string): string {
  const result = validateIP(ip);
  if (!result.isValid) {
    return `❌ 无效的 IP 地址：${result.error}`;
  }
  return `✅ 有效的 ${result.version} 地址：${normalizeIP(ip)}`;
}

console.log(validateUserInput('192.168.1.1')); // ✅ 有效的 IPv4 地址：192.168.1.1
console.log(validateUserInput('2001:db8::1')); // ✅ 有效的 IPv6 地址：2001:db8::1
console.log(validateUserInput('256.256.256.256')); // ❌ 无效的 IP 地址...

// 场景 2: 检查 IP 是否在允许的网段内
console.log('\n场景 2: 访问控制');
const allowedSubnets = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
const testIPs = ['10.1.2.3', '172.16.5.10', '192.168.1.100', '8.8.8.8'];

for (const ip of testIPs) {
  const isAllowed = allowedSubnets.some(subnet => isIPInSubnet(ip, subnet));
  console.log(`${ip}: ${isAllowed ? '✅ 允许' : '❌ 拒绝'}`);
}

// 场景 3: 计算网络配置
console.log('\n场景 3: 网络配置计算');
function printNetworkConfig(cidr: string) {
  const info = calculateIPv4Subnet(cidr);
  console.log(`\n网络：${cidr}`);
  console.log(`  网络地址：${info.networkAddress}`);
  console.log(`  子网掩码：${info.subnetMask}`);
  console.log(`  可用 IP: ${info.firstUsableIP} ~ ${info.lastUsableIP}`);
  console.log(`  可用主机数：${info.usableHosts}`);
}

printNetworkConfig('192.168.1.0/24');
printNetworkConfig('10.0.0.0/16');

// 场景 4: IP 排序
console.log('\n场景 4: IP 排序');
const unsortedIPs = ['192.168.1.10', '192.168.1.2', '192.168.1.100', '10.0.0.1'];
const sortedIPs = [...unsortedIPs].sort(compareIP);
console.log('排序前:', unsortedIPs);
console.log('排序后:', sortedIPs);

// ==================== 8. 错误处理 ====================

console.log('\n=== 8. 错误处理 ===\n');

try {
  parseIPv4('256.1.1.1');
} catch (error) {
  console.log('捕获错误:', (error as Error).message);
}

try {
  ipv6ToIPv4('2001:db8::1'); // 不是 IPv4 映射地址
} catch (error) {
  console.log('捕获错误:', (error as Error).message);
}

try {
  getSubnetIPs('10.0.0.0/8'); // 子网太大
} catch (error) {
  console.log('捕获错误:', (error as Error).message);
}

console.log('\n=== 示例完成 ===');

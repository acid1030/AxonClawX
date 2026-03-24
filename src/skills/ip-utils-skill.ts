/**
 * IP 地址处理工具技能
 * 
 * 功能:
 * 1. IP 格式验证 (IPv4/IPv6)
 * 2. IP 转换 (IPv4↔IPv6)
 * 3. 子网计算 (CIDR/掩码/网络地址/广播地址)
 * 
 * @module skills/ip-utils
 */

// ==================== 类型定义 ====================

/**
 * IP 版本
 */
export type IPVersion = 'IPv4' | 'IPv6';

/**
 * IPv4 地址对象
 */
export interface IPv4Address {
  version: 'IPv4';
  address: string;
  octets: number[];
}

/**
 * IPv6 地址对象
 */
export interface IPv6Address {
  version: 'IPv6';
  address: string;
  compressed: string;
  expanded: string;
  segments: number[];
}

/**
 * IP 地址联合类型
 */
export type IPAddress = IPv4Address | IPv6Address;

/**
 * 子网信息
 */
export interface SubnetInfo {
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  cidr: number;
  totalHosts: number;
  usableHosts: number;
  firstUsableIP: string;
  lastUsableIP: string;
  ipRange: string;
}

/**
 * IP 验证结果
 */
export interface IPValidationResult {
  isValid: boolean;
  version?: IPVersion;
  error?: string;
}

// ==================== IPv4 验证 ====================

/**
 * 验证 IPv4 地址格式
 * @param ip - IP 地址字符串
 * @returns 验证结果
 */
export function validateIPv4(ip: string): IPValidationResult {
  if (!ip || typeof ip !== 'string') {
    return { isValid: false, error: 'IP 地址不能为空' };
  }

  const trimmed = ip.trim();
  const octets = trimmed.split('.');

  if (octets.length !== 4) {
    return { isValid: false, error: 'IPv4 地址必须包含 4 个八位组' };
  }

  for (let i = 0; i < octets.length; i++) {
    const octet = octets[i];

    // 检查是否为空
    if (!octet) {
      return { isValid: false, error: `第 ${i + 1} 个八位组不能为空` };
    }

    // 检查是否包含前导零 (除了 0 本身)
    if (octet.length > 1 && octet[0] === '0') {
      return { isValid: false, error: `第 ${i + 1} 个八位组不能有前导零` };
    }

    // 检查是否为数字
    if (!/^\d+$/.test(octet)) {
      return { isValid: false, error: `第 ${i + 1} 个八位组必须是数字` };
    }

    const num = parseInt(octet, 10);

    // 检查范围
    if (num < 0 || num > 255) {
      return { isValid: false, error: `第 ${i + 1} 个八位组必须在 0-255 范围内` };
    }
  }

  return { isValid: true, version: 'IPv4' };
}

/**
 * 验证 IPv4 八位组数组
 * @param octets - 八位组数组
 * @returns 验证结果
 */
export function validateIPv4Octets(octets: number[]): IPValidationResult {
  if (!Array.isArray(octets) || octets.length !== 4) {
    return { isValid: false, error: '必须提供 4 个八位组' };
  }

  for (let i = 0; i < octets.length; i++) {
    const octet = octets[i];

    if (typeof octet !== 'number' || !Number.isInteger(octet)) {
      return { isValid: false, error: `第 ${i + 1} 个八位组必须是整数` };
    }

    if (octet < 0 || octet > 255) {
      return { isValid: false, error: `第 ${i + 1} 个八位组必须在 0-255 范围内` };
    }
  }

  return { isValid: true, version: 'IPv4' };
}

// ==================== IPv6 验证 ====================

/**
 * 验证 IPv6 地址格式
 * @param ip - IP 地址字符串
 * @returns 验证结果
 */
export function validateIPv6(ip: string): IPValidationResult {
  if (!ip || typeof ip !== 'string') {
    return { isValid: false, error: 'IP 地址不能为空' };
  }

  const trimmed = ip.trim().toLowerCase();

  // 检查是否包含双冒号 (压缩格式)
  const doubleColonCount = (trimmed.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return { isValid: false, error: 'IPv6 地址中最多只能有一个双冒号 (::)' };
  }

  // 处理压缩格式
  let segments: string[];
  if (trimmed.includes('::')) {
    const parts = trimmed.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    
    // 验证每个段
    for (const segment of [...left, ...right]) {
      if (segment && !/^[0-9a-f]{1,4}$/.test(segment)) {
        return { isValid: false, error: `无效的 IPv6 段：${segment}` };
      }
    }
    
    // 计算总段数 (压缩部分会自动填充)
    const totalSegments = left.length + right.length;
    if (totalSegments > 7) {
      return { isValid: false, error: 'IPv6 地址段数过多' };
    }
    
    segments = [...left, ...right];
  } else {
    segments = trimmed.split(':');
    
    if (segments.length !== 8) {
      return { isValid: false, error: 'IPv6 地址必须包含 8 个段 (或使用 :: 压缩)' };
    }
    
    for (const segment of segments) {
      if (!/^[0-9a-f]{1,4}$/.test(segment)) {
        return { isValid: false, error: `无效的 IPv6 段：${segment}` };
      }
    }
  }

  return { isValid: true, version: 'IPv6' };
}

/**
 * 验证 IPv6 段数组
 * @param segments - 段数组 (16 位整数)
 * @returns 验证结果
 */
export function validateIPv6Segments(segments: number[]): IPValidationResult {
  if (!Array.isArray(segments) || segments.length !== 8) {
    return { isValid: false, error: '必须提供 8 个 IPv6 段' };
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (typeof segment !== 'number' || !Number.isInteger(segment)) {
      return { isValid: false, error: `第 ${i + 1} 个段必须是整数` };
    }

    if (segment < 0 || segment > 65535) {
      return { isValid: false, error: `第 ${i + 1} 个段必须在 0-65535 范围内` };
    }
  }

  return { isValid: true, version: 'IPv6' };
}

// ==================== 通用 IP 验证 ====================

/**
 * 验证 IP 地址 (自动检测版本)
 * @param ip - IP 地址字符串
 * @returns 验证结果
 */
export function validateIP(ip: string): IPValidationResult {
  if (!ip || typeof ip !== 'string') {
    return { isValid: false, error: 'IP 地址不能为空' };
  }

  // 先尝试 IPv4
  const ipv4Result = validateIPv4(ip);
  if (ipv4Result.isValid) {
    return ipv4Result;
  }

  // 再尝试 IPv6
  const ipv6Result = validateIPv6(ip);
  if (ipv6Result.isValid) {
    return ipv6Result;
  }

  return {
    isValid: false,
    error: 'IP 地址格式无效 (既不是有效的 IPv4 也不是有效的 IPv6)'
  };
}

/**
 * 检测 IP 地址版本
 * @param ip - IP 地址字符串
 * @returns IP 版本或 undefined
 */
export function detectIPVersion(ip: string): IPVersion | undefined {
  const result = validateIP(ip);
  return result.isValid ? result.version : undefined;
}

// ==================== IPv4 工具函数 ====================

/**
 * 将 IPv4 字符串转换为对象
 * @param ip - IPv4 地址字符串
 * @returns IPv4 地址对象
 */
export function parseIPv4(ip: string): IPv4Address {
  const result = validateIPv4(ip);
  if (!result.isValid) {
    throw new Error(`无效的 IPv4 地址：${result.error}`);
  }

  const octets = ip.trim().split('.').map(o => parseInt(o, 10));

  return {
    version: 'IPv4',
    address: ip.trim(),
    octets
  };
}

/**
 * 将八位组数组转换为 IPv4 字符串
 * @param octets - 八位组数组
 * @returns IPv4 地址字符串
 */
export function octetsToIPv4(octets: number[]): string {
  const result = validateIPv4Octets(octets);
  if (!result.isValid) {
    throw new Error(`无效的八位组：${result.error}`);
  }

  return octets.join('.');
}

/**
 * 将 IPv4 地址转换为整数
 * @param ip - IPv4 地址字符串或对象
 * @returns 32 位整数
 */
export function ipv4ToInt(ip: string | IPv4Address): number {
  const octets = typeof ip === 'string' ? parseIPv4(ip).octets : ip.octets;

  return (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3];
}

/**
 * 将整数转换为 IPv4 地址
 * @param num - 32 位整数
 * @returns IPv4 地址字符串
 */
export function intToIPv4(num: number): string {
  if (num < 0 || num > 0xFFFFFFFF) {
    throw new Error('整数必须在 0 到 4294967295 范围内');
  }

  const octets = [
    (num >>> 24) & 0xFF,
    (num >>> 16) & 0xFF,
    (num >>> 8) & 0xFF,
    num & 0xFF
  ];

  return octetsToIPv4(octets);
}

// ==================== IPv6 工具函数 ====================

/**
 * 将 IPv6 字符串转换为对象
 * @param ip - IPv6 地址字符串
 * @returns IPv6 地址对象
 */
export function parseIPv6(ip: string): IPv6Address {
  const result = validateIPv6(ip);
  if (!result.isValid) {
    throw new Error(`无效的 IPv6 地址：${result.error}`);
  }

  const trimmed = ip.trim().toLowerCase();
  let segments: number[];

  // 处理压缩格式
  if (trimmed.includes('::')) {
    const parts = trimmed.split('::');
    const left = parts[0] ? parts[0].split(':').map(s => parseInt(s || '0', 16)) : [];
    const right = parts[1] ? parts[1].split(':').map(s => parseInt(s || '0', 16)) : [];
    
    // 填充零
    const missing = 8 - left.length - right.length;
    const zeros = new Array(missing).fill(0);
    
    segments = [...left, ...zeros, ...right];
  } else {
    segments = trimmed.split(':').map(s => parseInt(s, 16));
  }

  // 生成扩展格式
  const expanded = segments.map(s => s.toString(16).padStart(4, '0')).join(':');

  // 生成压缩格式 (最长连续零压缩)
  let compressed = expanded;
  const zeroRuns: [number, number][] = [];
  let start = -1;
  
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === 0) {
      if (start === -1) start = i;
    } else {
      if (start !== -1 && i - start > 1) {
        zeroRuns.push([start, i - start]);
      }
      start = -1;
    }
  }
  if (start !== -1 && segments.length - start > 1) {
    zeroRuns.push([start, segments.length - start]);
  }

  if (zeroRuns.length > 0) {
    // 找到最长的连续零段
    zeroRuns.sort((a, b) => b[1] - a[1]);
    const [runStart, runLength] = zeroRuns[0];
    
    const before = segments.slice(0, runStart).map(s => s.toString(16)).join(':');
    const after = segments.slice(runStart + runLength).map(s => s.toString(16)).join(':');
    
    compressed = before + '::' + after;
    if (runStart === 0) compressed = '::' + after;
    if (runStart + runLength === 8) compressed = before + '::';
  }

  return {
    version: 'IPv6',
    address: ip.trim(),
    compressed,
    expanded,
    segments
  };
}

/**
 * 将段数组转换为 IPv6 字符串
 * @param segments - 段数组
 * @param compressed - 是否使用压缩格式，默认 true
 * @returns IPv6 地址字符串
 */
export function segmentsToIPv6(segments: number[], compressed: boolean = true): string {
  const result = validateIPv6Segments(segments);
  if (!result.isValid) {
    throw new Error(`无效的 IPv6 段：${result.error}`);
  }

  if (compressed) {
    return parseIPv6(segments.map(s => s.toString(16)).join(':')).compressed;
  } else {
    return segments.map(s => s.toString(16).padStart(4, '0')).join(':');
  }
}

/**
 * 将 IPv6 地址转换为整数数组 (2 个 64 位整数)
 * @param ip - IPv6 地址字符串或对象
 * @returns [高位 64 位，低位 64 位]
 */
export function ipv6ToInts(ip: string | IPv6Address): [bigint, bigint] {
  const segments = typeof ip === 'string' ? parseIPv6(ip).segments : ip.segments;

  let high = BigInt(0);
  let low = BigInt(0);

  for (let i = 0; i < 4; i++) {
    high = (high << BigInt(16)) | BigInt(segments[i]);
  }
  for (let i = 4; i < 8; i++) {
    low = (low << BigInt(16)) | BigInt(segments[i]);
  }

  return [high, low];
}

/**
 * 将整数数组转换为 IPv6 地址
 * @param high - 高位 64 位
 * @param low - 低位 64 位
 * @param compressed - 是否使用压缩格式，默认 true
 * @returns IPv6 地址字符串
 */
export function intsToIPv6(high: bigint, low: bigint, compressed: boolean = true): string {
  const segments: number[] = [];

  for (let i = 3; i >= 0; i--) {
    segments.unshift(Number((high >> BigInt(i * 16)) & BigInt(0xFFFF)));
  }
  for (let i = 3; i >= 0; i--) {
    segments.unshift(Number((low >> BigInt(i * 16)) & BigInt(0xFFFF)));
  }

  return segmentsToIPv6(segments, compressed);
}

// ==================== IP 转换 ====================

/**
 * IPv4 映射到 IPv6 (::ffff:x.x.x.x)
 * @param ipv4 - IPv4 地址
 * @returns IPv6 地址
 */
export function ipv4ToIPv6(ipv4: string): string {
  const ipv4Obj = parseIPv4(ipv4);
  const ipv4Int = ipv4ToInt(ipv4Obj);

  // IPv4 映射地址格式：::ffff:x.x.x.x
  const high = BigInt(0);
  const low = (BigInt(0xFFFF) << BigInt(32)) | BigInt(ipv4Int >>> 0);

  return intsToIPv6(high, low, true);
}

/**
 * IPv6 转换到 IPv4 (仅适用于 IPv4 映射地址)
 * @param ipv6 - IPv6 地址
 * @returns IPv4 地址
 */
export function ipv6ToIPv4(ipv6: string): string {
  const ipv6Obj = parseIPv6(ipv6);
  const [high, low] = ipv6ToInts(ipv6Obj);

  // 检查是否为 IPv4 映射地址 (::ffff:x.x.x.x)
  if (high !== BigInt(0) || (low >> BigInt(32)) !== BigInt(0xFFFF)) {
    throw new Error('仅支持 IPv4 映射地址 (::ffff:x.x.x.x) 转换为 IPv4');
  }

  const ipv4Int = Number(low & BigInt(0xFFFFFFFF));
  return intToIPv4(ipv4Int);
}

/**
 * IPv4 转换为 IPv4 兼容的 IPv6 (::x.x.x.x)
 * @param ipv4 - IPv4 地址
 * @returns IPv6 地址
 */
export function ipv4ToIPv6Compatible(ipv4: string): string {
  const ipv4Obj = parseIPv4(ipv4);
  const ipv4Int = ipv4ToInt(ipv4Obj);

  const high = BigInt(0);
  const low = BigInt(ipv4Int >>> 0);

  return intsToIPv6(high, low, true);
}

// ==================== 子网计算 ====================

/**
 * CIDR 前缀长度转换为子网掩码 (IPv4)
 * @param cidr - CIDR 前缀长度 (0-32)
 * @returns 子网掩码字符串
 */
export function cidrToSubnetMask(cidr: number): string {
  if (cidr < 0 || cidr > 32) {
    throw new Error('CIDR 前缀长度必须在 0-32 范围内');
  }

  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  return intToIPv4(mask);
}

/**
 * 子网掩码转换为 CIDR 前缀长度 (IPv4)
 * @param subnetMask - 子网掩码字符串
 * @returns CIDR 前缀长度
 */
export function subnetMaskToCidr(subnetMask: string): number {
  const maskInt = ipv4ToInt(parseIPv4(subnetMask));
  
  // 验证掩码是否有效 (必须是连续的 1)
  const inverted = (~maskInt) >>> 0;
  if ((inverted & (inverted + 1)) !== 0) {
    throw new Error('无效的子网掩码：必须是连续的 1');
  }

  let cidr = 0;
  let temp = maskInt;
  while (temp) {
    cidr += temp & 1;
    temp >>>= 1;
  }

  return cidr;
}

/**
 * 计算 IPv4 子网信息
 * @param ip - IP 地址或 CIDR 表示法 (如 "192.168.1.100/24")
 * @returns 子网信息对象
 */
export function calculateIPv4Subnet(ip: string): SubnetInfo {
  let ipAddress: string;
  let cidr: number;

  // 解析 CIDR 表示法
  if (ip.includes('/')) {
    const [addr, prefix] = ip.split('/');
    ipAddress = addr.trim();
    cidr = parseInt(prefix, 10);
    
    if (isNaN(cidr) || cidr < 0 || cidr > 32) {
      throw new Error('CIDR 前缀长度必须在 0-32 范围内');
    }
  } else {
    ipAddress = ip.trim();
    cidr = 24; // 默认 /24
  }

  validateIPv4(ipAddress);

  const ipInt = ipv4ToInt(ipAddress);
  const maskInt = ipv4ToInt(cidrToSubnetMask(cidr));
  
  // 网络地址
  const networkInt = ipInt & maskInt;
  
  // 广播地址
  const hostMask = (~maskInt) >>> 0;
  const broadcastInt = networkInt | hostMask;
  
  // 主机数量
  const hostBits = 32 - cidr;
  const totalHosts = Math.pow(2, hostBits);
  const usableHosts = cidr >= 31 ? 0 : totalHosts - 2;

  // 第一个可用 IP
  const firstUsableInt = cidr >= 31 ? networkInt : networkInt + 1;
  
  // 最后一个可用 IP
  const lastUsableInt = cidr >= 31 ? broadcastInt : broadcastInt - 1;

  return {
    networkAddress: intToIPv4(networkInt),
    broadcastAddress: intToIPv4(broadcastInt),
    subnetMask: cidrToSubnetMask(cidr),
    cidr,
    totalHosts,
    usableHosts,
    firstUsableIP: intToIPv4(firstUsableInt),
    lastUsableIP: intToIPv4(lastUsableInt),
    ipRange: `${intToIPv4(firstUsableInt)} - ${intToIPv4(lastUsableInt)}`
  };
}

/**
 * 检查 IP 是否在子网内
 * @param ip - IP 地址
 * @param subnet - 子网 CIDR 表示法
 * @returns 是否在子网内
 */
export function isIPInSubnet(ip: string, subnet: string): boolean {
  const ipValidation = validateIP(ip);
  const subnetValidation = validateIP(subnet.split('/')[0]);

  // 版本必须一致
  if (ipValidation.version !== subnetValidation.version) {
    return false;
  }

  if (ipValidation.version === 'IPv4') {
    const subnetInfo = calculateIPv4Subnet(subnet);
    const ipInt = ipv4ToInt(ip);
    const networkInt = ipv4ToInt(subnetInfo.networkAddress);
    const broadcastInt = ipv4ToInt(subnetInfo.broadcastAddress);

    return ipInt >= networkInt && ipInt <= broadcastInt;
  } else {
    // IPv6 子网检查
    const [ipHigh, ipLow] = ipv6ToInts(parseIPv6(ip));
    const [subnetHigh, subnetLow] = ipv6ToInts(parseIPv6(subnet.split('/')[0]));
    const cidr = parseInt(subnet.split('/')[1], 10);

    if (cidr <= 64) {
      const shift = BigInt(64 - cidr);
      const mask = shift === BigInt(64) ? BigInt(0) : (~BigInt(0) << shift);
      return (ipHigh & mask) === (subnetHigh & mask);
    } else {
      const shift = BigInt(128 - cidr);
      const highMask = ~BigInt(0);
      const lowShift = BigInt(64 - (128 - cidr));
      const lowMask = lowShift <= BigInt(0) ? ~BigInt(0) : (~BigInt(0) << lowShift);
      
      return (ipHigh === subnetHigh) && ((ipLow & lowMask) === (subnetLow & lowMask));
    }
  }
}

/**
 * 获取子网内的所有 IP 地址 (仅适用于小 subnet，避免内存溢出)
 * @param subnet - 子网 CIDR 表示法
 * @param limit - 最大返回数量 (默认 1000)
 * @returns IP 地址数组
 */
export function getSubnetIPs(subnet: string, limit: number = 1000): string[] {
  const subnetInfo = calculateIPv4Subnet(subnet);
  
  if (subnetInfo.cidr > 22) {
    throw new Error('子网太大，无法列出所有 IP (请使用 /22 或更小的子网)');
  }

  const startInt = ipv4ToInt(subnetInfo.networkAddress);
  const endInt = ipv4ToInt(subnetInfo.broadcastAddress);
  const total = endInt - startInt + 1;

  if (total > limit) {
    throw new Error(`子网包含 ${total} 个 IP，超过限制 ${limit}`);
  }

  const ips: string[] = [];
  for (let i = startInt; i <= endInt; i++) {
    ips.push(intToIPv4(i));
  }

  return ips;
}

// ==================== 便捷函数 ====================

/**
 * 快速验证 IP 地址
 * @param ip - IP 地址
 * @returns 是否有效
 */
export function isValidIP(ip: string): boolean {
  return validateIP(ip).isValid;
}

/**
 * 快速验证 IPv4 地址
 * @param ip - IPv4 地址
 * @returns 是否有效
 */
export function isValidIPv4(ip: string): boolean {
  return validateIPv4(ip).isValid;
}

/**
 * 快速验证 IPv6 地址
 * @param ip - IPv6 地址
 * @returns 是否有效
 */
export function isValidIPv6(ip: string): boolean {
  return validateIPv6(ip).isValid;
}

/**
 * 格式化 IPv4 地址 (移除前导零等)
 * @param ip - IPv4 地址
 * @returns 标准化格式
 */
export function normalizeIPv4(ip: string): string {
  const parsed = parseIPv4(ip);
  return parsed.octets.join('.');
}

/**
 * 格式化 IPv6 地址 (压缩格式)
 * @param ip - IPv6 地址
 * @returns 压缩格式
 */
export function normalizeIPv6(ip: string): string {
  const parsed = parseIPv6(ip);
  return parsed.compressed;
}

/**
 * 获取 IP 地址的标准化格式
 * @param ip - IP 地址
 * @returns 标准化 IP
 */
export function normalizeIP(ip: string): string {
  const version = detectIPVersion(ip);
  if (version === 'IPv4') {
    return normalizeIPv4(ip);
  } else if (version === 'IPv6') {
    return normalizeIPv6(ip);
  } else {
    throw new Error('无效的 IP 地址');
  }
}

/**
 * 比较两个 IP 地址
 * @param ip1 - 第一个 IP
 * @param ip2 - 第二个 IP
 * @returns -1 (ip1 < ip2), 0 (相等), 1 (ip1 > ip2)
 */
export function compareIP(ip1: string, ip2: string): number {
  const v1 = detectIPVersion(ip1);
  const v2 = detectIPVersion(ip2);

  // 版本不同
  if (v1 !== v2) {
    if (v1 === 'IPv4') return -1;
    if (v1 === 'IPv6') return 1;
  }

  if (v1 === 'IPv4') {
    const int1 = ipv4ToInt(ip1);
    const int2 = ipv4ToInt(ip2);
    return int1 === int2 ? 0 : int1 < int2 ? -1 : 1;
  } else {
    const [high1, low1] = ipv6ToInts(ip1);
    const [high2, low2] = ipv6ToInts(ip2);

    if (high1 !== high2) {
      return high1 < high2 ? -1 : 1;
    }
    if (low1 !== low2) {
      return low1 < low2 ? -1 : 1;
    }
    return 0;
  }
}

/**
 * 网络工具技能 - ACE
 * 
 * 提供常用网络操作功能：
 * 1. TCP 连接
 * 2. UDP 通信
 * 3. 端口扫描
 */

import * as net from 'net';
import * as dgram from 'dgram';

/**
 * TCP 连接结果
 */
export interface TCPConnectionResult {
  success: boolean;
  host: string;
  port: number;
  responseTime?: number;
  error?: string;
  data?: string;
}

/**
 * UDP 通信结果
 */
export interface UDPCommunicationResult {
  success: boolean;
  host: string;
  port: number;
  responseTime?: number;
  error?: string;
  responseData?: Buffer;
}

/**
 * 端口扫描结果
 */
export interface PortScanResult {
  port: number;
  status: 'open' | 'closed' | 'filtered';
  service?: string;
  responseTime?: number;
}

/**
 * 常见端口服务映射
 */
const COMMON_PORTS: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  993: 'IMAPS',
  995: 'POP3S',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  6379: 'Redis',
  8080: 'HTTP-Proxy',
  27017: 'MongoDB'
};

/**
 * TCP 连接测试
 * 尝试连接到指定的 TCP 端口
 * 
 * @param host - 目标主机地址
 * @param port - 目标端口号
 * @param timeout - 连接超时时间 (毫秒)，默认 5000ms
 * @returns 连接结果
 * 
 * @example
 * tcpConnect('127.0.0.1', 80) // 测试本地 HTTP 服务
 * tcpConnect('example.com', 443, 3000) // 测试 HTTPS 服务，3 秒超时
 */
export function tcpConnect(host: string, port: number, timeout: number = 5000): Promise<TCPConnectionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      client.destroy();
    };

    client.setTimeout(timeout);

    client.on('connect', () => {
      if (!resolved) {
        resolved = true;
        const responseTime = Date.now() - startTime;
        cleanup();
        resolve({
          success: true,
          host,
          port,
          responseTime,
          data: 'Connection established successfully'
        });
      }
    });

    client.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          host,
          port,
          error: `Connection timeout after ${timeout}ms`
        });
      }
    });

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          host,
          port,
          error: err.message
        });
      }
    });

    client.on('close', () => {
      if (!resolved) {
        resolved = true;
        resolve({
          success: false,
          host,
          port,
          error: 'Connection closed'
        });
      }
    });

    client.connect(port, host);
  });
}

/**
 * UDP 通信测试
 * 发送 UDP 数据包并等待响应
 * 
 * @param host - 目标主机地址
 * @param port - 目标端口号
 * @param message - 要发送的消息
 * @param timeout - 等待响应超时时间 (毫秒)，默认 5000ms
 * @returns 通信结果
 * 
 * @example
 * udpCommunicate('127.0.0.1', 53, Buffer.from('test')) // 测试 UDP 服务
 * udpCommunicate('dns.google', 53, dnsQuery, 3000) // DNS 查询
 */
export function udpCommunicate(
  host: string,
  port: number,
  message: Buffer | string = Buffer.from('ping'),
  timeout: number = 5000
): Promise<UDPCommunicationResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = dgram.createSocket('udp4');
    let resolved = false;
    const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);

    const cleanup = () => {
      client.removeAllListeners();
      client.close();
    };

    client.on('message', (data, rinfo) => {
      if (!resolved && rinfo.address === host && rinfo.port === port) {
        resolved = true;
        const responseTime = Date.now() - startTime;
        cleanup();
        resolve({
          success: true,
          host,
          port,
          responseTime,
          responseData: data
        });
      }
    });

    client.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          host,
          port,
          error: err.message
        });
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          host,
          port,
          error: `UDP timeout after ${timeout}ms`
        });
      }
    }, timeout);

    client.send(messageBuffer, 0, messageBuffer.length, port, host, (err) => {
      if (err && !resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          host,
          port,
          error: err.message
        });
      }
    });
  });
}

/**
 * 端口扫描
 * 扫描指定范围内的端口状态
 * 
 * @param host - 目标主机地址
 * @param startPort - 起始端口号
 * @param endPort - 结束端口号
 * @param concurrency - 并发扫描数量，默认 50
 * @param timeout - 单个端口超时时间 (毫秒)，默认 1000ms
 * @returns 端口扫描结果数组
 * 
 * @example
 * scanPorts('127.0.0.1', 1, 1024) // 扫描常用端口
 * scanPorts('192.168.1.1', 80, 90) // 扫描特定端口范围
 * scanPorts('example.com', 20, 25, 10, 2000) // 并发 10 个，2 秒超时
 */
export async function scanPorts(
  host: string,
  startPort: number = 1,
  endPort: number = 1024,
  concurrency: number = 50,
  timeout: number = 1000
): Promise<PortScanResult[]> {
  const results: PortScanResult[] = [];
  const queue: number[] = [];
  
  // 创建端口队列
  for (let port = startPort; port <= endPort; port++) {
    queue.push(port);
  }

  // 并发扫描函数
  const scanBatch = async (ports: number[]) => {
    const promises = ports.map(async (port) => {
      const startTime = Date.now();
      try {
        const connected = await tcpConnectWithTimeout(host, port, timeout);
        const responseTime = Date.now() - startTime;
        return {
          port,
          status: connected ? 'open' as const : 'closed' as const,
          service: COMMON_PORTS[port],
          responseTime
        };
      } catch {
        return {
          port,
          status: 'filtered' as const,
          service: COMMON_PORTS[port]
        };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  };

  // 分批处理
  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    await scanBatch(batch);
  }

  // 按端口号排序
  results.sort((a, b) => a.port - b.port);
  
  return results;
}

/**
 * TCP 连接辅助函数 (带超时)
 */
function tcpConnectWithTimeout(host: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      client.destroy();
    };

    client.setTimeout(timeout);

    client.on('connect', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    });

    client.on('timeout', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    });

    client.on('error', () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    });

    client.on('close', () => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    });

    client.connect(port, host);
  });
}

/**
 * 快速扫描常用端口
 * 扫描最常见的 20 个服务端口
 * 
 * @param host - 目标主机地址
 * @param timeout - 单个端口超时时间 (毫秒)，默认 1000ms
 * @returns 端口扫描结果数组
 * 
 * @example
 * quickScan('127.0.0.1') // 快速扫描常用端口
 * quickScan('192.168.1.1', 500) // 500ms 超时
 */
export async function quickScan(host: string, timeout: number = 1000): Promise<PortScanResult[]> {
  const commonPortList = Object.keys(COMMON_PORTS).map(Number);
  return scanPorts(host, commonPortList[0], commonPortList[commonPortList.length - 1], 20, timeout);
}

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 网络工具技能 - 使用示例 ===\n');
  
  (async () => {
    // 1. TCP 连接示例
    console.log('1️⃣ TCP 连接测试:');
    console.log('   测试本地 HTTP 服务 (127.0.0.1:80)...');
    const tcpResult = await tcpConnect('127.0.0.1', 80, 2000);
    console.log(`   结果：${tcpResult.success ? '✅ 成功' : '❌ 失败'}`);
    if (tcpResult.success) {
      console.log(`   响应时间：${tcpResult.responseTime}ms`);
    } else {
      console.log(`   错误：${tcpResult.error}`);
    }
    
    console.log('\n   测试本地 HTTPS 服务 (127.0.0.1:443)...');
    const tcpResult2 = await tcpConnect('127.0.0.1', 443, 2000);
    console.log(`   结果：${tcpResult2.success ? '✅ 成功' : '❌ 失败'}`);
    if (tcpResult2.success) {
      console.log(`   响应时间：${tcpResult2.responseTime}ms`);
    } else {
      console.log(`   错误：${tcpResult2.error}`);
    }
    
    // 2. UDP 通信示例
    console.log('\n2️⃣ UDP 通信测试:');
    console.log('   测试本地 DNS 服务 (127.0.0.1:53)...');
    const udpResult = await udpCommunicate('127.0.0.1', 53, Buffer.from('ping'), 2000);
    console.log(`   结果：${udpResult.success ? '✅ 成功' : '❌ 失败'}`);
    if (udpResult.success) {
      console.log(`   响应时间：${udpResult.responseTime}ms`);
      console.log(`   响应数据：${udpResult.responseData?.toString() || 'N/A'}`);
    } else {
      console.log(`   错误：${udpResult.error}`);
    }
    
    // 3. 端口扫描示例
    console.log('\n3️⃣ 端口扫描测试:');
    console.log('   快速扫描本地常用端口 (127.0.0.1)...');
    const scanResults = await quickScan('127.0.0.1', 1000);
    const openPorts = scanResults.filter(r => r.status === 'open');
    
    console.log(`   扫描完成！发现 ${openPorts.length} 个开放端口:`);
    if (openPorts.length > 0) {
      openPorts.forEach(port => {
        console.log(`     - 端口 ${port.port} (${port.service || 'Unknown'}) - ${port.responseTime}ms`);
      });
    } else {
      console.log('     暂无开放端口');
    }
    
    console.log('\n✅ 所有示例执行完成!');
    console.log('\n📖 更多用法:');
    console.log('   - tcpConnect(host, port, timeout) - TCP 连接测试');
    console.log('   - udpCommunicate(host, port, message, timeout) - UDP 通信');
    console.log('   - scanPorts(host, startPort, endPort, concurrency, timeout) - 端口范围扫描');
    console.log('   - quickScan(host, timeout) - 快速扫描常用端口');
  })();
}

/**
 * 网络工具技能 - 使用示例
 * 
 * 演示如何使用 network-utils-skill 中的功能
 */

import { tcpConnect, udpCommunicate, scanPorts, quickScan } from './network-utils-skill';

// ============================================
// 示例 1: TCP 连接测试
// ============================================
async function exampleTCPConnect() {
  console.log('=== TCP 连接测试 ===\n');
  
  // 测试本地服务
  const localHTTP = await tcpConnect('127.0.0.1', 80);
  console.log('本地 HTTP (80):', localHTTP.success ? '✅ 开放' : '❌ 关闭');
  
  const localHTTPS = await tcpConnect('127.0.0.1', 443);
  console.log('本地 HTTPS (443):', localHTTPS.success ? '✅ 开放' : '❌ 关闭');
  
  // 测试远程服务
  const googleHTTP = await tcpConnect('google.com', 80, 3000);
  console.log('Google HTTP:', googleHTTP.success ? '✅ 开放' : '❌ 关闭');
  
  console.log('');
}

// ============================================
// 示例 2: UDP 通信测试
// ============================================
async function exampleUDPCommunicate() {
  console.log('=== UDP 通信测试 ===\n');
  
  // 测试 DNS 服务器
  const dnsResult = await udpCommunicate('8.8.8.8', 53, Buffer.from('ping'), 3000);
  console.log('Google DNS (8.8.8.8:53):', dnsResult.success ? '✅ 响应' : '❌ 无响应');
  if (dnsResult.success) {
    console.log('  响应时间:', dnsResult.responseTime, 'ms');
  }
  
  console.log('');
}

// ============================================
// 示例 3: 快速端口扫描
// ============================================
async function exampleQuickScan() {
  console.log('=== 快速端口扫描 ===\n');
  
  const results = await quickScan('127.0.0.1', 1000);
  const openPorts = results.filter(r => r.status === 'open');
  
  console.log(`扫描完成！发现 ${openPorts.length} 个开放端口:\n`);
  
  if (openPorts.length > 0) {
    openPorts.forEach(port => {
      const serviceName = port.service || 'Unknown';
      console.log(`  端口 ${port.port.toString().padEnd(5)} - ${serviceName.padEnd(15)} (${port.responseTime}ms)`);
    });
  } else {
    console.log('  暂无开放端口');
  }
  
  console.log('');
}

// ============================================
// 示例 4: 范围端口扫描
// ============================================
async function exampleRangeScan() {
  console.log('=== 范围端口扫描 (1-100) ===\n');
  
  const results = await scanPorts('127.0.0.1', 1, 100, 20, 500);
  const openPorts = results.filter(r => r.status === 'open');
  
  console.log(`开放端口: ${openPorts.map(p => p.port).join(', ') || '无'}\n`);
}

// ============================================
// 示例 5: 服务健康检查
// ============================================
async function exampleHealthCheck() {
  console.log('=== 服务健康检查 ===\n');
  
  const services = [
    { name: 'Web Server', host: '127.0.0.1', port: 80 },
    { name: 'Database', host: '127.0.0.1', port: 3306 },
    { name: 'Redis', host: '127.0.0.1', port: 6379 },
    { name: 'SSH', host: '127.0.0.1', port: 22 }
  ];
  
  for (const service of services) {
    const result = await tcpConnect(service.host, service.port, 1000);
    const status = result.success ? '✅ 运行中' : '❌ 未运行';
    console.log(`${service.name.padEnd(15)} (${service.port}): ${status}`);
  }
  
  console.log('');
}

// ============================================
// 主程序
// ============================================
async function main() {
  console.log('🌐 网络工具技能 - 使用示例\n');
  console.log('═'.repeat(50) + '\n');
  
  try {
    await exampleTCPConnect();
    await exampleUDPCommunicate();
    await exampleQuickScan();
    await exampleRangeScan();
    await exampleHealthCheck();
    
    console.log('✅ 所有示例执行完成!');
  } catch (error) {
    console.error('❌ 执行错误:', error);
  }
}

// 运行示例
main();

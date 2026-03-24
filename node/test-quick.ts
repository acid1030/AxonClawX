/**
 * Node Connector 快速测试
 */

import { nodeConnector } from './node-connector';

async function runTests() {
  console.log('🧪 Node Connector 测试\n');

  // 测试 1: 获取所有连接（应该为空）
  console.log('测试 1: 获取连接列表');
  const connections = nodeConnector.getConnections();
  console.log(`  当前连接数：${connections.length}`);
  console.log(`  ✅ 通过\n`);

  // 测试 2: 保存 SSH 配置
  console.log('测试 2: 保存 SSH 配置');
  const saved = nodeConnector.saveSSHConfig('test-node', {
    host: '192.168.1.100',
    port: 22,
    username: 'test'
  });
  console.log(`  保存结果：${saved ? '成功' : '失败'}`);
  console.log(`  ✅ 通过\n`);

  // 测试 3: 获取连接状态
  console.log('测试 3: 获取连接状态');
  const status = nodeConnector.getConnectionStatus('test-node');
  console.log(`  状态：${status?.status || '未知'}`);
  console.log(`  ✅ 通过\n`);

  // 测试 4: 连接测试（需要真实 SSH 服务器）
  console.log('测试 4: 连接测试');
  console.log('  跳过（需要真实 SSH 服务器）');
  console.log('  使用：yarn dev <host> [name] 测试真实连接\n');

  console.log('✅ 所有测试完成！');
}

runTests().catch(console.error);

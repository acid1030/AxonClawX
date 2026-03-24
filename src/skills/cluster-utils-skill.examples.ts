/**
 * Cluster Utils Skill - 使用示例
 * 
 * 本文件包含 ACE Cluster Utils 的完整使用示例
 */

import { ClusterManager, LoadBalanceStrategy, NodeStatus } from './cluster-utils-skill'

// ==================== 示例 1: 基础集群管理 ====================

function example1_BasicCluster() {
  console.log('=== 示例 1: 基础集群管理 ===\n')

  // 创建集群
  const cluster = new ClusterManager({
    name: 'demo-cluster',
    strategy: LoadBalanceStrategy.ROUND_ROBIN,
    healthCheck: {
      enabled: true,
      interval: 10000,
      timeout: 5000,
      unhealthyThreshold: 3,
      healthyThreshold: 2,
    },
    stickySessions: false,
  })

  // 添加节点
  cluster.addNode({
    id: 'node-1',
    name: 'Server Alpha',
    host: '192.168.1.10',
    port: 8080,
  })

  cluster.addNode({
    id: 'node-2',
    name: 'Server Beta',
    host: '192.168.1.11',
    port: 8080,
  })

  cluster.addNode({
    id: 'node-3',
    name: 'Server Gamma',
    host: '192.168.1.12',
    port: 8080,
  })

  // 选择节点 (轮询)
  console.log('轮询选择节点:')
  for (let i = 0; i < 6; i++) {
    const node = cluster.selectNode({
      path: '/api/test',
      method: 'GET',
      timestamp: Date.now(),
    })
    if (node) {
      console.log(`  Request ${i + 1}: ${node.name}`)
    }
  }

  // 查看统计
  const stats = cluster.getStats()
  console.log('\n集群统计:')
  console.log(`  总节点数：${stats.totalNodes}`)
  console.log(`  健康节点：${stats.healthyNodes}`)
  console.log(`  总请求数：${stats.totalRequests}`)
  console.log(`  每节点请求：`, stats.requestsPerNode)

  // 清理
  cluster.destroy()
}

// ==================== 示例 2: 加权负载均衡 ====================

function example2_WeightedLoadBalancing() {
  console.log('\n=== 示例 2: 加权负载均衡 ===\n')

  const cluster = new ClusterManager({
    name: 'weighted-cluster',
    strategy: LoadBalanceStrategy.WEIGHTED,
    healthCheck: { enabled: false },
  })

  // 添加不同权重的节点
  cluster.addNode({
    id: 'powerful',
    name: 'High-Performance Server',
    host: '10.0.0.1',
    port: 8080,
    weight: 5, // 高性能，权重高
  })

  cluster.addNode({
    id: 'normal',
    name: 'Normal Server',
    host: '10.0.0.2',
    port: 8080,
    weight: 2,
  })

  cluster.addNode({
    id: 'weak',
    name: 'Low-End Server',
    host: '10.0.0.3',
    port: 8080,
    weight: 1, // 低性能，权重低
  })

  // 统计选择结果
  const selectionCount: Record<string, number> = {}

  for (let i = 0; i < 1000; i++) {
    const node = cluster.selectNode({ timestamp: Date.now() })
    if (node) {
      selectionCount[node.id] = (selectionCount[node.id] || 0) + 1
    }
  }

  console.log('1000 次请求的节点分布:')
  Object.entries(selectionCount).forEach(([id, count]) => {
    const node = cluster.getNode(id)
    const percentage = ((count / 1000) * 100).toFixed(1)
    console.log(`  ${node?.name}: ${count} 次 (${percentage}%)`)
  })

  cluster.destroy()
}

// ==================== 示例 3: 最少连接数策略 ====================

function example3_LeastConnections() {
  console.log('\n=== 示例 3: 最少连接数策略 ===\n')

  const cluster = new ClusterManager({
    name: 'least-conn-cluster',
    strategy: LoadBalanceStrategy.LEAST_CONNECTIONS,
    healthCheck: { enabled: false },
  })

  // 添加节点
  cluster.addNode({ id: 'node-1', name: 'Node 1', host: '10.0.0.1', port: 8080 })
  cluster.addNode({ id: 'node-2', name: 'Node 2', host: '10.0.0.2', port: 8080 })
  cluster.addNode({ id: 'node-3', name: 'Node 3', host: '10.0.0.3', port: 8080 })

  // 模拟不同数量的活动连接
  const node1 = cluster.getNode('node-1')
  const node2 = cluster.getNode('node-2')
  const node3 = cluster.getNode('node-3')

  if (node1) node1.activeConnections = 50
  if (node2) node2.activeConnections = 10
  if (node3) node3.activeConnections = 30

  console.log('当前连接数:')
  console.log(`  Node 1: ${node1?.activeConnections} 连接`)
  console.log(`  Node 2: ${node2?.activeConnections} 连接`)
  console.log(`  Node 3: ${node3?.activeConnections} 连接`)

  // 新请求应该选择连接数最少的节点
  const nextNode = cluster.selectNode({ timestamp: Date.now() })
  console.log(`\n下一个请求将发送到：${nextNode?.name} (${nextNode?.activeConnections} 连接)`)

  cluster.destroy()
}

// ==================== 示例 4: IP 哈希会话保持 ====================

function example4_IPHashStickySessions() {
  console.log('\n=== 示例 4: IP 哈希会话保持 ===\n')

  const cluster = new ClusterManager({
    name: 'ip-hash-cluster',
    strategy: LoadBalanceStrategy.IP_HASH,
    stickySessions: true,
    healthCheck: { enabled: false },
  })

  cluster.addNode({ id: 'node-1', name: 'Server 1', host: '10.0.0.1', port: 8080 })
  cluster.addNode({ id: 'node-2', name: 'Server 2', host: '10.0.0.2', port: 8080 })
  cluster.addNode({ id: 'node-3', name: 'Server 3', host: '10.0.0.3', port: 8080 })

  // 模拟多个客户端 IP
  const clientIPs = [
    '192.168.1.100',
    '192.168.1.101',
    '192.168.1.102',
    '192.168.1.100', // 重复 IP
    '192.168.1.101', // 重复 IP
    '10.0.0.50',
  ]

  console.log('IP 哈希分配:')
  const assignments: Record<string, string> = {}

  clientIPs.forEach((ip, index) => {
    const node = cluster.selectNode({
      ip,
      path: '/api/data',
      timestamp: Date.now(),
    })

    if (node) {
      const key = `${ip}`
      assignments[key] = node.name
      console.log(`  请求 ${index + 1}: IP ${ip} → ${node.name}`)
    }
  })

  console.log('\n验证会话保持:')
  Object.entries(assignments).forEach(([ip, nodeName]) => {
    console.log(`  ${ip} 始终分配到 ${nodeName}`)
  })

  cluster.destroy()
}

// ==================== 示例 5: 故障转移演示 ====================

async function example5_Failover() {
  console.log('\n=== 示例 5: 故障转移演示 ===\n')

  const cluster = new ClusterManager({
    name: 'failover-cluster',
    strategy: LoadBalanceStrategy.ROUND_ROBIN,
    healthCheck: { enabled: false }, // 手动控制状态
    maxRetries: 3,
  })

  cluster.addNode({ id: 'node-1', name: 'Primary Server', host: '10.0.0.1', port: 8080 })
  cluster.addNode({ id: 'node-2', name: 'Backup Server 1', host: '10.0.0.2', port: 8080 })
  cluster.addNode({ id: 'node-3', name: 'Backup Server 2', host: '10.0.0.3', port: 8080 })

  // 模拟请求处理
  const context = {
    clientId: 'user-123',
    ip: '192.168.1.100',
    path: '/api/data',
    method: 'GET',
    timestamp: Date.now(),
  }

  console.log('初始状态:')
  let node = cluster.selectNode(context)
  console.log(`  选择节点：${node?.name}`)

  if (node) {
    console.log('\n模拟节点故障...')
    
    // 模拟第一次失败
    console.log(`  请求失败，尝试故障转移 (重试 1/3)`)
    let newNode = await cluster.handleRequestFailure(node.id, context, 0)
    console.log(`  故障转移到：${newNode?.name || '无可用节点'}`)

    if (newNode) {
      // 再次失败
      console.log(`  再次失败，尝试故障转移 (重试 2/3)`)
      newNode = await cluster.handleRequestFailure(newNode.id, context, 1)
      console.log(`  故障转移到：${newNode?.name || '无可用节点'}`)

      if (newNode) {
        // 成功
        console.log(`  请求成功!`)
        cluster.handleRequestSuccess(newNode.id, 150) // 150ms 响应时间
      }
    }
  }

  // 查看最终状态
  console.log('\n最终节点状态:')
  cluster.getAllNodes().forEach((n) => {
    console.log(`  ${n.name}: ${n.status} (${n.failedRequests} 次失败)`)
  })

  cluster.destroy()
}

// ==================== 示例 6: 健康检查集成 ====================

function example6_HealthCheckIntegration() {
  console.log('\n=== 示例 6: 自定义健康检查 ===\n')

  // 扩展 ClusterManager 实现自定义健康检查
  class CustomHealthCheckCluster extends ClusterManager {
    protected async performHealthCheck(node: any): Promise<boolean> {
      // 这里可以实现真实的 HTTP/TCP 健康检查
      // 示例中模拟随机成功/失败
      const isHealthy = Math.random() > 0.3 // 70% 成功率
      console.log(`  健康检查 [${node.name}]: ${isHealthy ? '✓ 健康' : '✗ 不健康'}`)
      return isHealthy
    }
  }

  const cluster = new CustomHealthCheckCluster({
    name: 'health-check-cluster',
    strategy: LoadBalanceStrategy.ROUND_ROBIN,
    healthCheck: {
      enabled: true,
      interval: 2000, // 2 秒检查一次 (示例中缩短时间)
      timeout: 1000,
      unhealthyThreshold: 2,
      healthyThreshold: 2,
    },
  })

  cluster.addNode({ id: 'node-1', name: 'Server A', host: '10.0.0.1', port: 8080 })
  cluster.addNode({ id: 'node-2', name: 'Server B', host: '10.0.0.2', port: 8080 })

  console.log('启动健康检查 (模拟 10 秒)...')
  console.log('节点状态变化:')

  // 模拟观察状态变化
  setTimeout(() => {
    cluster.getAllNodes().forEach((node) => {
      console.log(`  ${node.name}: ${node.status}`)
    })
    cluster.destroy()
  }, 10000)
}

// ==================== 示例 7: 实时监控 ====================

function example7_RealTimeMonitoring() {
  console.log('\n=== 示例 7: 实时监控 ===\n')

  const cluster = new ClusterManager({
    name: 'monitoring-cluster',
    strategy: LoadBalanceStrategy.ROUND_ROBIN,
    healthCheck: { enabled: false },
  })

  // 添加节点
  for (let i = 1; i <= 5; i++) {
    cluster.addNode({
      id: `node-${i}`,
      name: `Server ${i}`,
      host: `10.0.0.${i}`,
      port: 8080,
    })
  }

  // 模拟流量
  const requestInterval = setInterval(() => {
    const node = cluster.selectNode({
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      path: '/api/data',
      timestamp: Date.now(),
    })

    if (node) {
      // 模拟响应时间
      const responseTime = Math.random() * 200 + 50
      cluster.handleRequestSuccess(node.id, responseTime)
    }
  }, 100)

  // 定期输出统计
  const statsInterval = setInterval(() => {
    const stats = cluster.getStats()
    console.log('\n[实时监控]')
    console.log(`  健康节点：${stats.healthyNodes}/${stats.totalNodes}`)
    console.log(`  总请求：${stats.totalRequests}`)
    console.log(`  失败请求：${stats.failedRequests}`)
    console.log(`  平均响应：${stats.averageResponseTime.toFixed(1)}ms`)
    console.log(`  请求分布:`, stats.requestsPerNode)
  }, 2000)

  // 10 秒后停止
  setTimeout(() => {
    clearInterval(requestInterval)
    clearInterval(statsInterval)
    
    console.log('\n最终统计:')
    const finalStats = cluster.getStats()
    console.log(`  总请求数：${finalStats.totalRequests}`)
    console.log(`  平均响应时间：${finalStats.averageResponseTime.toFixed(2)}ms`)
    
    cluster.destroy()
  }, 10000)
}

// ==================== 示例 8: 数据库读写分离 ====================

async function example8_DatabaseReadWriteSplit() {
  console.log('\n=== 示例 8: 数据库读写分离 ===\n')

  // 写集群 (主库)
  const writeCluster = new ClusterManager({
    name: 'db-write',
    strategy: LoadBalanceStrategy.ROUND_ROBIN,
    healthCheck: { enabled: false },
  })

  // 读集群 (从库)
  const readCluster = new ClusterManager({
    name: 'db-read',
    strategy: LoadBalanceStrategy.LEAST_CONNECTIONS,
    healthCheck: { enabled: false },
  })

  // 添加主库
  writeCluster.addNode({
    id: 'db-master',
    name: 'Master Database',
    host: 'db-master.local',
    port: 5432,
  })

  // 添加从库
  readCluster.addNode({
    id: 'db-slave-1',
    name: 'Slave Database 1',
    host: 'db-slave-1.local',
    port: 5432,
    weight: 2,
  })

  readCluster.addNode({
    id: 'db-slave-2',
    name: 'Slave Database 2',
    host: 'db-slave-2.local',
    port: 5432,
    weight: 1,
  })

  // 模拟数据库操作
  async function executeQuery(sql: string, isWrite: boolean) {
    const cluster = isWrite ? writeCluster : readCluster
    const operation = isWrite ? 'WRITE' : 'READ'
    
    const node = cluster.selectNode()
    if (!node) {
      throw new Error('Database unavailable')
    }

    console.log(`  [${operation}] ${sql} → ${node.name}`)
    
    // 模拟查询执行
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
    
    cluster.handleRequestSuccess(node.id)
    return { success: true }
  }

  // 执行示例查询
  console.log('执行数据库操作:')
  await executeQuery('INSERT INTO users VALUES (...)', true)
  await executeQuery('SELECT * FROM users', false)
  await executeQuery('SELECT * FROM products', false)
  await executeQuery('UPDATE users SET ...', true)
  await executeQuery('SELECT * FROM orders', false)

  writeCluster.destroy()
  readCluster.destroy()
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗')
  console.log('║   ACE Cluster Utils - 使用示例         ║')
  console.log('╚════════════════════════════════════════╝\n')

  example1_BasicCluster()
  example2_WeightedLoadBalancing()
  example3_LeastConnections()
  example4_IPHashStickySessions()
  await example5_Failover()
  example6_HealthCheckIntegration()
  
  // 等待健康检查示例完成
  await new Promise(resolve => setTimeout(resolve, 11000))
  
  example7_RealTimeMonitoring()
  
  // 等待监控示例完成
  await new Promise(resolve => setTimeout(resolve, 11000))
  
  await example8_DatabaseReadWriteSplit()

  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   所有示例运行完成!                    ║')
  console.log('╚════════════════════════════════════════╝')
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error)
}

// 导出示例函数供单独运行
export {
  example1_BasicCluster,
  example2_WeightedLoadBalancing,
  example3_LeastConnections,
  example4_IPHashStickySessions,
  example5_Failover,
  example6_HealthCheckIntegration,
  example7_RealTimeMonitoring,
  example8_DatabaseReadWriteSplit,
  runAllExamples,
}

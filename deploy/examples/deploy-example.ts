/**
 * Deploy Skill 使用示例
 * 
 * 展示各种部署场景和配置
 */

import { deploy, rollback, DeployConfig } from '../deployer.js';

// ============================================
// 示例 1: 本地预览部署 (开发环境)
// ============================================

async function exampleLocalDeploy() {
  console.log('\n=== 示例 1: 本地预览部署 ===\n');
  
  const config: DeployConfig = {
    target: 'local',
    buildCmd: 'npm run build',
    buildDir: './dist'
  };

  const result = await deploy('development', config);
  console.log('部署结果:', result);
}

// ============================================
// 示例 2: SSH 简单部署
// ============================================

async function exampleSSHSimpleDeploy() {
  console.log('\n=== 示例 2: SSH 简单部署 ===\n');
  
  const config: DeployConfig = {
    target: 'ssh',
    strategy: 'simple',
    host: 'server.example.com',
    port: 22,
    user: 'deploy',
    privateKey: '~/.ssh/id_ed25519',
    path: '/var/www/app',
    buildCmd: 'npm run build',
    restartCmd: 'systemctl restart app',
    healthCheck: {
      enabled: true,
      url: 'http://localhost:3000/health',
      timeout: 30000,
      retries: 3
    },
    rollback: {
      enabled: true,
      keepReleases: 3
    }
  };

  const result = await deploy('production', config);
  console.log('部署结果:', result);
}

// ============================================
// 示例 3: SSH 蓝绿部署 (零停机)
// ============================================

async function exampleSSHBlueGreen() {
  console.log('\n=== 示例 3: SSH 蓝绿部署 ===\n');
  
  const config: DeployConfig = {
    target: 'ssh',
    strategy: 'blue-green',
    host: 'prod-server.example.com',
    port: 22,
    user: 'deploy',
    privateKey: '~/.ssh/id_ed25519',
    path: '/var/www/myapp',
    buildCmd: 'npm run build',
    restartCmd: 'systemctl restart myapp',
    healthCheck: {
      enabled: true,
      url: 'http://localhost:3000/api/health',
      timeout: 60000,
      retries: 5
    },
    rollback: {
      enabled: true,
      keepReleases: 5
    }
  };

  const result = await deploy('production', config);
  console.log('蓝绿部署结果:', result);
  
  // 如果需要回滚
  // await rollback('production', config, result.rollbackPoint!);
}

// ============================================
// 示例 4: SSH 滚动更新 (多实例)
// ============================================

async function exampleSSHRolling() {
  console.log('\n=== 示例 4: SSH 滚动更新 ===\n');
  
  const config: DeployConfig = {
    target: 'ssh',
    strategy: 'rolling',
    host: 'cluster.example.com',
    port: 22,
    user: 'deploy',
    privateKey: '~/.ssh/id_ed25519',
    path: '/opt/app',
    buildCmd: 'npm run build',
    healthCheck: {
      enabled: true,
      url: 'http://localhost:3000/health',
      timeout: 30000,
      retries: 3
    }
  };

  const result = await deploy('staging', config);
  console.log('滚动更新结果:', result);
}

// ============================================
// 示例 5: Docker 部署
// ============================================

async function exampleDockerDeploy() {
  console.log('\n=== 示例 5: Docker 部署 ===\n');
  
  const config: DeployConfig = {
    target: 'docker',
    imageName: 'myapp',
    containerName: 'myapp-container',
    registry: 'registry.example.com',
    buildDir: '.',
    healthCheck: {
      enabled: true,
      url: 'http://localhost:3000/health',
      timeout: 30000,
      retries: 3
    }
  };

  const result = await deploy('production', config);
  console.log('Docker 部署结果:', result);
}

// ============================================
// 示例 6: Docker 部署到 Kubernetes
// ============================================

async function exampleDockerK8s() {
  console.log('\n=== 示例 6: Docker + K8s 部署 ===\n');
  
  const config: DeployConfig = {
    target: 'docker',
    imageName: 'myorg/myapp',
    containerName: 'myapp',
    registry: 'gcr.io',
    buildDir: '.',
    restartCmd: 'kubectl rollout restart deployment/myapp',
    healthCheck: {
      enabled: true,
      url: 'https://myapp.example.com/health',
      timeout: 60000,
      retries: 5
    }
  };

  const result = await deploy('production', config);
  console.log('K8s 部署结果:', result);
}

// ============================================
// 示例 7: 回滚操作
// ============================================

async function exampleRollback() {
  console.log('\n=== 示例 7: 回滚操作 ===\n');
  
  const config: DeployConfig = {
    target: 'ssh',
    host: 'server.example.com',
    user: 'deploy',
    privateKey: '~/.ssh/id_ed25519',
    path: '/var/www/app',
    restartCmd: 'systemctl restart app'
  };

  // 回滚到指定版本
  await rollback('production', config, 'v1709372400');
  console.log('回滚完成');
}

// ============================================
// 示例 8: 多环境部署配置
// ============================================

const DEPLOY_CONFIGS = {
  development: {
    target: 'local' as const,
    buildCmd: 'npm run build:dev',
  },
  
  staging: {
    target: 'ssh' as const,
    strategy: 'simple' as const,
    host: 'staging.example.com',
    user: 'deploy',
    privateKey: '~/.ssh/id_ed25519',
    path: '/var/www/staging',
    buildCmd: 'npm run build',
    restartCmd: 'systemctl restart app-staging',
  },
  
  production: {
    target: 'ssh' as const,
    strategy: 'blue-green' as const,
    host: 'prod.example.com',
    user: 'deploy',
    privateKey: '~/.ssh/id_ed25519',
    path: '/var/www/prod',
    buildCmd: 'npm run build:prod',
    restartCmd: 'systemctl restart app-prod',
    healthCheck: {
      enabled: true,
      url: 'https://app.example.com/health',
      timeout: 60000,
      retries: 5
    },
    rollback: {
      enabled: true,
      keepReleases: 5
    }
  }
};

async function exampleMultiEnvironment() {
  console.log('\n=== 示例 8: 多环境部署 ===\n');
  
  const environment = process.argv[2] || 'staging';
  const config = DEPLOY_CONFIGS[environment as keyof typeof DEPLOY_CONFIGS];
  
  if (!config) {
    console.error(`未知环境：${environment}`);
    return;
  }
  
  console.log(`部署到环境：${environment}`);
  const result = await deploy(environment, config as DeployConfig);
  console.log('部署结果:', result);
}

// ============================================
// 主函数 - 运行示例
// ============================================

async function main() {
  console.log('🚀 Deploy Skill 使用示例\n');
  console.log('可用示例:');
  console.log('  1. local     - 本地预览部署');
  console.log('  2. ssh-simple - SSH 简单部署');
  console.log('  3. ssh-bluegreen - SSH 蓝绿部署');
  console.log('  4. ssh-rolling - SSH 滚动更新');
  console.log('  5. docker    - Docker 部署');
  console.log('  6. docker-k8s - Docker + K8s');
  console.log('  7. rollback  - 回滚示例');
  console.log('  8. multi-env - 多环境部署');
  console.log('');
  
  const example = process.argv[2];
  
  try {
    switch (example) {
      case '1':
      case 'local':
        await exampleLocalDeploy();
        break;
      case '2':
      case 'ssh-simple':
        await exampleSSHSimpleDeploy();
        break;
      case '3':
      case 'ssh-bluegreen':
        await exampleSSHBlueGreen();
        break;
      case '4':
      case 'ssh-rolling':
        await exampleSSHRolling();
        break;
      case '5':
      case 'docker':
        await exampleDockerDeploy();
        break;
      case '6':
      case 'docker-k8s':
        await exampleDockerK8s();
        break;
      case '7':
      case 'rollback':
        await exampleRollback();
        break;
      case '8':
      case 'multi-env':
        await exampleMultiEnvironment();
        break;
      default:
        console.log('运行所有示例或指定示例编号/名称\n');
        // 默认只运行本地示例（安全）
        await exampleLocalDeploy();
    }
  } catch (error: any) {
    console.error('❌ 部署失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (process.argv[1]?.endsWith('deploy-example.ts')) {
  main();
}

export {
  exampleLocalDeploy,
  exampleSSHSimpleDeploy,
  exampleSSHBlueGreen,
  exampleSSHRolling,
  exampleDockerDeploy,
  exampleDockerK8s,
  exampleRollback,
  exampleMultiEnvironment,
  DEPLOY_CONFIGS
};

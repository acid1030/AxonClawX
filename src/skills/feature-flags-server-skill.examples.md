# Feature Flags Server Skill - 使用示例

## 🚀 快速启动

### 1. 基础启动

```bash
# 使用默认配置 (端口 3000, localhost)
npx ts-node src/skills/feature-flags-server-skill.ts

# 自定义配置
npx ts-node src/skills/feature-flags-server-skill.ts \
  --port=8080 \
  --host=0.0.0.0 \
  --data-dir=/data/feature-flags \
  --api-key=your-secret-key
```

### 2. 作为模块使用

```typescript
import { createFeatureFlagsServer } from './src/skills/feature-flags-server-skill';

// 创建服务器
const server = createFeatureFlagsServer({
  port: 3000,
  host: 'localhost',
  dataDir: './data/feature-flags',
  apiKey: 'your-secret-key' // 可选
});

// 启动服务器
await server.start();

// 停止服务器
await server.stop();
```

---

## 📡 API 使用示例

### 1. 特性开关管理

#### 创建特性开关

```bash
# 布尔型开关 - 新功能灰度
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "key": "new-checkout-flow",
    "name": "新结账流程",
    "description": "优化后的结账体验",
    "type": "boolean",
    "defaultValue": false,
    "enabled": true,
    "rollout": {
      "strategy": "percentage",
      "percentage": 10,
      "seed": "checkout-v1"
    },
    "tags": ["checkout", "frontend", "experiment"]
  }'
```

```bash
# 字符串型开关 - A/B 测试变体
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "homepage-layout",
    "name": "首页布局",
    "description": "首页布局 A/B 测试",
    "type": "string",
    "defaultValue": "layout-a",
    "enabled": true,
    "tags": ["homepage", "ui"]
  }'
```

```bash
# 数字型开关 - 功能参数控制
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "max-upload-size",
    "name": "最大上传大小",
    "description": "控制用户上传文件大小限制 (MB)",
    "type": "number",
    "defaultValue": 10,
    "enabled": true,
    "tags": ["upload", "config"]
  }'
```

#### 查询特性开关

```bash
# 获取所有开关
curl http://localhost:3000/api/flags

# 获取单个开关
curl http://localhost:3000/api/flags/new-checkout-flow
```

#### 更新特性开关

```bash
# 增加灰度比例到 50%
curl -X PUT http://localhost:3000/api/flags/new-checkout-flow \
  -H "Content-Type: application/json" \
  -d '{
    "rollout": {
      "strategy": "percentage",
      "percentage": 50,
      "seed": "checkout-v1"
    }
  }'
```

```bash
# 基于用户列表的精准灰度
curl -X PUT http://localhost:3000/api/flags/new-checkout-flow \
  -H "Content-Type: application/json" \
  -d '{
    "rollout": {
      "strategy": "user-list",
      "userIds": ["user_123", "user_456", "vip_customer_789"]
    }
  }'
```

```bash
# 基于地域的灰度
curl -X PUT http://localhost:3000/api/flags/new-checkout-flow \
  -H "Content-Type: application/json" \
  -d '{
    "rollout": {
      "strategy": "geo",
      "countries": ["CN", "US", "SG"]
    }
  }'
```

#### 删除特性开关

```bash
curl -X DELETE http://localhost:3000/api/flags/new-checkout-flow
```

---

### 2. 特性评估

#### 基础评估

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "userId": "user_123"
  }'

# 响应示例
{
  "data": {
    "flagKey": "new-checkout-flow",
    "value": true,
    "reason": "rollout"
  }
}
```

#### 带上下文的评估

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "new-checkout-flow",
    "userId": "user_456",
    "country": "CN",
    "attributes": {
      "isVip": true,
      "accountAge": 365,
      "totalOrders": 50
    }
  }'
```

#### 基于属性的评估

```bash
# 先创建基于属性的开关
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "premium-feature",
    "name": "高级功能",
    "description": "仅对 VIP 用户开放",
    "type": "boolean",
    "defaultValue": false,
    "enabled": true,
    "rollout": {
      "strategy": "attribute",
      "attributeRules": [
        {
          "attribute": "isVip",
          "operator": "equals",
          "value": true
        },
        {
          "attribute": "accountAge",
          "operator": "greater-than",
          "value": 90
        }
      ]
    }
  }'

# 评估
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "premium-feature",
    "userId": "user_789",
    "attributes": {
      "isVip": true,
      "accountAge": 180
    }
  }'
```

---

### 3. A/B 测试实验管理

#### 创建实验

```bash
curl -X POST http://localhost:3000/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "id": "exp-checkout-2024",
    "name": "结账流程优化实验",
    "flagKey": "new-checkout-flow",
    "description": "测试新结账流程对转化率的影响",
    "status": "running",
    "variants": [
      {
        "id": "control",
        "name": "对照组",
        "value": false,
        "allocation": 50
      },
      {
        "id": "treatment",
        "name": "实验组",
        "value": true,
        "allocation": 50
      }
    ],
    "targetMetrics": ["conversion_rate", "checkout_time", "cart_abandonment"]
  }'
```

#### 多变量实验

```bash
curl -X POST http://localhost:3000/api/experiments \
  -H "Content-Type: application/json" \
  -d '{
    "id": "exp-homepage-layout",
    "name": "首页布局多变量测试",
    "flagKey": "homepage-layout",
    "description": "测试 3 种不同的首页布局",
    "status": "running",
    "variants": [
      {
        "id": "layout-a",
        "name": "经典布局",
        "value": "layout-a",
        "allocation": 40
      },
      {
        "id": "layout-b",
        "name": "卡片布局",
        "value": "layout-b",
        "allocation": 30
      },
      {
        "id": "layout-c",
        "name": "列表布局",
        "value": "layout-c",
        "allocation": 30
      }
    ],
    "targetMetrics": ["click_through_rate", "time_on_page", "bounce_rate"]
  }'
```

#### 查询实验

```bash
# 获取所有实验
curl http://localhost:3000/api/experiments

# 获取单个实验
curl http://localhost:3000/api/experiments/exp-checkout-2024
```

#### 更新实验状态

```bash
# 暂停实验
curl -X PUT http://localhost:3000/api/experiments/exp-checkout-2024 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paused"
  }'

# 完成实验
curl -X PUT http://localhost:3000/api/experiments/exp-checkout-2024 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

#### 删除实验

```bash
curl -X DELETE http://localhost:3000/api/experiments/exp-checkout-2024
```

---

### 4. 健康检查

```bash
curl http://localhost:3000/api/health

# 响应示例
{
  "status": "healthy",
  "timestamp": 1710345600000,
  "flags": 15,
  "experiments": 3
}
```

---

## 💻 客户端集成示例

### Node.js SDK

```typescript
class FeatureFlagsClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async evaluate(flagKey: string, context: {
    userId?: string;
    country?: string;
    attributes?: Record<string, any>;
  }) {
    const response = await fetch(`${this.baseUrl}/api/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'X-API-Key': this.apiKey })
      },
      body: JSON.stringify({ flagKey, ...context })
    });
    
    const result = await response.json();
    return result.data;
  }

  async isEnabled(flagKey: string, userId?: string): Promise<boolean> {
    const result = await this.evaluate(flagKey, { userId });
    return result.value === true;
  }
}

// 使用示例
const client = new FeatureFlagsClient('http://localhost:3000', 'your-secret-key');

// 检查开关
const isEnabled = await client.isEnabled('new-checkout-flow', 'user_123');
if (isEnabled) {
  // 展示新功能
}

// 获取配置值
const layout = await client.evaluate('homepage-layout', {
  userId: 'user_456',
  attributes: { isVip: true }
});
console.log('Layout:', layout.value); // "layout-a" | "layout-b" | "layout-c"
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

function useFeatureFlag(flagKey: string, userId: string) {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagKey, userId })
    })
      .then(res => res.json())
      .then(data => {
        setValue(data.data.value);
        setLoading(false);
      });
  }, [flagKey, userId]);

  return { value, loading };
}

// 组件中使用
function CheckoutPage({ userId }) {
  const { value: isNewFlow, loading } = useFeatureFlag('new-checkout-flow', userId);

  if (loading) return <div>Loading...</div>;

  return isNewFlow ? <NewCheckoutFlow /> : <ClassicCheckoutFlow />;
}
```

### Python 客户端

```python
import requests

class FeatureFlagsClient:
    def __init__(self, base_url: str, api_key: str = None):
        self.base_url = base_url
        self.api_key = api_key
    
    def evaluate(self, flag_key: str, user_id: str = None, **kwargs):
        headers = {'Content-Type': 'application/json'}
        if self.api_key:
            headers['X-API-Key'] = self.api_key
        
        payload = {'flagKey': flag_key, **kwargs}
        if user_id:
            payload['userId'] = user_id
        
        response = requests.post(
            f'{self.base_url}/api/evaluate',
            headers=headers,
            json=payload
        )
        return response.json()['data']
    
    def is_enabled(self, flag_key: str, user_id: str = None) -> bool:
        result = self.evaluate(flag_key, user_id)
        return result['value'] is True

# 使用示例
client = FeatureFlagsClient('http://localhost:3000', 'your-secret-key')

# 检查开关
if client.is_enabled('new-checkout-flow', 'user_123'):
    print("New checkout flow is enabled!")

# 获取配置
layout = client.evaluate('homepage-layout', user_id='user_456')
print(f"Layout: {layout['value']}")
```

---

## 🔐 安全配置

### 1. API Key 认证

```bash
# 服务端启动时配置 API Key
npx ts-node src/skills/feature-flags-server-skill.ts --api-key=your-secret-key

# 客户端请求时携带 API Key
curl http://localhost:3000/api/flags \
  -H "X-API-Key: your-secret-key"
```

### 2. 环境变量配置

```bash
# .env 文件
FEATURE_FLAGS_PORT=3000
FEATURE_FLAGS_HOST=localhost
FEATURE_FLAGS_DATA_DIR=/data/feature-flags
FEATURE_FLAGS_API_KEY=your-secret-key
```

```typescript
// 读取环境变量
const server = createFeatureFlagsServer({
  port: parseInt(process.env.FEATURE_FLAGS_PORT || '3000'),
  host: process.env.FEATURE_FLAGS_HOST || 'localhost',
  dataDir: process.env.FEATURE_FLAGS_DATA_DIR || './data/feature-flags',
  apiKey: process.env.FEATURE_FLAGS_API_KEY
});
```

---

## 📊 典型使用场景

### 场景 1: 新功能渐进式发布

```bash
# 第 1 天：1% 内部用户
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ai-chat",
    "name": "AI 聊天功能",
    "type": "boolean",
    "defaultValue": false,
    "enabled": true,
    "rollout": { "strategy": "percentage", "percentage": 1 }
  }'

# 第 3 天：10% 用户
curl -X PUT http://localhost:3000/api/flags/ai-chat \
  -H "Content-Type: application/json" \
  -d '{ "rollout": { "strategy": "percentage", "percentage": 10 } }'

# 第 7 天：50% 用户
curl -X PUT http://localhost:3000/api/flags/ai-chat \
  -H "Content-Type: application/json" \
  -d '{ "rollout": { "strategy": "percentage", "percentage": 50 } }'

# 第 14 天：100% 用户
curl -X PUT http://localhost:3000/api/flags/ai-chat \
  -H "Content-Type: application/json" \
  -d '{ "rollout": { "strategy": "percentage", "percentage": 100 } }'
```

### 场景 2: 紧急回滚

```bash
# 发现问题，立即关闭功能
curl -X PUT http://localhost:3000/api/flags/ai-chat \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
```

### 场景 3: VIP 用户专属功能

```bash
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "vip-analytics",
    "name": "VIP 数据分析",
    "type": "boolean",
    "defaultValue": false,
    "enabled": true,
    "rollout": {
      "strategy": "attribute",
      "attributeRules": [
        { "attribute": "isVip", "operator": "equals", "value": true }
      ]
    }
  }'
```

### 场景 4: 地域限定功能

```bash
curl -X POST http://localhost:3000/api/flags \
  -H "Content-Type: application/json" \
  -d '{
    "key": "wechat-payment",
    "name": "微信支付",
    "type": "boolean",
    "defaultValue": false,
    "enabled": true,
    "rollout": {
      "strategy": "geo",
      "countries": ["CN"]
    }
  }'
```

---

## 🎯 最佳实践

1. **命名规范**: 使用 `kebab-case` 命名开关 (如 `new-checkout-flow`)
2. **标签管理**: 为开关添加标签便于分类查询 (如 `["frontend", "experiment"]`)
3. **灰度策略**: 从小比例开始，逐步扩大，监控指标
4. **实验周期**: A/B 测试至少运行 2 周以获得统计显著性
5. **清理过期开关**: 定期清理已全量发布或废弃的开关
6. **文档化**: 在开关描述中详细说明用途和预期效果

---

## 📁 数据存储

数据默认存储在 `.feature-flags/` 目录下:

```
.feature-flags/
├── flags.json        # 特性开关数据
└── experiments.json  # 实验数据
```

可以自定义数据目录:

```bash
npx ts-node src/skills/feature-flags-server-skill.ts --data-dir=/persistent/data
```

---

**版本:** 1.0.0  
**作者:** KAEL  
**最后更新:** 2026-03-13

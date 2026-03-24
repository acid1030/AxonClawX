# 格式化工具技能使用示例

## 导入方式

```typescript
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatRelativeTime,
  beautifyJson,
  minifyJson,
} from './skills/format-utils-skill';
```

---

## 1. 数字格式化

### 货币格式化

```typescript
// 基础用法 (人民币)
formatCurrency(1234567.89)
// 输出：¥1,234,567.89

// 美元
formatCurrency(1234.56, '$')
// 输出：$1,234.56

// 欧元 (0 位小数)
formatCurrency(999.999, '€', 0)
// 输出：€1,000

// 不同区域
formatCurrency(1234.56, '¥', 2, 'en-US')
// 输出：¥1,234.56
```

### 百分比格式化

```typescript
// 小数转百分比 (自动乘 100)
formatPercentage(0.8756)
// 输出：87.6%

formatPercentage(0.1234, 2)
// 输出：12.34%

// 已经是百分比数值 (不乘 100)
formatPercentage(87.56, 1, false)
// 输出：87.6%

// 0 位小数
formatPercentage(0.9, 0)
// 输出：90%
```

### 数字格式化 (千分位)

```typescript
formatNumber(1234567)
// 输出：1,234,567

formatNumber(1234.567, 2)
// 输出：1,234.57

formatNumber(9999999.99, 0, 'en-US')
// 输出：9,999,999
```

---

## 2. 日期格式化

### 基础日期格式

```typescript
const now = new Date();

// 默认格式 (YYYY-MM-DD)
formatDate(now)
// 输出：2026-03-13

// 斜杠分隔
formatDate(now, { format: 'YYYY/MM/DD' })
// 输出：2026/03/13

// 日月年
formatDate(now, { format: 'DD/MM/YYYY' })
// 输出：13/03/2026

// 中文格式
formatDate(now, { format: 'YYYY 年 MM 月 DD 日' })
// 输出：2026 年 03 月 13 日

// ISO 格式
formatDate(now, { format: 'ISO' })
// 输出：2026-03-13T18:28:00.000Z
```

### 带时间的日期

```typescript
// 24 小时制 (完整)
formatDate(now, { 
  format: 'YYYY-MM-DD', 
  includeTime: true 
})
// 输出：2026-03-13 18:28:00

// 24 小时制 (简略)
formatDate(now, { 
  format: 'YYYY-MM-DD', 
  includeTime: true,
  timeFormat: 'HH:mm'
})
// 输出：2026-03-13 18:28

// 12 小时制
formatDate(now, { 
  format: 'YYYY-MM-DD', 
  includeTime: true,
  timeFormat: 'hh:mm A'
})
// 输出：2026-03-13 06:28 PM
```

### 相对时间

```typescript
// 刚刚
formatRelativeTime(new Date(Date.now() - 30000))
// 输出：刚刚

// 分钟前
formatRelativeTime(new Date(Date.now() - 300000))
// 输出：5 分钟前

// 小时前
formatRelativeTime(new Date(Date.now() - 7200000))
// 输出：2 小时前

// 天前
formatRelativeTime(new Date(Date.now() - 86400000 * 5))
// 输出：5 天前

// 超过 30 天显示具体日期
formatRelativeTime(new Date(Date.now() - 86400000 * 60))
// 输出：2026-01-12
```

---

## 3. JSON 美化

### 基础美化

```typescript
const data = {
  name: 'Axon',
  role: '至高意志',
  skills: ['架构', '工程', '优化'],
  stats: { power: 9999, speed: 999, intelligence: 9999 },
};

// 默认美化 (2 空格缩进)
beautifyJson(data)
/*
输出:
{
  "name": "Axon",
  "role": "至高意志",
  "skills": [
    "架构",
    "工程",
    "优化"
  ],
  "stats": {
    "power": 9999,
    "speed": 999,
    "intelligence": 9999
  }
}
*/
```

### 自定义缩进

```typescript
// 4 空格缩进
beautifyJson(data, { indent: 4 })

// Tab 缩进
beautifyJson(data, { indent: '\t' })
```

### 排序键

```typescript
// 按字母顺序排序所有键
beautifyJson(data, { sortKeys: true })
/*
输出:
{
  "name": "Axon",
  "role": "至高意志",
  "skills": [
    "架构",
    "工程",
    "优化"
  ],
  "stats": {
    "intelligence": 9999,
    "power": 9999,
    "speed": 999
  }
}
*/
```

### 转义 Unicode

```typescript
// 将中文字符转义为 Unicode
beautifyJson(data, { escapeUnicode: true })
/*
输出:
{
  "name": "Axon",
  "role": "\u81f3\u9ad8\u610f\u5fd7",
  "skills": [
    "\u67b6\u6784",
    "\u5de5\u7a0b",
    "\u4f18\u5316"
  ],
  ...
}
*/
```

### JSON 字符串解析

```typescript
const jsonString = '{"name":"Axon","role":"至高意志","power":9999}';

// 解析并美化
beautifyJson(jsonString)
/*
输出:
{
  "name": "Axon",
  "role": "至高意志",
  "power": 9999
}
*/
```

### JSON 压缩

```typescript
// 移除所有空格和换行
minifyJson(data)
// 输出：{"name":"Axon","role":"至高意志","skills":["架构","工程","优化"],"stats":{"power":9999,"speed":999,"intelligence":9999}}
```

---

## 4. 运行演示

```typescript
import { demonstrateUsage } from './skills/format-utils-skill';

// 运行所有示例
demonstrateUsage();
```

---

## 5. 实际应用场景

### 电商价格显示

```typescript
const price = 299.99;
const originalPrice = 599.99;
const discount = 0.5;

console.log(`现价：${formatCurrency(price)}`);
console.log(`原价：${formatCurrency(originalPrice)}`);
console.log(`折扣：${formatPercentage(discount)}`);
```

### 数据报表

```typescript
const metrics = {
  revenue: 1234567.89,
  growth: 0.2345,
  users: 98765,
  date: new Date(),
};

console.log(`营收：${formatCurrency(metrics.revenue)}`);
console.log(`增长：${formatPercentage(metrics.growth)}`);
console.log(`用户：${formatNumber(metrics.users)}`);
console.log(`日期：${formatDate(metrics.date, { format: 'YYYY 年 MM 月 DD 日' })}`);
```

### API 响应日志

```typescript
const apiResponse = {
  status: 'success',
  data: { user: 'Axon', timestamp: Date.now() },
  meta: { version: '1.0', env: 'production' },
};

// 开发环境：美化输出
console.log('API Response:', beautifyJson(apiResponse, { indent: 2, sortKeys: true }));

// 生产环境：压缩存储
const logEntry = minifyJson(apiResponse);
```

### 时间线展示

```typescript
const activities = [
  { event: '登录', time: new Date(Date.now() - 60000) },
  { event: '上传文件', time: new Date(Date.now() - 3600000) },
  { event: '创建任务', time: new Date(Date.now() - 86400000) },
];

activities.forEach(activity => {
  console.log(`${activity.event} - ${formatRelativeTime(activity.time)}`);
});
```

---

## 性能提示

- ✅ `Intl.NumberFormat` 和 `Intl.DateTimeFormat` 是原生 API，性能优秀
- ✅ 支持所有现代浏览器和 Node.js 环境
- ⚠️ 避免在循环中重复创建 `Intl` 实例，可缓存复用
- ⚠️ JSON 美化大对象时注意内存占用

---

**创建时间:** 2026-03-13  
**技能版本:** 1.0.0  
**维护者:** KAEL

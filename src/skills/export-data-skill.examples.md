# 数据导出技能 - 使用示例

**文件:** `src/skills/export-data-skill.ts`  
**作者:** Axon  
**版本:** 1.0.0

---

## 📋 功能概览

1. **CSV/JSON/Excel 导出** - 支持多种格式
2. **大数据分页导出** - 支持分页处理大数据集
3. **导出进度追踪** - 实时追踪导出进度和状态

---

## 🚀 快速开始

### 基础导入

```typescript
import exportSkill, {
  exportArrayData,
  exportPaginatedData,
  exportToCSV,
  exportToJSON,
  exportToExcel,
  getTaskStatus,
  type ExportConfig,
  type ExportFormat,
} from './src/skills/export-data-skill';
```

---

## 📝 使用示例

### 示例 1: 快速导出为 CSV

```typescript
import { exportToCSV } from './src/skills/export-data-skill';

const users = [
  { id: 1, name: '张三', email: 'zhangsan@example.com', age: 28 },
  { id: 2, name: '李四', email: 'lisi@example.com', age: 32 },
  { id: 3, name: '王五', email: 'wangwu@example.com', age: 25 },
];

async function main() {
  const result = await exportToCSV(users, './exports/users.csv');
  
  console.log('导出完成:', result);
  // 输出:
  // {
  //   taskId: "export_1710345678901_abc123def",
  //   status: "completed",
  //   outputPath: "./exports/users.csv",
  //   exportedRecords: 3,
  //   exportTime: 45,
  //   fileSize: 256
  // }
}

main();
```

**生成的 CSV 文件:**
```csv
id,name,email,age
1,张三，zhangsan@example.com,28
2,李四，lisi@example.com,32
3,王五，wangwu@example.com,25
```

---

### 示例 2: 导出为 JSON (指定字段)

```typescript
import { exportToJSON } from './src/skills/export-data-skill';

const products = [
  { id: 1, name: 'iPhone 15', price: 7999, category: '手机', stock: 100 },
  { id: 2, name: 'MacBook Pro', price: 14999, category: '电脑', stock: 50 },
  { id: 3, name: 'AirPods Pro', price: 1999, category: '配件', stock: 200 },
];

async function main() {
  const result = await exportToJSON(products, './exports/products.json', {
    fields: ['id', 'name', 'price'], // 只导出指定字段
  });
  
  console.log('导出完成:', result);
}

main();
```

**生成的 JSON 文件:**
```json
[
  {
    "id": 1,
    "name": "iPhone 15",
    "price": 7999
  },
  {
    "id": 2,
    "name": "MacBook Pro",
    "price": 14999
  },
  {
    "id": 3,
    "name": "AirPods Pro",
    "price": 1999
  }
]
```

---

### 示例 3: 导出为 Excel

```typescript
import { exportToExcel } from './src/skills/export-data-skill';

const orders = [
  { orderId: 'ORD001', customer: '张三', amount: 299.00, date: '2024-03-01' },
  { orderId: 'ORD002', customer: '李四', amount: 599.00, date: '2024-03-02' },
  { orderId: 'ORD003', customer: '王五', amount: 1299.00, date: '2024-03-03' },
];

async function main() {
  const result = await exportToExcel(orders, './exports/orders.xlsx', {
    sheetName: '订单列表',
  });
  
  console.log('导出完成:', result);
}

main();
```

---

### 示例 4: 自定义配置的数组导出

```typescript
import { exportArrayData } from './src/skills/export-data-skill';

const data = [
  { id: 1, name: 'Item 1', value: 100 },
  { id: 2, name: 'Item 2', value: 200 },
  // ... 更多数据
];

async function main() {
  const result = await exportArrayData(
    { data },
    {
      format: 'csv',
      outputPath: './exports/custom.csv',
      pageSize: 500,           // 分页大小
      fields: ['id', 'name'],  // 只导出这些字段
      csvDelimiter: ';',       // 使用分号分隔 (欧洲格式)
      includeHeader: true,     // 包含表头
      onProgress: (taskId, progress) => {
        console.log(`进度：${progress.percentage}% (${progress.current}/${progress.total})`);
      },
      onStatusChange: (taskId, status) => {
        console.log(`状态变更：${status}`);
      },
    }
  );
  
  console.log('导出完成:', result);
}

main();
```

---

### 示例 5: 大数据分页导出 (API 数据源)

```typescript
import { exportPaginatedData, type PaginatedDataSource } from './src/skills/export-data-skill';

// 模拟 API 数据源
const apiDataSource: PaginatedDataSource = {
  async getPage(page: number, pageSize: number) {
    // 模拟 API 调用
    const response = await fetch(`https://api.example.com/users?page=${page}&size=${pageSize}`);
    const result = await response.json();
    
    return {
      data: result.users,
      total: result.total,
      hasMore: page < result.totalPages - 1,
    };
  },
  
  async getTotalCount() {
    const response = await fetch('https://api.example.com/users/count');
    const result = await response.json();
    return result.count;
  },
};

async function main() {
  const result = await exportPaginatedData(apiDataSource, {
    format: 'csv',
    outputPath: './exports/all_users.csv',
    pageSize: 1000,  // 每页 1000 条
    fields: ['id', 'name', 'email', 'createdAt'],
    onProgress: (taskId, progress) => {
      const eta = progress.estimatedRemainingSeconds;
      console.log(
        `导出进度：${progress.percentage}% | ` +
        `已处理：${progress.current}/${progress.total} | ` +
        `预计剩余：${eta || '?'}秒`
      );
    },
  });
  
  console.log('大数据导出完成:', result);
}

main();
```

---

### 示例 6: 数据库查询分页导出

```typescript
import { exportPaginatedData, type PaginatedDataSource } from './src/skills/export-data-skill';
import { db } from './db/connection'; // 假设的数据库连接

// 数据库数据源
const dbDataSource: PaginatedDataSource = {
  async getPage(page: number, pageSize: number) {
    const offset = page * pageSize;
    
    const [rows] = await db.execute(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    
    const [[countResult]] = await db.execute(`SELECT COUNT(*) as total FROM orders`);
    
    return {
      data: rows,
      total: countResult.total,
      hasMore: offset + pageSize < countResult.total,
    };
  },
  
  async getTotalCount() {
    const [[result]] = await db.execute(`SELECT COUNT(*) as total FROM orders`);
    return result.total;
  },
};

async function exportOrders() {
  const result = await exportPaginatedData(dbDataSource, {
    format: 'excel',
    outputPath: './exports/orders_2024.xlsx',
    pageSize: 500,
    sheetName: '2024 订单',
    onProgress: (taskId, progress) => {
      console.log(`正在导出订单：${progress.percentage}%`);
    },
  });
  
  if (result.status === 'completed') {
    console.log(`✅ 导出成功！文件：${result.outputPath}`);
    console.log(`📊 导出记录：${result.exportedRecords} 条`);
    console.log(`⏱️  耗时：${result.exportTime}ms`);
    console.log(`📦 文件大小：${(result.fileSize! / 1024).toFixed(2)} KB`);
  } else {
    console.error(`❌ 导出失败：${result.error}`);
  }
}

exportOrders();
```

---

### 示例 7: 进度追踪与任务管理

```typescript
import {
  exportArrayData,
  getTaskStatus,
  getAllTasks,
  cancelTask,
  cleanupTasks,
} from './src/skills/export-data-skill';

async function main() {
  // 启动导出任务
  const result = await exportArrayData(
    { data: largeDataset },
    {
      format: 'csv',
      outputPath: './exports/large.csv',
      onProgress: (taskId, progress) => {
        console.log(`任务 ${taskId} 进度：${progress.percentage}%`);
      },
    }
  );
  
  const taskId = result.taskId;
  
  // 查询任务状态
  const task = getTaskStatus(taskId);
  if (task) {
    console.log('任务状态:', task.status);
    console.log('进度:', task.progress);
  }
  
  // 获取所有任务
  const allTasks = getAllTasks();
  console.log('所有任务:', allTasks.map(t => ({
    id: t.id,
    status: t.status,
    progress: `${t.progress.percentage}%`,
  })));
  
  // 取消任务 (如果还在处理中)
  if (task?.status === 'processing') {
    const cancelled = cancelTask(taskId);
    console.log('任务已取消:', cancelled);
  }
  
  // 清理旧任务 (超过 24 小时的已完成任务)
  const cleaned = cleanupTasks(24);
  console.log(`清理了 ${cleaned} 个旧任务`);
}

main();
```

---

### 示例 8: 嵌套字段导出

```typescript
import { exportToCSV } from './src/skills/export-data-skill';

const users = [
  {
    id: 1,
    name: '张三',
    profile: {
      age: 28,
      city: '北京',
      company: {
        name: '科技公司',
        position: '工程师',
      },
    },
  },
  {
    id: 2,
    name: '李四',
    profile: {
      age: 32,
      city: '上海',
      company: {
        name: '金融公司',
        position: '分析师',
      },
    },
  },
];

async function main() {
  const result = await exportToCSV(users, './exports/users_nested.csv', {
    fields: [
      'id',
      'name',
      'profile.age',
      'profile.city',
      'profile.company.name',
      'profile.company.position',
    ],
  });
  
  console.log('导出完成:', result);
}

main();
```

**生成的 CSV 文件:**
```csv
id,name,profile.age,profile.city,profile.company.name,profile.company.position
1,张三，28,北京，科技公司，工程师
2,李四，32,上海，金融公司，分析师
```

---

### 示例 9: 带进度条的命令行导出

```typescript
import { exportPaginatedData, type PaginatedDataSource } from './src/skills/export-data-skill';

// 创建进度条
function createProgressBar(current: number, total: number, width: number = 40): string {
  const percentage = current / total;
  const filledWidth = Math.round(percentage * width);
  const emptyWidth = width - filledWidth;
  
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  
  return `[${filled}${empty}] ${(percentage * 100).toFixed(1)}%`;
}

async function exportWithProgress() {
  const dataSource: PaginatedDataSource = {
    async getPage(page: number, pageSize: number) {
      // 模拟慢速 API
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const start = page * pageSize;
      const end = Math.min(start + pageSize, 10000);
      const data = Array.from({ length: end - start }, (_, i) => ({
        id: start + i + 1,
        name: `User ${start + i + 1}`,
      }));
      
      return {
        data,
        total: 10000,
        hasMore: end < 10000,
      };
    },
  };
  
  const result = await exportPaginatedData(dataSource, {
    format: 'csv',
    outputPath: './exports/users_10k.csv',
    pageSize: 500,
    onProgress: (taskId, progress) => {
      const bar = createProgressBar(progress.current, progress.total);
      const eta = progress.estimatedRemainingSeconds || 0;
      
      // 清除当前行并打印新进度
      process.stdout.write(`\r${bar} | ${progress.current}/${progress.total} | 剩余：${eta}s   `);
    },
  });
  
  console.log('\n导出完成!');
  console.log('结果:', result);
}

exportWithProgress();
```

---

### 示例 10: 错误处理与重试

```typescript
import { exportPaginatedData, type PaginatedDataSource } from './src/skills/export-data-skill';

async function exportWithRetry(
  dataSource: PaginatedDataSource,
  config: any,
  maxRetries: number = 3
) {
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const result = await exportPaginatedData(dataSource, config);
      
      if (result.status === 'completed') {
        return result;
      }
      
      if (result.status === 'failed') {
        throw new Error(result.error);
      }
    } catch (error) {
      retryCount++;
      
      if (retryCount > maxRetries) {
        console.error(`导出失败，已重试 ${maxRetries} 次`);
        throw error;
      }
      
      const waitTime = Math.pow(2, retryCount) * 1000; // 指数退避
      console.log(`导出失败，${waitTime / 1000}秒后重试 (${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// 使用
const unreliableDataSource: PaginatedDataSource = {
  async getPage(page: number, pageSize: number) {
    // 模拟不稳定的 API
    if (Math.random() < 0.2) {
      throw new Error('网络错误');
    }
    
    // 正常返回数据
    return {
      data: [{ id: page, name: `Item ${page}` }],
      total: 100,
      hasMore: page < 99,
    };
  },
};

exportWithRetry(unreliableDataSource, {
  format: 'csv',
  outputPath: './exports/retry_test.csv',
});
```

---

## 📊 API 参考

### 类型定义

```typescript
// 导出格式
type ExportFormat = 'csv' | 'json' | 'excel' | 'xlsx';

// 导出状态
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// 导出进度
interface ExportProgress {
  current: number;                    // 当前已处理条数
  total: number;                      // 总条数
  percentage: number;                 // 完成百分比 (0-100)
  startTime: number;                  // 开始时间
  estimatedRemainingSeconds?: number; // 预计剩余时间
  currentItem?: string;               // 当前处理项
}

// 导出配置
interface ExportConfig {
  format: ExportFormat;
  outputPath: string;
  pageSize?: number;              // 分页大小 (默认 1000)
  fields?: string[];              // 导出字段
  csvDelimiter?: string;          // CSV 分隔符 (默认 ',')
  includeHeader?: boolean;        // 包含表头 (默认 true)
  sheetName?: string;             // Excel 工作表名
  onProgress?: (taskId, progress) => void;
  onStatusChange?: (taskId, status) => void;
}

// 导出结果
interface ExportResult {
  taskId: string;
  status: ExportStatus;
  outputPath?: string;
  exportedRecords: number;
  exportTime: number;
  fileSize?: number;
  error?: string;
}
```

### 核心函数

| 函数 | 描述 | 参数 | 返回值 |
|------|------|------|--------|
| `exportArrayData` | 导出数组数据 | dataSource, config | Promise<ExportResult> |
| `exportPaginatedData` | 导出分页数据源 | dataSource, config | Promise<ExportResult> |
| `exportToCSV` | 快速导出 CSV | data, outputPath, options | Promise<ExportResult> |
| `exportToJSON` | 快速导出 JSON | data, outputPath, options | Promise<ExportResult> |
| `exportToExcel` | 快速导出 Excel | data, outputPath, options | Promise<ExportResult> |
| `getTaskStatus` | 获取任务状态 | taskId | ExportTask \| undefined |
| `getAllTasks` | 获取所有任务 | - | ExportTask[] |
| `cancelTask` | 取消任务 | taskId | boolean |
| `cleanupTasks` | 清理旧任务 | maxAgeHours | number |

---

## ⚠️ 注意事项

1. **内存使用**: 对于超大数据集 (百万级), 建议使用分页导出
2. **Excel 格式**: 当前实现为简化版 XML 格式，生产环境建议使用 `xlsx` 库
3. **文件路径**: 确保输出目录存在或具有写入权限
4. **并发限制**: 避免同时启动过多导出任务
5. **进度回调**: 进度回调可能频繁触发，注意性能影响

---

## 🎯 最佳实践

1. **始终使用分页**: 即使数据量不大，也建议使用分页模式
2. **监控进度**: 对于长时间任务，添加进度回调
3. **错误处理**: 捕获并记录导出错误
4. **定期清理**: 使用 `cleanupTasks` 清理旧任务记录
5. **字段过滤**: 只导出需要的字段，减少文件大小

---

**创建时间:** 2024-03-13  
**最后更新:** 2024-03-13

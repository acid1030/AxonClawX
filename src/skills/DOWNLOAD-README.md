# 文件下载工具技能 (Download Utils)

**位置:** `src/skills/download-utils-skill.ts`  
**示例:** `src/skills/download-utils-examples.ts`

---

## 📋 功能特性

### ✅ 核心功能

1. **断点续传** - 支持中断后继续下载，无需重新开始
2. **多线程下载** - 并发下载提升速度，最多支持 32 线程
3. **进度追踪** - 实时下载进度、速度、剩余时间监控

### 🎯 附加特性

- 自动重试机制 (可配置重试次数)
- 超时保护 (可配置超时时间)
- 暂停/恢复/取消控制
- 详细的进度回调
- 字节/时间格式化工具函数

---

## 🚀 快速开始

### 基础用法

```typescript
import { downloadFile } from './download-utils-skill';

await downloadFile(
  'https://example.com/file.zip',
  './downloads/file.zip'
);
```

### 带进度追踪

```typescript
import { downloadFile, formatBytes, formatTime } from './download-utils-skill';

await downloadFile('https://example.com/file.zip', './file.zip', {
  onProgress: (progress) => {
    console.log(
      `进度：${progress.percentage.toFixed(2)}% | ` +
      `速度：${formatBytes(progress.speedBytesPerSec)}/s | ` +
      `剩余：${formatTime(progress.etaSeconds)}`
    );
  },
  onComplete: () => console.log('下载完成!'),
  onError: (error) => console.error('下载失败:', error)
});
```

### 多线程加速

```typescript
await downloadFile('https://example.com/large-file.zip', './file.zip', {
  threads: 16,              // 16 个并发线程
  minChunkSize: 512 * 1024, // 每个分片最小 512KB
  retries: 5,               // 失败重试 5 次
  timeout: 60000            // 60 秒超时
});
```

---

## 📖 API 文档

### downloadFile()

下载文件的主函数。

```typescript
async function downloadFile(
  url: string,
  destPath: string,
  options?: DownloadOptions
): Promise<void>
```

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | `string` | ✅ | 文件下载 URL |
| `destPath` | `string` | ✅ | 目标文件路径 |
| `options` | `DownloadOptions` | ❌ | 下载配置选项 |

**DownloadOptions 配置:**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `threads` | `number` | `4` | 并发线程数 (1-32) |
| `minChunkSize` | `number` | `1048576` | 单个分片最小字节数 (1MB) |
| `retries` | `number` | `3` | 失败重试次数 |
| `timeout` | `number` | `30000` | 请求超时时间 (毫秒) |
| `onProgress` | `function` | - | 进度回调函数 |
| `onComplete` | `function` | - | 完成回调函数 |
| `onError` | `function` | - | 错误回调函数 |

**DownloadProgress 进度对象:**

```typescript
interface DownloadProgress {
  downloadedBytes: number;    // 已下载字节数
  totalBytes: number;         // 总字节数
  percentage: number;         // 进度百分比 (0-100)
  speedBytesPerSec: number;   // 下载速度 (字节/秒)
  etaSeconds: number;         // 预计剩余时间 (秒)
  status: DownloadStatus;     // 当前状态
}
```

**DownloadStatus 状态枚举:**

```typescript
enum DownloadStatus {
  PENDING = 'pending',        // 等待中
  DOWNLOADING = 'downloading', // 下载中
  PAUSED = 'paused',          // 已暂停
  COMPLETED = 'completed',    // 已完成
  FAILED = 'failed',          // 失败
  CANCELLED = 'cancelled'     // 已取消
}
```

---

### createDownloadManager()

创建下载管理器实例，用于更精细的控制 (暂停/恢复/取消)。

```typescript
function createDownloadManager(
  url: string,
  destPath: string,
  options?: DownloadOptions
): DownloadManager
```

**DownloadManager 方法:**

| 方法 | 说明 |
|------|------|
| `start()` | 开始下载 |
| `pause()` | 暂停下载 |
| `resume()` | 恢复下载 |
| `cancel()` | 取消下载 |
| `getProgress()` | 获取当前进度 |

**示例:**

```typescript
const manager = createDownloadManager(url, destPath);

// 启动下载
manager.start();

// 暂停
manager.pause();

// 恢复
manager.resume();

// 取消
manager.cancel();

// 获取进度
const progress = manager.getProgress();
```

---

### 工具函数

#### formatBytes()

格式化字节数为人类可读格式。

```typescript
function formatBytes(bytes: number): string

formatBytes(500)           // "500.00 B"
formatBytes(1536)          // "1.50 KB"
formatBytes(2621440)       // "2.50 MB"
formatBytes(1288490188)    // "1.20 GB"
```

#### formatTime()

格式化秒数为人类可读格式。

```typescript
function formatTime(seconds: number): string

formatTime(30)    // "30 秒"
formatTime(90)    // "1 分 30 秒"
formatTime(3665)  // "1 小时 1 分 5 秒"
```

---

## 💡 使用场景

### 1. 下载大文件

```typescript
await downloadFile('https://cdn.example.com/ubuntu-24.04.iso', './ubuntu.iso', {
  threads: 32,
  minChunkSize: 2 * 1024 * 1024,
  onProgress: (progress) => {
    console.log(`下载进度：${progress.percentage.toFixed(2)}%`);
  }
});
```

### 2. 批量下载

```typescript
const files = [
  { url: 'https://example.com/file1.zip', path: './file1.zip' },
  { url: 'https://example.com/file2.zip', path: './file2.zip' },
];

await Promise.all(
  files.map(file => 
    downloadFile(file.url, file.path, {
      onProgress: (progress) => {
        console.log(`${file.path}: ${progress.percentage.toFixed(2)}%`);
      }
    })
  )
);
```

### 3. 不稳定网络环境

```typescript
await downloadFile('https://example.com/file.zip', './file.zip', {
  threads: 8,
  retries: 10,          // 多次重试
  timeout: 120000,      // 2 分钟超时
  onProgress: (progress) => {
    // 显示进度
  },
  onError: (error) => {
    console.error('下载失败，但支持断点续传:', error);
  }
});
```

### 4. 用户可控制的下载

```typescript
const manager = createDownloadManager(url, destPath, {
  threads: 4,
  onProgress: (progress) => {
    updateUI(progress);
  }
});

// UI 按钮事件
startButton.onclick = () => manager.start();
pauseButton.onclick = () => manager.pause();
resumeButton.onclick = () => manager.resume();
cancelButton.onclick = () => manager.cancel();
```

---

## 🔧 高级配置

### 调整线程数

线程数应根据网络带宽和服务器限制调整:

- **低速网络** (1-10 Mbps): 2-4 线程
- **中速网络** (10-100 Mbps): 4-8 线程
- **高速网络** (100+ Mbps): 8-16 线程
- **千兆网络**: 16-32 线程

### 调整分片大小

分片大小影响并发效率:

- **小文件** (< 10MB): 使用默认值或更小 (256KB)
- **中等文件** (10-100MB): 512KB - 1MB
- **大文件** (100MB-1GB): 1-2MB
- **超大文件** (> 1GB): 2-4MB

### 重试策略

根据网络稳定性调整:

- **稳定网络**: 2-3 次重试
- **一般网络**: 5 次重试
- **不稳定网络**: 10 次重试

---

## ⚠️ 注意事项

1. **断点续传依赖元数据文件** - 下载过程中会生成 `.download.meta` 文件，请勿删除
2. **临时文件** - 下载过程中会生成 `.download.part` 临时文件，完成后自动删除
3. **服务器支持** - 断点续传需要服务器支持 `Range` 请求头
4. **线程数限制** - 过多的线程可能导致服务器拒绝连接
5. **磁盘空间** - 确保目标磁盘有足够的可用空间

---

## 📝 完整示例

参考 `src/skills/download-utils-examples.ts` 查看完整示例:

- ✅ 基础下载
- ✅ 带进度追踪
- ✅ 多线程下载
- ✅ 可控下载 (暂停/恢复/取消)
- ✅ 断点续传演示
- ✅ 批量下载
- ✅ 大文件下载
- ✅ 工具函数演示

---

## 🎯 性能优化建议

1. **根据网络调整线程数** - 不是越多越好
2. **合理设置分片大小** - 平衡并发效率和管理开销
3. **使用进度回调节流** - 避免频繁更新 UI
4. **批量下载限速** - 避免同时下载过多文件

---

## 📄 许可证

MIT License

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0

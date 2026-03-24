# Upload Utils Skill - 文件上传工具

快速、可靠的文件上传解决方案，支持文件验证、分片上传和进度追踪。

## 🚀 快速开始

### 基础上传

```typescript
import { uploadFile } from './upload-utils-skill';

const result = await uploadFile(file, 'https://api.example.com/upload', {
  onProgress: (progress) => {
    console.log(`进度：${progress.percentage.toFixed(1)}%`);
  },
});
```

### 文件验证

```typescript
import { validateFile } from './upload-utils-skill';

const result = await validateFile(file, {
  allowedTypes: ['image/jpeg', 'image/png'],
  maxSize: 10 * 1024 * 1024, // 10MB
  namePattern: /^[a-z0-9_-]+\.(jpg|png)$/i,
});

if (result.valid) {
  console.log('✓ 验证通过');
} else {
  console.log('✗ 验证失败:', result.errors);
}
```

### 高级控制 (暂停/恢复/取消)

```typescript
import { createUploadManager } from './upload-utils-skill';

const manager = createUploadManager();
const task = manager.createUpload(file, {
  endpoint: 'https://api.example.com/upload',
  chunkSize: 5 * 1024 * 1024,
  concurrentChunks: 3,
  enableResume: true,
});

// 控制上传
await manager.startUpload(task.id);
task.pause();    // 暂停
task.resume();   // 恢复
task.cancel();   // 取消
task.retry();    // 重试
```

## 📋 功能特性

### 1. 文件验证 ✅
- ✅ 文件类型检查 (MIME types)
- ✅ 文件扩展名验证
- ✅ 文件大小限制
- ✅ 文件名格式验证
- ✅ 自定义验证规则

### 2. 分片上传 📦
- ✅ 自动分片 (默认 5MB)
- ✅ 并发上传 (默认 3 个分片)
- ✅ 失败重试 (指数退避)
- ✅ 断点续传
- ✅ 动态调整分片大小

### 3. 进度追踪 📊
- ✅ 实时进度百分比
- ✅ 上传速度计算
- ✅ 剩余时间估算
- ✅ 分片状态追踪
- ✅ 状态变化回调

## 🔧 配置选项

```typescript
interface UploadConfig {
  endpoint: string;              // 上传 API 端点
  chunkSize?: number;            // 分片大小 (默认 5MB)
  concurrentChunks?: number;     // 并发分片数 (默认 3)
  maxRetries?: number;           // 失败重试次数 (默认 3)
  timeout?: number;              // 超时时间 (默认 30000ms)
  headers?: Record<string, string>; // 额外请求头
  enableResume?: boolean;        // 启用断点续传 (默认 true)
  validationRules?: FileValidationRules; // 验证规则
  onProgress?: (progress) => void;       // 进度回调
  onStatusChange?: (status) => void;     // 状态回调
  onError?: (error) => void;             // 错误回调
  onComplete?: (result) => void;         // 完成回调
}
```

## 📊 进度信息

```typescript
interface UploadProgress {
  total: number;          // 总字节数
  uploaded: number;       // 已上传字节数
  percentage: number;     // 百分比 (0-100)
  chunksUploaded: number; // 已上传分片数
  totalChunks: number;    // 总分片数
  speed?: number;         // 上传速度 (bytes/s)
  eta?: number;           // 剩余时间 (秒)
  status: UploadStatus;   // 当前状态
}
```

## 🎯 常用 MIME 类型预设

```typescript
import { COMMON_MIME_TYPES } from './upload-utils-skill';

// 图片
COMMON_MIME_TYPES.image 
// ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']

// 文档
COMMON_MIME_TYPES.document
// ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md']

// 代码
COMMON_MIME_TYPES.code
// ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', ...]
```

## 💡 最佳实践

### 1. 大文件上传优化

```typescript
// 根据文件大小动态调整分片
const chunkSize = file.size < 10 * 1024 * 1024 
  ? 1 * 1024 * 1024   // < 10MB: 1MB 分片
  : file.size < 100 * 1024 * 1024
  ? 5 * 1024 * 1024   // < 100MB: 5MB 分片
  : 10 * 1024 * 1024; // >= 100MB: 10MB 分片
```

### 2. 网络自适应

```typescript
// 根据网络状况调整并发数
const connection = (navigator as any).connection;
const concurrency = connection?.effectiveType === '3g' ? 2 : 4;
```

### 3. 错误处理

```typescript
try {
  const result = await uploadFile(file, endpoint, config);
} catch (error) {
  if (error.code === 'VALIDATION_FAILED') {
    // 验证失败
  } else if (error.code === 'UPLOAD_FAILED') {
    // 上传失败，可重试
    task.retry();
  }
}
```

## 📁 文件结构

```
src/skills/
├── upload-utils-skill.ts          # 核心实现
├── upload-utils-skill.examples.ts # 使用示例
└── upload-utils-skill.readme.md   # 本文档
```

## 🔗 相关资源

- 完整示例：`upload-utils-skill.examples.ts`
- 类型定义：见 `upload-utils-skill.ts` 顶部
- API 端点实现：需配合后端分片上传接口

## ⚠️ 注意事项

1. **浏览器兼容性**: 需要支持 Fetch API 和 Blob
2. **CORS 配置**: 确保后端允许跨域上传
3. **HTTPS**: 生产环境建议使用 HTTPS
4. **文件大小**: 超大文件 (>1GB) 建议先压缩
5. **Node.js 支持**: 当前主要针对浏览器，Node.js 需额外适配

---

**版本:** 1.0.0  
**作者:** AxonClaw  
**许可:** MIT

# File Upload Middleware

多文件上传中间件，支持文件大小限制、类型过滤和进度跟踪。

## 功能特性

- ✅ **多文件上传** - 同时上传多个文件
- ✅ **文件大小限制** - 单个文件和总大小限制
- ✅ **文件类型过滤** - 白名单/黑名单机制
- ✅ **上传进度跟踪** - 实时进度事件
- ✅ **会话管理** - 每个上传请求独立会话
- ✅ **预定义配置** - 图片/文档/视频专用配置

## 快速开始

### 基础用法

```typescript
import { createFileUpload } from './middleware/file-upload';

const upload = createFileUpload({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  uploadDir: './uploads',
});

// Express 中间件
app.post('/api/upload', upload.middleware(), (req, res) => {
  res.json({ files: req.files });
});
```

### 使用预定义配置

```typescript
import { createFileUpload, presets } from './middleware/file-upload';

// 图片上传
const imageUpload = createFileUpload(presets.images);

// 文档上传
const docUpload = createFileUpload(presets.documents);

// 视频上传
const videoUpload = createFileUpload(presets.videos);
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxFileSize` | number | 10MB | 单个文件最大大小 (字节) |
| `maxTotalSize` | number | 50MB | 总上传大小限制 (字节) |
| `allowedTypes` | string[] | [] | 允许的文件类型 (MIME 或扩展名) |
| `blockedTypes` | string[] | [] | 禁止的文件类型 |
| `maxFiles` | number | 10 | 最大文件数量 |
| `uploadDir` | string | './uploads' | 上传目录 |
| `keepOriginalName` | boolean | false | 是否保留原始文件名 |
| `tempFileCleanupMs` | number | 3600000 | 临时文件清理时间 (毫秒) |

## 预定义配置

### `presets.images`
- 最大文件大小：5MB
- 最大总大小：20MB
- 最多文件数：5
- 允许类型：JPEG, PNG, GIF, WebP

### `presets.documents`
- 最大文件大小：10MB
- 最大总大小：50MB
- 最多文件数：10
- 允许类型：PDF, DOC, DOCX, TXT, CSV

### `presets.videos`
- 最大文件大小：100MB
- 最大总大小：500MB
- 最多文件数：3
- 允许类型：MP4, WebM

### `presets.general`
- 最大文件大小：20MB
- 最大总大小：100MB
- 最多文件数：10
- 黑名单：EXE, BAT, SH 等可执行文件

## 上传进度监听

```typescript
const session = upload.createSession('my-upload');

session.on('start', (totalBytes, totalFiles) => {
  console.log(`开始上传：${totalFiles} 个文件`);
});

session.on('progress', (progress) => {
  console.log(`进度：${progress.percentage}%`);
  // progress: {
  //   uploadedBytes, totalBytes, percentage,
  //   uploadedFiles, totalFiles, currentFile
  // }
});

session.on('fileComplete', (file) => {
  console.log(`文件完成：${file.originalName}`);
});

session.on('complete', (files) => {
  console.log(`上传完成：${files.length} 个文件`);
});

session.on('error', (error) => {
  console.error(`错误：${error.type} - ${error.message}`);
});

await upload.parseMultipartRequest(req, session);
```

## 错误类型

```typescript
enum UploadErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',      // 文件过大
  TOTAL_SIZE_EXCEEDED = 'TOTAL_SIZE_EXCEEDED', // 总大小超限
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',     // 无效文件类型
  BLOCKED_FILE_TYPE = 'BLOCKED_FILE_TYPE',     // 被阻止的类型
  TOO_MANY_FILES = 'TOO_MANY_FILES',           // 文件数量超限
  NO_FILES_UPLOADED = 'NO_FILES_UPLOADED',     // 未上传文件
  UPLOAD_FAILED = 'UPLOAD_FAILED',             // 上传失败
  DISK_FULL = 'DISK_FULL',                     // 磁盘已满
  INVALID_REQUEST = 'INVALID_REQUEST',         // 无效请求
}
```

## 前端示例 (React)

```tsx
import React, { useState } from 'react';

export function FileUpload() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  };

  return (
    <div>
      <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} />
      <button onClick={handleUpload}>上传</button>
      {progress > 0 && <progress value={progress} max="100">{progress}%</progress>}
    </div>
  );
}
```

## API 参考

### `createFileUpload(config)`
创建文件上传中间件实例

### `upload.middleware()`
返回 Express/Koa 中间件函数

### `upload.createSession(sessionId?)`
创建上传会话，用于跟踪进度

### `upload.getSession(sessionId)`
获取现有会话

### `upload.parseMultipartRequest(req, session)`
解析 multipart 请求并上传文件

## 注意事项

1. **生产环境建议**：使用 `busboy` 或 `multer` 处理大文件流式上传
2. **安全性**：始终验证文件类型，不要仅依赖扩展名
3. **存储**：考虑使用云存储 (S3, OSS) 而非本地文件系统
4. **清理**：定期清理临时文件和过期上传

## 相关文件

- `file-upload.ts` - 核心实现
- `file-upload.example.ts` - 使用示例
- `file-upload.md` - 本文档

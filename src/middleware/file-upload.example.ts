/**
 * File Upload Middleware - Usage Examples
 * 
 * 展示如何使用 file-upload 中间件
 * 
 * @author Axon
 */

import { createFileUpload, presets, UploadError } from './file-upload';

// ============================================
// 示例 1: 基础用法
// ============================================

const upload = createFileUpload({
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 50 * 1024 * 1024, // 50MB
  maxFiles: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  uploadDir: './uploads',
  keepOriginalName: false,
});

// 在 Express 中使用
function expressExample() {
  const express = require('express');
  const app = express();

  app.post('/api/upload', upload.middleware(), (req: any, res: any) => {
    // req.files 包含上传的文件信息
    res.json({
      success: true,
      files: req.files,
      session: req.uploadSession.getProgress(),
    });
  });

  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}

// ============================================
// 示例 2: 使用预定义配置
// ============================================

function presetExample() {
  // 图片上传配置
  const imageUpload = createFileUpload(presets.images);
  
  // 文档上传配置
  const docUpload = createFileUpload(presets.documents);
  
  // 视频上传配置
  const videoUpload = createFileUpload(presets.videos);

  const express = require('express');
  const app = express();

  app.post('/api/upload/images', imageUpload.middleware(), (req: any, res: any) => {
    res.json({ files: req.files });
  });

  app.post('/api/upload/documents', docUpload.middleware(), (req: any, res: any) => {
    res.json({ files: req.files });
  });

  app.post('/api/upload/videos', videoUpload.middleware(), (req: any, res: any) => {
    res.json({ files: req.files });
  });
}

// ============================================
// 示例 3: 监听上传进度
// ============================================

async function progressExample(req: any) {
  const session = upload.createSession('my-upload-session');

  // 监听进度事件
  session.on('start', (totalBytes, totalFiles) => {
    console.log(`开始上传：${totalFiles} 个文件，总计 ${totalBytes} 字节`);
  });

  session.on('progress', (progress) => {
    console.log(
      `进度：${progress.percentage}% (${progress.uploadedFiles}/${progress.totalFiles})`
    );
    // 可以通过 WebSocket 推送给前端
    // websocket.send(JSON.stringify({ type: 'upload-progress', data: progress }));
  });

  session.on('fileComplete', (file) => {
    console.log(`文件完成：${file.originalName}`);
  });

  session.on('complete', (files) => {
    console.log(`上传完成：${files.length} 个文件`);
  });

  session.on('error', (error) => {
    console.error(`上传错误：${error.type} - ${error.message}`);
  });

  try {
    const files = await upload.parseMultipartRequest(req, session);
    return { success: true, files };
  } catch (error) {
    if (error instanceof UploadError) {
      return {
        success: false,
        error: error.type,
        message: error.message,
      };
    }
    throw error;
  }
}

// ============================================
// 示例 4: 自定义文件验证
// ============================================

function customValidationExample() {
  const customUpload = createFileUpload({
    maxFileSize: 5 * 1024 * 1024,
    maxFiles: 3,
    allowedTypes: ['.jpg', '.png', '.gif'],
  });

  const express = require('express');
  const app = express();

  app.post('/api/upload/avatar', (req: any, res: any, next: any) => {
    // 先执行上传中间件
    customUpload.middleware()(req, res, async () => {
      try {
        // 自定义验证：检查是否是正方形图片
        for (const file of req.files) {
          // 这里可以添加图片尺寸检查等逻辑
          // const dimensions = await getImageDimensions(file.path);
          // if (dimensions.width !== dimensions.height) {
          //   throw new UploadError('INVALID_DIMENSIONS', 'Avatar must be square');
          // }
        }

        res.json({
          success: true,
          message: '头像上传成功',
          files: req.files,
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : '验证失败',
        });
      }
    });
  });
}

// ============================================
// 示例 5: 多文件分片上传
// ============================================

class ChunkedUploadHandler {
  private upload: ReturnType<typeof createFileUpload>;
  private chunks: Map<string, Buffer[]> = new Map();

  constructor() {
    this.upload = createFileUpload({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 1,
    });
  }

  /**
   * 处理分片上传
   */
  async handleChunk(req: any, res: any) {
    const { fileId, chunkIndex, totalChunks } = req.body;

    if (!this.chunks.has(fileId)) {
      this.chunks.set(fileId, []);
    }

    const fileChunks = this.chunks.get(fileId)!;
    fileChunks[chunkIndex] = req.file.buffer;

    // 检查是否所有分片都已上传
    if (fileChunks.filter(c => c).length === totalChunks) {
      // 合并所有分片
      const completeFile = Buffer.concat(fileChunks);
      
      // 清理临时数据
      this.chunks.delete(fileId);

      res.json({
        success: true,
        message: '文件合并完成',
        size: completeFile.length,
      });
    } else {
      res.json({
        success: true,
        message: `分片 ${chunkIndex + 1}/${totalChunks} 已接收`,
      });
    }
  }
}

// ============================================
// 示例 6: 与 WebSocket 结合实现实时进度
// ============================================

function websocketProgressExample() {
  const WebSocket = require('ws');
  const wss = new WebSocket.Server({ port: 8080 });

  const uploadSessions = new Map<string, any>();

  wss.on('connection', (ws: any) => {
    ws.on('message', (message: string) => {
      const data = JSON.parse(message);

      if (data.type === 'start-upload') {
        const session = upload.createSession(data.sessionId);
        uploadSessions.set(data.sessionId, { session, ws });

        // 监听进度并推送给客户端
        session.on('progress', (progress: any) => {
          ws.send(JSON.stringify({
            type: 'upload-progress',
            data: progress,
          }));
        });

        session.on('complete', (files: any[]) => {
          ws.send(JSON.stringify({
            type: 'upload-complete',
            data: { files },
          }));
          uploadSessions.delete(data.sessionId);
        });

        session.on('error', (error: any) => {
          ws.send(JSON.stringify({
            type: 'upload-error',
            data: { type: error.type, message: error.message },
          }));
          uploadSessions.delete(data.sessionId);
        });
      }
    });
  });

  // HTTP 端点处理实际上传
  const express = require('express');
  const app = express();

  app.post('/api/upload', (req: any, res: any) => {
    const sessionId = req.headers['x-upload-session'];
    const sessionData = uploadSessions.get(sessionId);

    if (!sessionData) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    upload.parseMultipartRequest(req, sessionData.session)
      .then(files => {
        res.json({ success: true, files });
      })
      .catch(error => {
        res.status(400).json({ error: error.message });
      });
  });
}

// ============================================
// 示例 7: React 前端上传组件
// ============================================

const reactExampleCode = `
import React, { useState, useCallback } from 'react';

interface FileWithProgress extends File {
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
}

export function FileUploadComponent() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const filesWithProgress: FileWithProgress[] = selectedFiles.map(file => ({
      ...file,
      progress: 0,
      status: 'pending',
    }));
    setFiles(prev => [...prev, ...filesWithProgress]);
  };

  const uploadFiles = useCallback(async () => {
    setIsUploading(true);
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });

    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setFiles(prev => prev.map(f => ({ ...f, progress, status: 'uploading' })));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        setFiles(prev => prev.map(f => ({ ...f, status: 'complete' })));
      } else {
        setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
      }
      setIsUploading(false);
    });

    xhr.addEventListener('error', () => {
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
      setIsUploading(false);
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  }, [files]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        accept="image/*,.pdf"
      />
      
      <div className="file-list">
        {files.map((file, index) => (
          <div key={index} className={\`file-item \${file.status}\`}>
            <span>{file.name}</span>
            <span>{(file.size / 1024).toFixed(2)} KB</span>
            {file.status === 'uploading' && (
              <progress value={file.progress} max="100">
                {file.progress}%
              </progress>
            )}
            <button onClick={() => removeFile(index)}>删除</button>
          </div>
        ))}
      </div>

      <button 
        onClick={uploadFiles} 
        disabled={isUploading || files.length === 0}
      >
        {isUploading ? '上传中...' : '开始上传'}
      </button>
    </div>
  );
}
`;

// ============================================
// 示例 8: 错误处理最佳实践
// ============================================

function errorHandlingExample() {
  const express = require('express');
  const app = express();

  const upload = createFileUpload(presets.general);

  app.post('/api/upload', upload.middleware(), (req: any, res: any) => {
    res.json({ success: true, files: req.files });
  });

  // 全局错误处理
  app.use((error: any, req: any, res: any, next: any) => {
    if (error instanceof UploadError) {
      const errorMessages: Record<string, string> = {
        [UploadErrorType.FILE_TOO_LARGE]: '文件过大，请上传小于 {size} 的文件',
        [UploadErrorType.TOTAL_SIZE_EXCEEDED]: '总文件大小超出限制',
        [UploadErrorType.INVALID_FILE_TYPE]: '不支持的文件类型',
        [UploadErrorType.BLOCKED_FILE_TYPE]: '禁止上传此类型文件',
        [UploadErrorType.TOO_MANY_FILES]: `最多只能上传 {count} 个文件`,
        [UploadErrorType.NO_FILES_UPLOADED]: '请选择要上传的文件',
      };

      const message = errorMessages[error.type] || error.message;
      
      res.status(error.code).json({
        success: false,
        error: {
          type: error.type,
          message: message.replace('{size}', '10MB').replace('{count}', '10'),
        },
      });
    } else {
      // 其他错误
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: '上传失败，请稍后重试',
        },
      });
    }
  });
}

// ============================================
// 导出所有示例
// ============================================

export {
  expressExample,
  presetExample,
  progressExample,
  customValidationExample,
  ChunkedUploadHandler,
  websocketProgressExample,
  reactExampleCode,
  errorHandlingExample,
};

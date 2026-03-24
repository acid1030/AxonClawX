/**
 * Upload Utils Skill - 使用示例
 * 
 * 演示文件上传工具的完整用法
 */

import {
  UploadManager,
  uploadFile,
  validateFile,
  createUploadManager,
  type UploadConfig,
  type FileValidationRules,
  type UploadProgress,
  type UploadResult,
  COMMON_MIME_TYPES,
  formatFileSize,
} from './upload-utils-skill';

// ============ 示例 1: 基础文件上传 ============

async function example1_basicUpload() {
  console.log('=== 示例 1: 基础文件上传 ===\n');

  // 假设有一个 File 对象 (浏览器环境)
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) {
    console.error('请选择文件');
    return;
  }

  try {
    const result = await uploadFile(file, 'https://api.example.com/upload', {
      chunkSize: 5 * 1024 * 1024, // 5MB 分片
      concurrentChunks: 3, // 并发 3 个分片
      maxRetries: 3, // 失败重试 3 次
      onProgress: (progress: UploadProgress) => {
        console.log(
          `上传进度：${progress.percentage.toFixed(2)}% ` +
          `(${formatFileSize(progress.uploaded)}/${formatFileSize(progress.total)})`
        );
      },
      onComplete: (result: UploadResult) => {
        console.log('上传完成!', result);
      },
    });

    console.log('上传成功:', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
}

// ============ 示例 2: 文件验证 ============

async function example2_fileValidation() {
  console.log('\n=== 示例 2: 文件验证 ===\n');

  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) return;

  // 定义验证规则
  const validationRules: FileValidationRules = {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
    maxSize: 10 * 1024 * 1024, // 10MB
    minSize: 1024, // 1KB
    namePattern: /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif)$/,
    allowEmpty: false,
    customValidate: async (file) => {
      // 自定义验证：检查文件名是否包含敏感词
      const sensitiveWords = ['test', 'temp', 'draft'];
      const hasSensitiveWord = sensitiveWords.some(word => 
        file.name.toLowerCase().includes(word)
      );
      
      if (hasSensitiveWord) {
        return '文件名不能包含敏感词';
      }
      return null;
    },
  };

  const result = await validateFile(file, validationRules);

  if (result.valid) {
    console.log('✓ 文件验证通过');
  } else {
    console.log('✗ 文件验证失败:');
    result.errors.forEach(error => {
      console.log(`  - ${error.code}: ${error.message}`);
    });
  }

  if (result.warnings) {
    console.log('⚠ 警告:');
    result.warnings.forEach(warning => {
      console.log(`  - ${warning.code}: ${warning.message}`);
    });
  }
}

// ============ 示例 3: 高级上传管理 (暂停/恢复/取消) ============

async function example3_advancedUpload() {
  console.log('\n=== 示例 3: 高级上传管理 ===\n');

  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) return;

  // 创建上传管理器
  const manager = createUploadManager({
    allowedTypes: ['image/*', 'video/*'],
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const config: UploadConfig = {
    endpoint: 'https://api.example.com/upload',
    chunkSize: 5 * 1024 * 1024,
    concurrentChunks: 3,
    maxRetries: 3,
    enableResume: true, // 启用断点续传
    onProgress: (progress: UploadProgress) => {
      // 更新 UI 进度条
      const progressBar = document.getElementById('progressBar') as HTMLProgressElement;
      const progressText = document.getElementById('progressText') as HTMLElement;
      
      if (progressBar) progressBar.value = progress.percentage;
      if (progressText) {
        progressText.textContent = `${progress.percentage.toFixed(1)}%`;
        
        if (progress.speed) {
          progressText.textContent += ` - ${formatFileSize(progress.speed)}/s`;
        }
        
        if (progress.eta && isFinite(progress.eta)) {
          progressText.textContent += ` - 剩余 ${Math.ceil(progress.eta)}s`;
        }
      }
    },
    onStatusChange: (status, progress) => {
      console.log(`状态变化：${status}`, progress);
      
      // 更新 UI 状态
      const statusElement = document.getElementById('uploadStatus');
      if (statusElement) {
        statusElement.textContent = `当前状态：${status}`;
      }
    },
    onError: (error) => {
      console.error('上传错误:', error);
      alert(`上传失败：${error.message}`);
    },
    onComplete: (result: UploadResult) => {
      console.log('上传完成:', result);
      alert(`上传成功！文件 ID: ${result.fileId}`);
    },
  };

  // 创建上传任务
  const task = manager.createUpload(file, config);

  // 绑定到 UI 按钮
  document.getElementById('btnStart')?.addEventListener('click', () => {
    manager.startUpload(task.id);
  });

  document.getElementById('btnPause')?.addEventListener('click', () => {
    task.pause();
  });

  document.getElementById('btnResume')?.addEventListener('click', () => {
    task.resume();
  });

  document.getElementById('btnCancel')?.addEventListener('click', () => {
    task.cancel();
  });

  document.getElementById('btnRetry')?.addEventListener('click', () => {
    task.retry();
  });

  console.log('上传任务已创建，点击按钮控制上传');
}

// ============ 示例 4: 多文件并发上传 ============

async function example4_multipleFiles() {
  console.log('\n=== 示例 4: 多文件并发上传 ===\n');

  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const files = fileInput.files;

  if (!files || files.length === 0) return;

  const manager = createUploadManager();
  const uploadPromises: Promise<UploadResult>[] = [];

  // 为每个文件创建上传任务
  Array.from(files).forEach((file, index) => {
    const config: UploadConfig = {
      endpoint: 'https://api.example.com/upload',
      chunkSize: 5 * 1024 * 1024,
      concurrentChunks: 2,
      onProgress: (progress: UploadProgress) => {
        console.log(`文件 ${index + 1}/${files.length} - ${file.name}: ${progress.percentage.toFixed(1)}%`);
      },
      onComplete: (result: UploadResult) => {
        console.log(`✓ ${file.name} 上传完成`);
      },
    };

    const task = manager.createUpload(file, config);
    uploadPromises.push(manager.startUpload(task.id));
  });

  try {
    const results = await Promise.all(uploadPromises);
    console.log(`\n所有文件上传完成，共 ${results.length} 个文件`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.fileName} (${formatFileSize(result.fileSize)})`);
    });
  } catch (error) {
    console.error('部分文件上传失败:', error);
  }
}

// ============ 示例 5: 大文件上传优化 ============

async function example5_largeFileOptimization() {
  console.log('\n=== 示例 5: 大文件上传优化 ===\n');

  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) return;

  // 根据文件大小动态调整分片大小
  let chunkSize: number;
  if (file.size < 10 * 1024 * 1024) {
    chunkSize = 1 * 1024 * 1024; // < 10MB: 1MB 分片
  } else if (file.size < 100 * 1024 * 1024) {
    chunkSize = 5 * 1024 * 1024; // < 100MB: 5MB 分片
  } else {
    chunkSize = 10 * 1024 * 1024; // >= 100MB: 10MB 分片
  }

  // 根据网络状况动态调整并发数
  const getOptimalConcurrency = (): number => {
    // 这里可以根据实际网络测试动态调整
    const connection = (navigator as any).connection;
    if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      return 1; // 慢速网络：单线程
    } else if (connection?.effectiveType === '3g') {
      return 2; // 3G: 2 并发
    } else {
      return 4; // 4G/WiFi: 4 并发
    }
  };

  const config: UploadConfig = {
    endpoint: 'https://api.example.com/upload',
    chunkSize,
    concurrentChunks: getOptimalConcurrency(),
    maxRetries: 5, // 大文件增加重试次数
    timeout: 60000, // 增加超时时间
    enableResume: true, // 必须启用断点续传
    headers: {
      'X-Upload-Type': 'chunked',
      'X-Client-Version': '1.0.0',
    },
    onProgress: (progress: UploadProgress) => {
      const eta = progress.eta && isFinite(progress.eta) 
        ? `${Math.ceil(progress.eta / 60)}分钟` 
        : '计算中...';
      
      console.log(
        `进度：${progress.percentage.toFixed(2)}% | ` +
        `速度：${formatFileSize(progress.speed || 0)}/s | ` +
        `剩余：${eta} | ` +
        `分片：${progress.chunksUploaded}/${progress.totalChunks}`
      );
    },
  };

  const manager = createUploadManager();
  const task = manager.createUpload(file, config);

  try {
    const result = await manager.startUpload(task.id);
    console.log('大文件上传完成:', result);
  } catch (error) {
    console.error('大文件上传失败:', error);
  }
}

// ============ 示例 6: 使用常用 MIME 类型 ============

async function example6_commonMimeTypes() {
  console.log('\n=== 示例 6: 使用常用 MIME 类型 ===\n');

  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (!file) return;

  // 只允许上传图片
  const imageOnlyRules: FileValidationRules = {
    allowedExtensions: COMMON_MIME_TYPES.image,
    maxSize: 5 * 1024 * 1024,
  };

  // 只允许上传文档
  const documentOnlyRules: FileValidationRules = {
    allowedExtensions: COMMON_MIME_TYPES.document,
    maxSize: 20 * 1024 * 1024,
  };

  // 只允许上传代码文件
  const codeOnlyRules: FileValidationRules = {
    allowedExtensions: COMMON_MIME_TYPES.code,
    maxSize: 1 * 1024 * 1024,
  };

  // 验证示例
  const result = await validateFile(file, imageOnlyRules);
  console.log('验证结果:', result);
}

// ============ 示例 7: 完整的 HTML 示例 ============

const htmlExample = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文件上传示例</title>
  <style>
    .upload-container {
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    .progress-bar {
      width: 100%;
      height: 20px;
      background-color: #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      margin: 10px 0;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      transition: width 0.3s ease;
    }
    
    .btn {
      padding: 10px 20px;
      margin: 5px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .btn-primary {
      background-color: #6366f1;
      color: white;
    }
    
    .btn-secondary {
      background-color: #6b7280;
      color: white;
    }
    
    .btn-danger {
      background-color: #ef4444;
      color: white;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .status {
      margin-top: 10px;
      padding: 10px;
      border-radius: 5px;
      background-color: #f3f4f6;
    }
  </style>
</head>
<body>
  <div class="upload-container">
    <h1>文件上传示例</h1>
    
    <input type="file" id="fileInput" accept="image/*,.pdf,.doc,.docx" />
    
    <div class="progress-bar">
      <div class="progress-fill" id="progressFill" style="width: 0%"></div>
    </div>
    
    <div id="progressText">0%</div>
    
    <div class="status" id="uploadStatus">状态：等待上传</div>
    
    <div>
      <button class="btn btn-primary" id="btnStart">开始上传</button>
      <button class="btn btn-secondary" id="btnPause">暂停</button>
      <button class="btn btn-secondary" id="btnResume">继续</button>
      <button class="btn btn-danger" id="btnCancel">取消</button>
    </div>
  </div>
  
  <script type="module">
    import { createUploadManager } from './upload-utils-skill.js';
    
    const fileInput = document.getElementById('fileInput');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const statusElement = document.getElementById('uploadStatus');
    
    let currentTask = null;
    let manager = null;
    
    document.getElementById('btnStart').addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) {
        alert('请选择文件');
        return;
      }
      
      manager = createUploadManager({
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
        maxSize: 100 * 1024 * 1024,
      });
      
      const config = {
        endpoint: 'https://api.example.com/upload',
        chunkSize: 5 * 1024 * 1024,
        concurrentChunks: 3,
        maxRetries: 3,
        enableResume: true,
        onProgress: (progress) => {
          progressFill.style.width = progress.percentage + '%';
          progressText.textContent = progress.percentage.toFixed(1) + '%';
          
          if (progress.speed) {
            progressText.textContent += ' - ' + (progress.speed / 1024).toFixed(1) + ' KB/s';
          }
        },
        onStatusChange: (status) => {
          statusElement.textContent = '状态：' + status;
        },
        onComplete: (result) => {
          statusElement.textContent = '状态：上传完成 ✓';
          console.log('上传成功:', result);
        },
        onError: (error) => {
          statusElement.textContent = '状态：上传失败 ✗';
          console.error('上传失败:', error);
        },
      };
      
      currentTask = manager.createUpload(file, config);
      manager.startUpload(currentTask.id);
    });
    
    document.getElementById('btnPause').addEventListener('click', () => {
      if (currentTask) currentTask.pause();
    });
    
    document.getElementById('btnResume').addEventListener('click', () => {
      if (currentTask) currentTask.resume();
    });
    
    document.getElementById('btnCancel').addEventListener('click', () => {
      if (currentTask) currentTask.cancel();
    });
  </script>
</body>
</html>
`;

console.log('\n=== 示例 7: 完整 HTML 示例 ===\n');
console.log(htmlExample);

// ============ 示例 8: Node.js 环境使用 ============

async function example8_nodejs() {
  console.log('\n=== 示例 8: Node.js 环境使用 ===\n');

  // Node.js 环境下需要使用 fs 模块读取文件
  // 注意：当前实现主要针对浏览器环境，Node.js 需要额外适配
  
  const nodejsExample = `
import { createUploadManager } from './upload-utils-skill';
import * as fs from 'fs';
import * as path from 'path';

async function uploadFileInNode() {
  const filePath = path.join(__dirname, 'large-video.mp4');
  const stats = fs.statSync(filePath);
  
  const fileInfo = {
    name: path.basename(filePath),
    size: stats.size,
    type: 'video/mp4',
    path: filePath,
  };
  
  const manager = createUploadManager({
    maxSize: 1024 * 1024 * 1024, // 1GB
  });
  
  const config = {
    endpoint: 'https://api.example.com/upload',
    chunkSize: 10 * 1024 * 1024, // 10MB
    concurrentChunks: 4,
    maxRetries: 5,
    enableResume: true,
    onProgress: (progress) => {
      console.log(\`进度：\${progress.percentage.toFixed(2)}%\`);
    },
  };
  
  const task = manager.createUpload(fileInfo, config);
  const result = await manager.startUpload(task.id);
  
  console.log('上传完成:', result);
}

uploadFileInNode();
  `;
  
  console.log(nodejsExample);
}

// ============ 运行示例 ============

// 取消注释以运行相应示例
// example1_basicUpload();
// example2_fileValidation();
// example3_advancedUpload();
// example4_multipleFiles();
// example5_largeFileOptimization();
// example6_commonMimeTypes();
// example8_nodejs();

console.log('\n✅ Upload Utils Skill 示例文件加载完成');
console.log('取消注释相应的示例函数以运行测试');

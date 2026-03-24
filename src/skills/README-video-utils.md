# 视频处理工具技能 (Video Utils Skill)

## 📦 功能概述

提供三大核心视频处理功能：

1. **视频压缩** - 减小文件大小，保持可接受质量
2. **格式转换** - 在不同视频格式间转换
3. **截图生成** - 从视频中提取帧图像

## 🔧 依赖安装

### macOS
```bash
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update && sudo apt install ffmpeg
```

### Linux (CentOS/RHEL)
```bash
sudo yum install ffmpeg
```

### Windows
1. 访问 https://ffmpeg.org/download.html
2. 下载对应版本
3. 添加到系统 PATH

### 验证安装
```bash
ffmpeg -version
ffprobe -version
```

## 📚 API 文档

### 1. 视频压缩

```typescript
import { compressVideo } from './video-utils-skill';

// 基础压缩
await compressVideo('input.mp4', {
  outputPath: 'output.mp4',
  videoBitrate: '1M',      // 视频比特率
  audioBitrate: '128K',    // 音频比特率
});

// 高质量压缩 (CRF 模式)
await compressVideo('input.mp4', {
  outputPath: 'output_hq.mp4',
  crf: 18,        // 质量值 0-51 (越小质量越高)
  preset: 'slow', // 编码速度预设
});

// 调整分辨率
await compressVideo('4k_video.mp4', {
  outputPath: '1080p.mp4',
  resolution: '1920x1080',
  crf: 23,
});
```

**压缩选项:**
- `outputPath?: string` - 输出文件路径
- `videoBitrate?: string` - 视频比特率 (例：'1M', '500K')
- `audioBitrate?: string` - 音频比特率 (例：'128K', '64K')
- `resolution?: string` - 分辨率 (例：'1920x1080', '1280x720')
- `crf?: number` - CRF 质量值 (0-51, 推荐 18-28)
- `preset?: string` - 编码速度 (ultrafast/fast/medium/slow/veryslow)

### 2. 格式转换

```typescript
import { convertVideo } from './video-utils-skill';

// 转换为 MP4
await convertVideo('input.avi', {
  format: 'mp4',
});

// 转换为 WebM (网页优化)
await convertVideo('input.mp4', {
  format: 'webm',
  videoCodec: 'libvpx-vp9',
  audioCodec: 'libopus',
});

// 转换为 GIF
await convertVideo('video.mp4', {
  format: 'gif',
  framerate: 10,
  resolution: '480x270',
});
```

**转换选项:**
- `outputPath?: string` - 输出文件路径
- `format?: string` - 目标格式 (mp4/avi/mkv/webm/mov/gif)
- `videoCodec?: string` - 视频编码器
- `audioCodec?: string` - 音频编码器
- `videoBitrate?: string` - 视频比特率
- `framerate?: number` - 帧率

### 3. 截图生成

```typescript
import { generateScreenshot } from './video-utils-skill';

// 单张截图 (指定时间)
await generateScreenshot('video.mp4', {
  timestamp: '00:01:30',  // 1 分 30 秒处
  outputPath: 'screenshot.jpg',
  format: 'jpg',
});

// 多张截图 (固定间隔)
await generateScreenshot('video.mp4', {
  interval: 30,     // 每 30 秒一张
  count: 10,        // 共 10 张
  outputPath: 'frames/frame_%03d.jpg',
});

// 高分辨率截图
await generateScreenshot('4k_video.mp4', {
  timestamp: '10',
  resolution: '3840x2160',
  outputPath: '4k_frame.png',
  format: 'png',
});
```

**截图选项:**
- `outputPath?: string` - 输出文件路径 (支持 %03d 通配符)
- `timestamp?: string` - 时间点 ('00:01:30' 或 '90' 秒)
- `count?: number` - 截图数量
- `interval?: number` - 截图间隔 (秒)
- `resolution?: string` - 截图分辨率
- `format?: 'jpg' | 'png'` - 输出格式

### 4. 视频信息获取

```typescript
import { getVideoInfo, formatDuration, formatFileSize } from './video-utils-skill';

const info = await getVideoInfo('video.mp4');
console.log('时长:', formatDuration(info.duration));
console.log('分辨率:', info.resolution);
console.log('大小:', formatFileSize(info.size));
console.log('编码:', info.videoCodec);
console.log('帧率:', info.framerate, 'FPS');
```

**返回信息:**
- `duration: number` - 时长 (秒)
- `videoCodec: string` - 视频编码器
- `audioCodec: string` - 音频编码器
- `resolution: string` - 分辨率
- `framerate: number` - 帧率
- `bitrate: string` - 比特率
- `size: number` - 文件大小 (字节)
- `format: string` - 格式

### 5. 批量处理

```typescript
import { VideoUtils } from './video-utils-skill';

// 批量压缩
const compressed = await VideoUtils.batchCompressVideos(
  ['video1.mp4', 'video2.mp4', 'video3.mp4'],
  { videoBitrate: '2M', crf: 23 }
);

// 批量转换
const converted = await VideoUtils.batchConvertVideos(
  ['input1.avi', 'input2.mov'],
  { format: 'mp4' }
);

// 批量截图
const screenshots = await VideoUtils.batchGenerateScreenshots(
  ['video1.mp4', 'video2.mp4'],
  { timestamp: '00:01:00', resolution: '1280x720' }
);
```

### 6. 工具函数

```typescript
// 检查依赖
const hasFFmpeg = await VideoUtils.checkFFmpeg();
const hasFFprobe = await VideoUtils.checkFFprobe();

// 格式化
const durationStr = VideoUtils.formatDuration(3661);  // "01:01:01"
const sizeStr = VideoUtils.formatFileSize(12345678);  // "11.77 MB"
```

## 💡 使用场景

### 场景 1: 视频上传前处理
```typescript
// 1. 压缩视频
await compressVideo('raw.mp4', {
  videoBitrate: '2M',
  resolution: '1920x1080',
});

// 2. 生成封面
await generateScreenshot('raw.mp4', {
  timestamp: '00:00:02',
  outputPath: 'cover.jpg',
});
```

### 场景 2: 社交媒体 GIF 制作
```typescript
await convertVideo('highlight.mp4', {
  format: 'gif',
  framerate: 12,
  resolution: '480x270',
});
```

### 场景 3: 在线课程处理
```typescript
// 批量压缩课程视频
await VideoUtils.batchCompressVideos(
  lessons,
  { videoBitrate: '1M', resolution: '1280x720' }
);

// 为每个视频生成缩略图
for (const video of lessons) {
  await generateScreenshot(video, {
    timestamp: '00:01:00',
    outputPath: `thumb_${video}.jpg`,
  });
}
```

## 📝 质量参考

### CRF 值指南
| CRF | 质量 | 用途 |
|-----|------|------|
| 18  | 视觉无损 | 高质量存档 |
| 20-23 | 高质量 | 一般用途 |
| 25-28 | 中等质量 | 网络传输 |
| 30+  | 低质量 | 快速预览 |

### 预设速度指南
| Preset | 速度 | 压缩率 |
|--------|------|--------|
| ultrafast | 最快 | 最低 |
| fast | 快 | 较低 |
| medium | 中等 | 中等 (默认) |
| slow | 慢 | 较高 |
| veryslow | 最慢 | 最高 |

### 比特率参考
| 分辨率 | 推荐比特率 |
|--------|-----------|
| 4K (2160p) | 8-16 Mbps |
| 1080p | 4-8 Mbps |
| 720p | 2-4 Mbps |
| 480p | 1-2 Mbps |

## ⚠️ 注意事项

1. **文件路径**: 支持相对路径和绝对路径，自动解析
2. **输出目录**: 不存在时会自动创建
3. **覆盖行为**: 默认覆盖已存在的输出文件
4. **错误处理**: 建议用 try-catch 包裹调用
5. **大文件**: 处理大文件时注意磁盘空间

## 📄 文件清单

- `video-utils-skill.ts` - 核心实现
- `video-utils-skill.examples.ts` - 使用示例
- `README.md` - 本文档

## 🚀 快速开始

```typescript
import { VideoUtils } from './src/skills/video-utils-skill';

// 检查依赖
if (!await VideoUtils.checkFFmpeg()) {
  console.error('请先安装 ffmpeg');
  process.exit(1);
}

// 压缩视频
const output = await VideoUtils.compressVideo('input.mp4', {
  videoBitrate: '2M',
  crf: 23,
});

console.log('压缩完成:', output);
```

---

**版本:** 1.0.0  
**作者:** KAEL  
**许可:** MIT

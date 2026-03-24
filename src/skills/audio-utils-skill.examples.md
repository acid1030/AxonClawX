# ACE 音频处理工具 - 使用示例

**模块:** ACE (Audio Conversion Engine)  
**版本:** 1.0.0  
**作者:** Axon

---

## 📦 安装依赖

```bash
# 安装 fluent-ffmpeg
uv pip install fluent-ffmpeg

# 确保系统已安装 FFmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (使用 Chocolatey)
choco install ffmpeg
```

---

## 🚀 快速开始

### 基础导入

```typescript
import audioUtils, { 
  convertAudio, 
  trimAudio, 
  adjustVolume,
  getAudioInfo 
} from './src/skills/audio-utils-skill';

// 或者使用默认导出
const audio = audioUtils;
```

---

## 🎯 功能示例

### 1️⃣ 音频格式转换

#### 转换为 MP3

```typescript
import { convertAudio } from './src/skills/audio-utils-skill';

// 基础转换 (默认 192kbps MP3)
const result = await convertAudio('input.wav');
console.log('输出文件:', result.outputPath);

// 高质量 MP3 (320kbps)
const hqResult = await convertAudio('input.wav', {
  format: 'mp3',
  bitrate: 320,
  sampleRate: 44100,
  channels: 2
});

// 转换为 OGG (适用于网页)
const oggResult = await convertAudio('input.mp3', {
  format: 'ogg',
  bitrate: 256,
  sampleRate: 48000
});

// 转换为无损 FLAC
const flacResult = await convertAudio('input.mp3', {
  format: 'flac',
  sampleRate: 96000,
  channels: 2
});

// 指定输出路径
const customResult = await convertAudio('input.wav', {
  format: 'mp3',
  bitrate: 192,
  outputPath: './output/converted.mp3'
});
```

#### 批量转换

```typescript
import { batchProcessAudio, convertAudio } from './src/skills/audio-utils-skill';

const files = [
  'track1.wav',
  'track2.wav',
  'track3.wav'
];

const results = await batchProcessAudio(files, (file) =>
  convertAudio(file, { format: 'mp3', bitrate: 192 })
);

// 处理结果
results.forEach((result, index) => {
  if (result.success) {
    console.log(`✅ ${files[index]} → ${result.outputPath}`);
  } else {
    console.log(`❌ ${files[index]} 失败：${result.error}`);
  }
});
```

#### 使用快捷函数

```typescript
import { toMp3, toWav } from './src/skills/audio-utils-skill';

// 快速转换为 MP3
await toMp3('input.wav');
await toMp3('input.wav', './output/custom.mp3');

// 快速转换为 WAV (无损)
await toWav('input.mp3');
```

---

### 2️⃣ 音频剪辑/裁剪

#### 基础裁剪

```typescript
import { trimAudio } from './src/skills/audio-utils-skill';

// 裁剪前 30 秒
const clip1 = await trimAudio('podcast.mp3', {
  duration: 30
});

// 裁剪指定时间段 (从 1 分钟开始，持续 90 秒)
const clip2 = await trimAudio('song.mp3', {
  startTime: 60,    // 从第 60 秒开始
  duration: 90      // 持续 90 秒
});

// 使用结束时间 (从 30 秒到 2 分钟)
const clip3 = await trimAudio('song.mp3', {
  startTime: 30,
  endTime: 120
});

// 保持原格式
const clip4 = await trimAudio('input.wav', {
  startTime: 10,
  duration: 20,
  keepFormat: true  // 输出仍为 WAV
});
```

#### 提取副歌部分

```typescript
// 假设副歌在 1:00-1:45
const chorus = await trimAudio('song.mp3', {
  startTime: 60,   // 1:00
  duration: 45,    // 45 秒
  outputPath: './output/chorus.mp3'
});
```

#### 创建铃声

```typescript
// 制作 30 秒铃声
const ringtone = await trimAudio('favorite-song.mp3', {
  startTime: 15,   // 从 15 秒开始
  duration: 30,    // 30 秒长度
  outputPath: './output/ringtone.m4a'
});
```

#### 使用快捷函数

```typescript
import { clipStart, clipEnd } from './src/skills/audio-utils-skill';

// 裁剪前 10 秒
await clipStart('audio.mp3', 10);

// 裁剪最后 15 秒
await clipEnd('audio.mp3', 15);
```

---

### 3️⃣ 音量调整

#### 增益调整

```typescript
import { adjustVolume } from './src/skills/audio-utils-skill';

// 增加音量 6dB
const boosted = await adjustVolume('quiet-podcast.mp3', {
  gain: 6
});

// 降低音量 -10dB
const reduced = await adjustVolume('loud-music.mp3', {
  gain: -10
});

// 微调 +2.5dB
const fineTuned = await adjustVolume('audio.mp3', {
  gain: 2.5
});
```

#### 倍数调整

```typescript
// 音量加倍 (2 倍)
const doubled = await adjustVolume('audio.mp3', {
  multiplier: 2
});

// 音量减半 (50%)
const halved = await adjustVolume('audio.mp3', {
  multiplier: 0.5
});

// 降低到 25%
const quiet = await adjustVolume('audio.mp3', {
  multiplier: 0.25
});
```

#### 音量标准化

```typescript
// 标准化音量 (推荐用于播客/有声书)
const normalized = await adjustVolume('podcast.mp3', {
  normalize: true,
  normalizeTarget: -1  // 目标电平 -1 dBFS
});

// 更激进的标准化 (-0.5 dBFS)
const loudNormalized = await adjustVolume('audiobook.mp3', {
  normalize: true,
  normalizeTarget: -0.5
});
```

#### 组合调整

```typescript
// 先标准化，再增加 3dB
const combined = await adjustVolume('quiet-audio.mp3', {
  normalize: true,
  normalizeTarget: -1,
  gain: 3
});

// 标准化并降低音量
const safe = await adjustVolume('loud-audio.mp3', {
  normalize: true,
  normalizeTarget: -3,
  gain: -2
});
```

#### 使用快捷函数

```typescript
import { boostVolume, reduceVolume, normalizeAudio } from './src/skills/audio-utils-skill';

// 快速增加音量
await boostVolume('quiet.mp3', 6);      // +6dB
await boostVolume('quiet.mp3', 12);     // +12dB

// 快速降低音量
await reduceVolume('loud.mp3', -6);     // -6dB
await reduceVolume('loud.mp3', -12);    // -12dB

// 快速标准化
await normalizeAudio('podcast.mp3');           // 默认 -1 dBFS
await normalizeAudio('podcast.mp3', -0.5);     // -0.5 dBFS
```

---

## 🔍 获取音频信息

```typescript
import { getAudioInfo } from './src/skills/audio-utils-skill';

const info = await getAudioInfo('song.mp3');

console.log('音频信息:', {
  格式：info.format,           // 'mp3'
  时长：info.duration,         // 秒 (例如：245.6)
  比特率：info.bitrate,        // kbps (例如：320)
  采样率：info.sampleRate,     // Hz (例如：44100)
  声道数：info.channels,       // 1 或 2
  文件大小：info.size          // 字节
});

// 格式化时长
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

console.log(`时长：${formatDuration(info.duration!)}`);  // 4:05
```

---

## 🎨 实际应用场景

### 场景 1: 播客后期处理

```typescript
import { convertAudio, trimAudio, adjustVolume } from './src/skills/audio-utils-skill';

async function processPodcast(inputFile: string) {
  console.log('🎙️ 开始处理播客...');
  
  // 1. 裁剪片头片尾
  const trimmed = await trimAudio(inputFile, {
    startTime: 5,      // 去掉前 5 秒
    duration: 1800     // 保留 30 分钟
  });
  
  // 2. 标准化音量
  const normalized = await adjustVolume(trimmed.outputPath!, {
    normalize: true,
    normalizeTarget: -1
  });
  
  // 3. 转换为播客格式 (MP3 128kbps 单声道)
  const final = await convertAudio(normalized.outputPath!, {
    format: 'mp3',
    bitrate: 128,
    channels: 1,
    sampleRate: 44100,
    outputPath: './output/podcast-episode.mp3'
  });
  
  console.log('✅ 播客处理完成:', final.outputPath);
  return final;
}
```

### 场景 2: 音乐铃声制作

```typescript
async function createRingtone(songFile: string, options: {
  startTime: number;
  duration: number;
  fadeOut?: boolean;
}) {
  console.log('🎵 制作铃声...');
  
  // 1. 裁剪高潮部分
  const clipped = await trimAudio(songFile, {
    startTime: options.startTime,
    duration: options.duration,
    outputPath: './temp/clipped.m4a'
  });
  
  // 2. 标准化音量
  const normalized = await adjustVolume(clipped.outputPath!, {
    normalize: true,
    normalizeTarget: -0.5
  });
  
  // 3. 转换为手机铃声格式
  const ringtone = await convertAudio(normalized.outputPath!, {
    format: 'm4a',
    bitrate: 256,
    outputPath: './output/ringtone.m4a'
  });
  
  console.log('✅ 铃声制作完成:', ringtone.outputPath);
  return ringtone;
}

// 使用示例
await createRingtone('favorite-song.mp3', {
  startTime: 65,   // 从 1:05 开始
  duration: 30     // 30 秒
});
```

### 场景 3: 有声书批量处理

```typescript
async function processAudiobook(chapterFiles: string[]) {
  console.log('📚 批量处理有声书...');
  
  const results = await batchProcessAudio(chapterFiles, async (file) => {
    // 1. 标准化音量
    const normalized = await adjustVolume(file, {
      normalize: true,
      normalizeTarget: -1
    });
    
    // 2. 转换为有声书格式 (MP3 64kbps 单声道)
    const converted = await convertAudio(normalized.outputPath!, {
      format: 'mp3',
      bitrate: 64,
      channels: 1,
      sampleRate: 22050
    });
    
    return converted;
  });
  
  // 统计结果
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 处理完成：${successCount}/${chapterFiles.length} 章节`);
  
  return results;
}

// 使用示例
const chapters = [
  'chapter-01.wav',
  'chapter-02.wav',
  'chapter-03.wav',
  // ...
];

await processAudiobook(chapters);
```

### 场景 4: 音频预览生成

```typescript
async function generatePreview(audioFile: string, previewSeconds: number = 30) {
  console.log('🎧 生成预览...');
  
  // 裁剪前 30 秒作为预览
  const preview = await trimAudio(audioFile, {
    duration: previewSeconds,
    outputPath: './output/preview.mp3'
  });
  
  // 转换为低比特率以减小文件
  const compressed = await convertAudio(preview.outputPath!, {
    format: 'mp3',
    bitrate: 96
  });
  
  console.log('✅ 预览生成完成:', compressed.outputPath);
  return compressed;
}
```

### 场景 5: 音频标准化流水线

```typescript
async function audioPipeline(inputFile: string) {
  const steps = [
    { name: '获取信息', fn: async () => await getAudioInfo(inputFile) },
    { name: '标准化', fn: async (info: any) => await adjustVolume(inputFile, { normalize: true }) },
    { name: '转换为 MP3', fn: async (result: any) => await convertAudio(result.outputPath!, { format: 'mp3', bitrate: 192 }) },
    { name: '创建预览', fn: async (result: any) => await trimAudio(result.outputPath!, { duration: 30 }) }
  ];
  
  let currentResult: any = inputFile;
  
  for (const step of steps) {
    console.log(`⚙️ 执行：${step.name}`);
    currentResult = await step.fn(currentResult);
    
    if (!currentResult.success && currentResult.error) {
      console.error(`❌ ${step.name} 失败：${currentResult.error}`);
      break;
    }
  }
  
  return currentResult;
}
```

---

## ⚙️ 配置参数详解

### ConvertConfig (转换配置)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `format` | AudioFormat | 'mp3' | 输出格式 (mp3/wav/ogg/m4a/flac/aac) |
| `bitrate` | number | 192 | 比特率 (kbps), 范围：8-320 |
| `sampleRate` | number | 44100 | 采样率 (Hz), 常用：22050/44100/48000/96000 |
| `channels` | 1 \| 2 | 2 | 声道数 (1=单声道，2=立体声) |
| `outputPath` | string | - | 自定义输出路径 |

### TrimConfig (剪辑配置)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `startTime` | number | 0 | 开始时间 (秒) |
| `duration` | number | - | 持续时间 (秒), 与 endTime 二选一 |
| `endTime` | number | - | 结束时间 (秒), 与 duration 二选一 |
| `outputPath` | string | - | 自定义输出路径 |
| `keepFormat` | boolean | true | 保持原格式 |

### VolumeConfig (音量配置)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `gain` | number | 0 | 增益调整 (dB), 范围：-50 到 +50 |
| `multiplier` | number | 1 | 音量倍数，范围：0.01-10 |
| `normalize` | boolean | false | 启用音量标准化 |
| `normalizeTarget` | number | -1 | 标准化目标电平 (dBFS) |
| `outputPath` | string | - | 自定义输出路径 |
| `keepFormat` | boolean | true | 保持原格式 |

---

## 🛠️ 错误处理

```typescript
import { convertAudio } from './src/skills/audio-utils-skill';

try {
  const result = await convertAudio('input.wav', { format: 'mp3' });
  
  if (result.success) {
    console.log('✅ 转换成功:', result.outputPath);
    console.log('输出信息:', result.outputInfo);
  } else {
    console.error('❌ 转换失败:', result.error);
  }
} catch (err) {
  console.error('💥 异常:', err instanceof Error ? err.message : err);
}
```

### 常见错误

```typescript
// 1. 文件不存在
// Error: 输入文件不存在：./missing-file.wav

// 2. FFmpeg 未安装
// Error: 转换失败：ffmpeg is not installed

// 3. 无效的剪辑参数
// Error: 必须指定 duration 或 endTime 参数

// 4. 无效的音量倍数
// Error: multiplier 必须在 0.01 到 10 之间
```

---

## 📊 性能优化建议

### 1. 使用合适的比特率

```typescript
// 语音/播客 (64-128kbps 足够)
await convertAudio('podcast.wav', { bitrate: 96, channels: 1 });

// 音乐 (192-320kbps)
await convertAudio('music.wav', { bitrate: 320 });

// 无损归档
await convertAudio('master.wav', { format: 'flac' });
```

### 2. 批量处理使用队列

```typescript
// 避免同时处理太多文件
const queue = files.slice(0, 5);  // 每次最多 5 个
const results = await batchProcessAudio(queue, processor);
```

### 3. 临时文件清理

```typescript
import * as fs from 'fs';

// 处理完成后清理临时文件
fs.unlinkSync('./temp/intermediate.wav');
```

---

## 📝 最佳实践

1. **始终检查输入文件是否存在**
2. **使用标准化处理播客/有声书**
3. **音乐转换使用 192kbps 以上**
4. **批量处理时添加错误处理**
5. **保留原始文件备份**
6. **使用有意义的输出文件名**

---

## 🎯 完整示例

```typescript
import audioUtils from './src/skills/audio-utils-skill';

async function main() {
  console.log('🎵 ACE 音频处理工具演示\n');
  
  // 1. 获取音频信息
  const info = await audioUtils.getAudioInfo('input.wav');
  console.log('原始音频:', {
    格式：info.format,
    时长：`${(info.duration! / 60).toFixed(1)} 分钟`,
    比特率：`${info.bitrate} kbps`
  });
  
  // 2. 转换为 MP3
  const mp3Result = await audioUtils.toMp3('input.wav');
  console.log('\n✅ MP3 转换:', mp3Result.outputPath);
  
  // 3. 裁剪高潮部分
  const clipResult = await audioUtils.trimAudio('input.wav', {
    startTime: 30,
    duration: 60
  });
  console.log('✅ 裁剪完成:', clipResult.outputPath);
  
  // 4. 标准化音量
  const normResult = await audioUtils.normalizeAudio('quiet.mp3');
  console.log('✅ 标准化完成:', normResult.outputPath);
  
  console.log('\n🎉 所有处理完成!');
}

main().catch(console.error);
```

---

## 📞 技术支持

遇到问题？检查以下事项:

1. ✅ FFmpeg 是否正确安装 (`ffmpeg -version`)
2. ✅ 输入文件路径是否正确
3. ✅ 输出目录是否有写入权限
4. ✅ 参数值是否在有效范围内

---

**最后更新:** 2026-03-13  
**维护者:** Axon

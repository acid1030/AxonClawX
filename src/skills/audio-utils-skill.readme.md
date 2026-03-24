# ACE 音频处理工具

**模块:** ACE (Audio Conversion Engine)  
**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 🎯 功能概览

ACE 音频处理工具提供三大核心功能:

1. **音频转换** - 支持 MP3/WAV/OGG/M4A/FLAC/AAC 格式互转
2. **音频剪辑** - 精确裁剪、截取音频片段
3. **音量调整** - 增益控制、标准化处理

---

## 📦 安装依赖

### 1. 安装 Node.js 包

```bash
# 在项目目录执行
npm install fluent-ffmpeg
# 或
yarn add fluent-ffmpeg
```

### 2. 安装系统 FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get install ffmpeg
```

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

**验证安装:**
```bash
ffmpeg -version
```

---

## 🚀 快速开始

```typescript
import audioUtils from './src/skills/audio-utils-skill';

// 1. 转换为 MP3
await audioUtils.toMp3('input.wav');

// 2. 裁剪前 30 秒
await audioUtils.clipStart('audio.mp3', 30);

// 3. 增加音量
await audioUtils.boostVolume('quiet.mp3', 6);

// 4. 标准化音量
await audioUtils.normalizeAudio('podcast.mp3');
```

---

## 📖 详细文档

- **完整 API 文档:** 查看 `audio-utils-skill.ts` 源码注释
- **使用示例:** 查看 `audio-utils-skill.examples.md`
- **测试用例:** 查看 `audio-utils-skill.test.ts`

---

## 💡 使用场景

### 播客处理
```typescript
// 标准化 + 转换为 MP3
const normalized = await audioUtils.normalizeAudio('recording.wav');
await audioUtils.toMp3(normalized.outputPath!);
```

### 铃声制作
```typescript
// 裁剪高潮部分
await audioUtils.trimAudio('song.mp3', {
  startTime: 60,
  duration: 30
});
```

### 批量转换
```typescript
const files = ['a.wav', 'b.wav', 'c.wav'];
await audioUtils.batchProcessAudio(files, file => 
  audioUtils.toMp3(file)
);
```

---

## 📊 API 速查

### 核心函数

| 函数 | 说明 | 示例 |
|------|------|------|
| `convertAudio()` | 格式转换 | `convertAudio('in.wav', {format:'mp3'})` |
| `trimAudio()` | 音频剪辑 | `trimAudio('in.mp3', {duration:30})` |
| `adjustVolume()` | 音量调整 | `adjustVolume('in.mp3', {gain:6})` |
| `getAudioInfo()` | 获取信息 | `getAudioInfo('file.mp3')` |

### 快捷函数

| 函数 | 说明 |
|------|------|
| `toMp3()` | 快速转 MP3 |
| `toWav()` | 快速转 WAV |
| `clipStart()` | 裁剪前 N 秒 |
| `clipEnd()` | 裁剪后 N 秒 |
| `boostVolume()` | 增加音量 |
| `reduceVolume()` | 降低音量 |
| `normalizeAudio()` | 标准化音量 |

---

## ⚙️ 配置参数

### 转换配置 (ConvertConfig)
```typescript
{
  format?: 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac' | 'aac',
  bitrate?: number,        // kbps (默认 192)
  sampleRate?: number,     // Hz (默认 44100)
  channels?: 1 | 2,        // 声道数 (默认 2)
  outputPath?: string      // 输出路径
}
```

### 剪辑配置 (TrimConfig)
```typescript
{
  startTime?: number,      // 开始时间 (秒)
  duration?: number,       // 持续时间 (秒)
  endTime?: number,        // 结束时间 (秒)
  outputPath?: string,
  keepFormat?: boolean     // 保持原格式 (默认 true)
}
```

### 音量配置 (VolumeConfig)
```typescript
{
  gain?: number,           // 增益 dB (-50 到 +50)
  multiplier?: number,     // 倍数 (0.01-10)
  normalize?: boolean,     // 标准化
  normalizeTarget?: number,// 目标电平 dBFS (默认 -1)
  outputPath?: string,
  keepFormat?: boolean
}
```

---

## 🧪 运行测试

```bash
# 确保有测试音频文件
mkdir -p test-assets/audio

# 运行测试
npx ts-node src/skills/audio-utils-skill.test.ts
```

---

## 📝 输出结果

所有函数返回统一的 `ProcessResult` 格式:

```typescript
{
  success: boolean,        // 是否成功
  outputPath?: string,     // 输出文件路径
  error?: string,          // 错误信息
  inputInfo?: AudioInfo,   // 输入文件信息
  outputInfo?: AudioInfo   // 输出文件信息
}
```

---

## ⚠️ 注意事项

1. **FFmpeg 必须安装** - 系统需要安装 FFmpeg 命令行工具
2. **文件权限** - 确保有输入文件读取权限和输出目录写入权限
3. **磁盘空间** - 转换过程可能产生临时文件
4. **内存使用** - 大文件处理会占用较多内存

---

## 🎨 最佳实践

### 推荐配置

**播客/有声书:**
```typescript
{
  format: 'mp3',
  bitrate: 96,
  channels: 1,      // 单声道足够
  sampleRate: 44100
}
```

**音乐:**
```typescript
{
  format: 'mp3',
  bitrate: 320,     // 高质量
  channels: 2,
  sampleRate: 44100
}
```

**无损归档:**
```typescript
{
  format: 'flac',
  sampleRate: 96000
}
```

---

## 🐛 常见问题

### Q: 提示 "ffmpeg is not installed"
**A:** 安装 FFmpeg 并添加到 PATH:
```bash
# macOS
brew install ffmpeg

# 验证
ffmpeg -version
```

### Q: 转换速度慢
**A:** 降低采样率或使用更快的编码预设:
```typescript
await convertAudio('input.wav', {
  format: 'mp3',
  bitrate: 128,
  sampleRate: 22050  // 降低采样率
});
```

### Q: 文件太大
**A:** 使用更低的比特率或转换为单声道:
```typescript
await convertAudio('input.wav', {
  bitrate: 64,
  channels: 1
});
```

---

## 📞 技术支持

遇到问题请检查:
- ✅ FFmpeg 是否正确安装
- ✅ 输入文件路径是否正确
- ✅ 输出目录是否有写入权限
- ✅ 参数值是否在有效范围内

---

**最后更新:** 2026-03-13  
**维护者:** Axon  
**许可证:** MIT

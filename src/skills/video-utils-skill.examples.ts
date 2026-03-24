/**
 * 视频处理工具技能 - 使用示例
 * 
 * 此文件展示 VideoUtils 的各种使用场景
 */

import {
  VideoUtils,
  compressVideo,
  convertVideo,
  generateScreenshot,
  getVideoInfo,
  formatDuration,
  formatFileSize,
} from './video-utils-skill';

// ==================== 使用前检查 ====================

async function checkDependencies() {
  const hasFFmpeg = await VideoUtils.checkFFmpeg();
  const hasFFprobe = await VideoUtils.checkFFprobe();
  
  if (!hasFFmpeg) {
    console.error('❌ 未检测到 ffmpeg，请先安装:');
    console.error('   macOS: brew install ffmpeg');
    console.error('   Linux: sudo apt install ffmpeg');
    console.error('   Windows: 从 https://ffmpeg.org/download.html 下载');
    return false;
  }
  
  if (!hasFFprobe) {
    console.error('❌ 未检测到 ffprobe (通常与 ffmpeg 一起安装)');
    return false;
  }
  
  console.log('✅ 依赖检查通过');
  return true;
}

// ==================== 1. 视频压缩示例 ====================

/**
 * 示例 1.1: 基础压缩 (使用默认设置)
 */
async function example1_1_basicCompress() {
  const inputPath = './videos/input.mp4';
  const outputPath = await compressVideo(inputPath);
  console.log('压缩完成:', outputPath);
}

/**
 * 示例 1.2: 指定比特率压缩 (适合网络传输)
 */
async function example1_2_bitrateCompress() {
  const inputPath = './videos/input.mp4';
  const outputPath = await compressVideo(inputPath, {
    outputPath: './videos/output_low_bitrate.mp4',
    videoBitrate: '1M',      // 视频比特率 1Mbps
    audioBitrate: '128K',    // 音频比特率 128Kbps
  });
  console.log('低比特率压缩完成:', outputPath);
}

/**
 * 示例 1.3: 高质量压缩 (CRF 模式)
 */
async function example1_3_qualityCompress() {
  const inputPath = './videos/input.mp4';
  const outputPath = await compressVideo(inputPath, {
    outputPath: './videos/output_high_quality.mp4',
    crf: 18,        // CRF 18 (视觉上几乎无损，范围 0-51)
    preset: 'slow', // 慢速编码以获得更好的压缩率
  });
  console.log('高质量压缩完成:', outputPath);
}

/**
 * 示例 1.4: 调整分辨率压缩
 */
async function example1_4_resolutionCompress() {
  const inputPath = './videos/4k_video.mp4';
  const outputPath = await compressVideo(inputPath, {
    outputPath: './videos/1080p_version.mp4',
    resolution: '1920x1080',  // 缩放到 1080p
    videoBitrate: '5M',
    crf: 23,
  });
  console.log('分辨率调整完成:', outputPath);
}

/**
 * 示例 1.5: 快速压缩 (适合快速预览)
 */
async function example1_5_fastCompress() {
  const inputPath = './videos/input.mp4';
  const outputPath = await compressVideo(inputPath, {
    outputPath: './videos/quick_preview.mp4',
    preset: 'ultrafast',  // 最快速度
    crf: 28,              // 较低质量以换取速度
  });
  console.log('快速压缩完成:', outputPath);
}

// ==================== 2. 格式转换示例 ====================

/**
 * 示例 2.1: 转换为 MP4 (通用格式)
 */
async function example2_1_toMP4() {
  const inputPath = './videos/input.avi';
  const outputPath = await convertVideo(inputPath, {
    format: 'mp4',
  });
  console.log('转换为 MP4 完成:', outputPath);
}

/**
 * 示例 2.2: 转换为 WebM (适合网页播放)
 */
async function example2_2_toWebM() {
  const inputPath = './videos/input.mp4';
  const outputPath = await convertVideo(inputPath, {
    format: 'webm',
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    videoBitrate: '2M',
  });
  console.log('转换为 WebM 完成:', outputPath);
}

/**
 * 示例 2.3: 转换为 GIF (动图)
 */
async function example2_3_toGIF() {
  const inputPath = './videos/clip.mp4';
  const outputPath = await convertVideo(inputPath, {
    format: 'gif',
    framerate: 10,           // 10 FPS
    resolution: '480x270',   // 小分辨率以减小文件大小
  });
  console.log('转换为 GIF 完成:', outputPath);
}

/**
 * 示例 2.4: 转换为 MOV (Apple 设备)
 */
async function example2_4_toMOV() {
  const inputPath = './videos/input.mp4';
  const outputPath = await convertVideo(inputPath, {
    format: 'mov',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    framerate: 60,  // 60 FPS
  });
  console.log('转换为 MOV 完成:', outputPath);
}

/**
 * 示例 2.5: 高质量 MKV 转换
 */
async function example2_5_toMKV() {
  const inputPath = './videos/input.mp4';
  const outputPath = await convertVideo(inputPath, {
    format: 'mkv',
    videoCodec: 'libx265',  // H.265/HEVC (更高压缩率)
    audioCodec: 'aac',
    videoBitrate: '8M',
  });
  console.log('转换为 MKV 完成:', outputPath);
}

// ==================== 3. 截图生成示例 ====================

/**
 * 示例 3.1: 单张截图 (指定时间点)
 */
async function example3_1_singleScreenshot() {
  const inputPath = './videos/movie.mp4';
  const screenshots = await generateScreenshot(inputPath, {
    timestamp: '00:05:30',  // 5 分 30 秒处
    outputPath: './screenshots/movie_5m30s.jpg',
    format: 'jpg',
  });
  console.log('截图完成:', screenshots);
}

/**
 * 示例 3.2: 单张截图 (使用秒数)
 */
async function example3_2_screenshotBySeconds() {
  const inputPath = './videos/tutorial.mp4';
  const screenshots = await generateScreenshot(inputPath, {
    timestamp: '90',  // 90 秒处 (1 分 30 秒)
    outputPath: './screenshots/tutorial_90s.png',
    format: 'png',    // PNG 格式 (无损)
  });
  console.log('截图完成:', screenshots);
}

/**
 * 示例 3.3: 多张截图 (固定间隔)
 */
async function example3_3_intervalScreenshots() {
  const inputPath = './videos/presentation.mp4';
  const screenshots = await generateScreenshot(inputPath, {
    interval: 30,     // 每 30 秒一张
    count: 10,        // 共 10 张
    outputPath: './screenshots/presentation_frame_%03d.jpg',
    format: 'jpg',
  });
  console.log('生成截图数量:', screenshots.length);
  console.log('截图文件:', screenshots);
}

/**
 * 示例 3.4: 高分辨率截图
 */
async function example3_4_highResScreenshot() {
  const inputPath = './videos/4k_demo.mp4';
  const screenshots = await generateScreenshot(inputPath, {
    timestamp: '00:00:10',
    resolution: '3840x2160',  // 4K 分辨率
    outputPath: './screenshots/4k_frame.png',
    format: 'png',
  });
  console.log('4K 截图完成:', screenshots);
}

/**
 * 示例 3.5: 视频封面图 (第一帧)
 */
async function example3_5_thumbnail() {
  const inputPath = './videos/vlog.mp4';
  const screenshots = await generateScreenshot(inputPath, {
    timestamp: '00:00:01',  // 第 1 秒 (避免黑屏)
    resolution: '1280x720',
    outputPath: './thumbnails/vlog_cover.jpg',
    format: 'jpg',
  });
  console.log('封面图生成完成:', screenshots);
}

// ==================== 4. 视频信息获取示例 ====================

/**
 * 示例 4.1: 获取视频详细信息
 */
async function example4_1_getVideoInfo() {
  const inputPath = './videos/sample.mp4';
  const info = await getVideoInfo(inputPath);
  
  console.log('=== 视频信息 ===');
  console.log('时长:', formatDuration(info.duration));
  console.log('分辨率:', info.resolution);
  console.log('视频编码:', info.videoCodec);
  console.log('音频编码:', info.audioCodec);
  console.log('帧率:', info.framerate, 'FPS');
  console.log('比特率:', info.bitrate);
  console.log('文件大小:', formatFileSize(info.size));
  console.log('格式:', info.format);
}

/**
 * 示例 4.2: 批量获取视频信息
 */
async function example4_2_batchVideoInfo() {
  const videos = [
    './videos/video1.mp4',
    './videos/video2.mp4',
    './videos/video3.mp4',
  ];
  
  for (const videoPath of videos) {
    try {
      const info = await getVideoInfo(videoPath);
      console.log(`${videoPath}: ${formatDuration(info.duration)} | ${info.resolution}`);
    } catch (error: any) {
      console.error(`读取失败 ${videoPath}:`, error.message);
    }
  }
}

// ==================== 5. 批量处理示例 ====================

/**
 * 示例 5.1: 批量压缩视频
 */
async function example5_1_batchCompress() {
  const videos = [
    './videos/raw/video1.mp4',
    './videos/raw/video2.mp4',
    './videos/raw/video3.mp4',
  ];
  
  const compressedVideos = await VideoUtils.batchCompressVideos(videos, {
    videoBitrate: '2M',
    audioBitrate: '128K',
    crf: 23,
  });
  
  console.log('压缩完成:', compressedVideos);
}

/**
 * 示例 5.2: 批量格式转换
 */
async function example5_2_batchConvert() {
  const videos = [
    './videos/input1.avi',
    './videos/input2.mov',
    './videos/input3.mkv',
  ];
  
  const convertedVideos = await VideoUtils.batchConvertVideos(videos, {
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
  });
  
  console.log('转换完成:', convertedVideos);
}

/**
 * 示例 5.3: 批量生成截图
 */
async function example5_3_batchScreenshots() {
  const videos = [
    './videos/movie1.mp4',
    './videos/movie2.mp4',
    './videos/movie3.mp4',
  ];
  
  const allScreenshots = await VideoUtils.batchGenerateScreenshots(videos, {
    timestamp: '00:01:00',  // 每张视频 1 分钟处
    resolution: '1280x720',
    format: 'jpg',
  });
  
  // allScreenshots 是二维数组
  allScreenshots.forEach((screenshots, index) => {
    console.log(`视频 ${index + 1} 截图:`, screenshots);
  });
}

// ==================== 6. 实际应用场景 ====================

/**
 * 场景 6.1: 视频上传前处理 (压缩 + 生成封面)
 */
async function scenario6_1_uploadPrep() {
  const inputPath = './videos/raw_footage.mp4';
  
  // 1. 获取原视频信息
  const info = await getVideoInfo(inputPath);
  console.log('原视频:', formatFileSize(info.size), formatDuration(info.duration));
  
  // 2. 压缩视频 (适合网络上传)
  const compressedPath = await compressVideo(inputPath, {
    outputPath: './videos/upload_ready.mp4',
    videoBitrate: '2M',
    audioBitrate: '128K',
    resolution: '1920x1080',
  });
  
  // 3. 生成封面图
  const thumbnails = await generateScreenshot(inputPath, {
    timestamp: '00:00:02',
    resolution: '1280x720',
    outputPath: './thumbnails/upload_cover.jpg',
  });
  
  const compressedInfo = await getVideoInfo(compressedPath);
  console.log('压缩后:', formatFileSize(compressedInfo.size));
  console.log('压缩率:', ((1 - compressedInfo.size / info.size) * 100).toFixed(2) + '%');
  console.log('封面图:', thumbnails);
}

/**
 * 场景 6.2: 视频转 GIF 用于社交媒体
 */
async function scenario6_2_socialMediaGIF() {
  const inputPath = './videos/highlight.mp4';
  
  // 1. 先截取片段 (假设只需前 10 秒)
  const clipPath = await convertVideo(inputPath, {
    format: 'mp4',
    videoBitrate: '2M',
  });
  
  // 2. 转换为 GIF
  const gifPath = await convertVideo(clipPath, {
    format: 'gif',
    framerate: 12,
    resolution: '480x270',
  });
  
  const gifSize = fs.statSync(gifPath).size;
  console.log('GIF 生成完成:', gifPath, formatFileSize(gifSize));
}

/**
 * 场景 6.3: 视频课程处理 (批量截图 + 压缩)
 */
async function scenario6_3_courseProcessing() {
  const courseVideos = [
    './courses/lesson1.mp4',
    './courses/lesson2.mp4',
    './courses/lesson3.mp4',
    './courses/lesson4.mp4',
    './courses/lesson5.mp4',
  ];
  
  console.log('开始处理课程视频...');
  
  // 1. 批量压缩
  const compressed = await VideoUtils.batchCompressVideos(courseVideos, {
    videoBitrate: '1M',
    audioBitrate: '96K',
    resolution: '1280x720',
    crf: 25,
  });
  
  // 2. 为每个视频生成 3 张截图 (开头、中间、结尾)
  for (let i = 0; i < courseVideos.length; i++) {
    const videoPath = courseVideos[i];
    const info = await getVideoInfo(videoPath);
    const midTime = Math.floor(info.duration / 2);
    
    // 开头
    await generateScreenshot(videoPath, {
      timestamp: '5',
      outputPath: `./courses/thumbnails/lesson${i + 1}_start.jpg`,
    });
    
    // 中间
    await generateScreenshot(videoPath, {
      timestamp: midTime.toString(),
      outputPath: `./courses/thumbnails/lesson${i + 1}_mid.jpg`,
    });
    
    // 结尾前 10 秒
    await generateScreenshot(videoPath, {
      timestamp: Math.max(5, info.duration - 10).toString(),
      outputPath: `./courses/thumbnails/lesson${i + 1}_end.jpg`,
    });
  }
  
  console.log('课程处理完成!');
  console.log('压缩视频:', compressed);
}

// ==================== 运行示例 ====================

async function runExamples() {
  console.log('=== 视频处理工具示例 ===\n');
  
  // 检查依赖
  const ready = await checkDependencies();
  if (!ready) {
    console.log('\n请先安装 ffmpeg 后再运行示例');
    return;
  }
  
  // 选择要运行的示例
  // 取消注释以运行对应示例
  
  // 压缩示例
  // await example1_1_basicCompress();
  // await example1_2_bitrateCompress();
  // await example1_3_qualityCompress();
  
  // 格式转换示例
  // await example2_1_toMP4();
  // await example2_2_toWebM();
  // await example2_3_toGIF();
  
  // 截图示例
  // await example3_1_singleScreenshot();
  // await example3_3_intervalScreenshots();
  
  // 信息获取
  // await example4_1_getVideoInfo();
  
  // 实际场景
  // await scenario6_1_uploadPrep();
  
  console.log('\n✅ 示例运行完成');
  console.log('\n提示: 取消注释对应示例函数来运行特定示例');
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples().catch(console.error);
}

// 需要 fs 模块用于场景示例
import * as fs from 'fs';

// 导出所有示例函数供外部调用
export {
  checkDependencies,
  example1_1_basicCompress,
  example1_2_bitrateCompress,
  example1_3_qualityCompress,
  example1_4_resolutionCompress,
  example1_5_fastCompress,
  example2_1_toMP4,
  example2_2_toWebM,
  example2_3_toGIF,
  example2_4_toMOV,
  example2_5_toMKV,
  example3_1_singleScreenshot,
  example3_2_screenshotBySeconds,
  example3_3_intervalScreenshots,
  example3_4_highResScreenshot,
  example3_5_thumbnail,
  example4_1_getVideoInfo,
  example4_2_batchVideoInfo,
  example5_1_batchCompress,
  example5_2_batchConvert,
  example5_3_batchScreenshots,
  scenario6_1_uploadPrep,
  scenario6_2_socialMediaGIF,
  scenario6_3_courseProcessing,
  runExamples,
};

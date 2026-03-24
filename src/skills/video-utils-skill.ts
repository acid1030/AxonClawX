/**
 * 视频处理工具技能
 * 
 * 功能:
 * 1. 视频压缩
 * 2. 格式转换
 * 3. 截图生成
 * 
 * 依赖: ffmpeg (需预先安装)
 * 安装：brew install ffmpeg (macOS) | sudo apt install ffmpeg (Linux)
 * 
 * @module skills/video-utils
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ==================== 配置接口 ====================

/**
 * 视频压缩选项
 */
export interface CompressOptions {
  /** 输出文件路径 */
  outputPath?: string;
  /** 视频比特率 (例：'1M', '500K') */
  videoBitrate?: string;
  /** 音频比特率 (例：'128K') */
  audioBitrate?: string;
  /** 分辨率 (例：'1280x720') */
  resolution?: string;
  /** CRF 质量值 (0-51, 越小质量越高，推荐 18-28) */
  crf?: number;
  /** 预设编码速度 (ultrafast, fast, medium, slow, veryslow) */
  preset?: string;
}

/**
 * 格式转换选项
 */
export interface ConvertOptions {
  /** 输出文件路径 */
  outputPath?: string;
  /** 目标格式 (mp4, avi, mkv, webm, mov, gif) */
  format?: string;
  /** 视频编码器 */
  videoCodec?: string;
  /** 音频编码器 */
  audioCodec?: string;
  /** 视频比特率 */
  videoBitrate?: string;
  /** 帧率 */
  framerate?: number;
}

/**
 * 截图选项
 */
export interface ScreenshotOptions {
  /** 输出文件路径 */
  outputPath?: string;
  /** 截图时间点 (例：'00:01:30' 或 '90' 秒) */
  timestamp?: string;
  /** 截图数量 */
  count?: number;
  /** 截图间隔 (秒) */
  interval?: number;
  /** 截图分辨率 */
  resolution?: string;
  /** 输出格式 (jpg, png) */
  format?: 'jpg' | 'png';
}

/**
 * 视频信息
 */
export interface VideoInfo {
  /** 时长 (秒) */
  duration: number;
  /** 视频编码器 */
  videoCodec: string;
  /** 音频编码器 */
  audioCodec: string;
  /** 分辨率 */
  resolution: string;
  /** 帧率 */
  framerate: number;
  /** 比特率 */
  bitrate: string;
  /** 文件大小 (字节) */
  size: number;
  /** 格式 */
  format: string;
}

// ==================== 视频压缩 ====================

/**
 * 压缩视频文件
 * @param inputPath - 输入视频文件路径
 * @param options - 压缩选项
 * @returns 输出文件路径
 * 
 * @example
 * ```typescript
 * // 基础压缩
 * await compressVideo('input.mp4', { outputPath: 'output.mp4' });
 * 
 * // 指定比特率压缩
 * await compressVideo('input.mp4', {
 *   outputPath: 'output.mp4',
 *   videoBitrate: '1M',
 *   audioBitrate: '128K'
 * });
 * 
 * // 高质量压缩 (CRF)
 * await compressVideo('input.mp4', {
 *   outputPath: 'output.mp4',
 *   crf: 23,
 *   preset: 'slow'
 * });
 * 
 * // 调整分辨率
 * await compressVideo('input.mp4', {
 *   outputPath: 'output.mp4',
 *   resolution: '1280x720',
 *   videoBitrate: '2M'
 * });
 * ```
 */
export async function compressVideo(
  inputPath: string,
  options: CompressOptions = {}
): Promise<string> {
  const absoluteInput = path.resolve(inputPath);
  
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`输入文件不存在：${absoluteInput}`);
  }
  
  const ext = path.extname(absoluteInput);
  const baseName = path.basename(absoluteInput, ext);
  const dirName = path.dirname(absoluteInput);
  const outputPath = options.outputPath || path.join(dirName, `${baseName}_compressed${ext}`);
  const absoluteOutput = path.resolve(outputPath);
  
  // 确保输出目录存在
  const outputDir = path.dirname(absoluteOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 构建 ffmpeg 命令
  let ffmpegArgs = `-i "${absoluteInput}"`;
  
  // 视频编码设置
  if (options.crf !== undefined) {
    ffmpegArgs += ` -crf ${options.crf}`;
  } else {
    ffmpegArgs += ' -crf 23'; // 默认 CRF 值
  }
  
  if (options.preset) {
    ffmpegArgs += ` -preset ${options.preset}`;
  } else {
    ffmpegArgs += ' -preset medium';
  }
  
  // 比特率设置
  if (options.videoBitrate) {
    ffmpegArgs += ` -b:v ${options.videoBitrate}`;
  }
  
  if (options.audioBitrate) {
    ffmpegArgs += ` -b:a ${options.audioBitrate}`;
  } else {
    ffmpegArgs += ' -b:a 128K';
  }
  
  // 分辨率调整
  if (options.resolution) {
    ffmpegArgs += ` -vf scale=${options.resolution}`;
  }
  
  // 音频编码
  ffmpegArgs += ' -c:a aac';
  
  // 视频编码
  ffmpegArgs += ' -c:v libx264';
  
  // 覆盖输出文件
  ffmpegArgs += ' -y';
  
  ffmpegArgs += ` "${absoluteOutput}"`;
  
  try {
    const { stderr } = await execAsync(`ffmpeg ${ffmpegArgs}`);
    console.log('视频压缩完成:', absoluteOutput);
    return absoluteOutput;
  } catch (error: any) {
    // ffmpeg 通常通过 stderr 输出进度信息，即使成功
    if (error.stderr && !error.message) {
      console.log('视频压缩完成:', absoluteOutput);
      return absoluteOutput;
    }
    throw new Error(`视频压缩失败：${error.message}`);
  }
}

// ==================== 格式转换 ====================

/**
 * 转换视频格式
 * @param inputPath - 输入视频文件路径
 * @param options - 转换选项
 * @returns 输出文件路径
 * 
 * @example
 * ```typescript
 * // 转换为 MP4
 * await convertVideo('input.avi', { format: 'mp4' });
 * 
 * // 转换为 WebM (适合网页)
 * await convertVideo('input.mp4', {
 *   format: 'webm',
 *   videoCodec: 'libvpx-vp9',
 *   audioCodec: 'libopus'
 * });
 * 
 * // 转换为 GIF
 * await convertVideo('input.mp4', {
 *   format: 'gif',
 *   framerate: 10,
 *   resolution: '480x270'
 * });
 * 
 * // 高质量转换
 * await convertVideo('input.mkv', {
 *   format: 'mp4',
 *   videoCodec: 'libx264',
 *   videoBitrate: '5M',
 *   framerate: 60
 * });
 * ```
 */
export async function convertVideo(
  inputPath: string,
  options: ConvertOptions = {}
): Promise<string> {
  const absoluteInput = path.resolve(inputPath);
  
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`输入文件不存在：${absoluteInput}`);
  }
  
  const targetFormat = options.format || 'mp4';
  const ext = path.extname(absoluteInput);
  const baseName = path.basename(absoluteInput, ext);
  const dirName = path.dirname(absoluteInput);
  const outputPath = options.outputPath || path.join(dirName, `${baseName}.${targetFormat}`);
  const absoluteOutput = path.resolve(outputPath);
  
  // 确保输出目录存在
  const outputDir = path.dirname(absoluteOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 构建 ffmpeg 命令
  let ffmpegArgs = `-i "${absoluteInput}"`;
  
  // 视频编码器
  if (options.videoCodec) {
    ffmpegArgs += ` -c:v ${options.videoCodec}`;
  } else {
    // 根据目标格式选择默认编码器
    const defaultCodecs: Record<string, string> = {
      mp4: 'libx264',
      webm: 'libvpx-vp9',
      avi: 'mpeg4',
      mkv: 'libx264',
      mov: 'libx264',
      gif: 'gif',
    };
    ffmpegArgs += ` -c:v ${defaultCodecs[targetFormat] || 'libx264'}`;
  }
  
  // 音频编码器
  if (options.audioCodec) {
    ffmpegArgs += ` -c:a ${options.audioCodec}`;
  } else if (targetFormat !== 'gif') {
    const defaultAudioCodecs: Record<string, string> = {
      mp4: 'aac',
      webm: 'libopus',
      avi: 'mp3',
      mkv: 'aac',
      mov: 'aac',
    };
    ffmpegArgs += ` -c:a ${defaultAudioCodecs[targetFormat] || 'aac'}`;
  }
  
  // 比特率
  if (options.videoBitrate) {
    ffmpegArgs += ` -b:v ${options.videoBitrate}`;
  }
  
  // 帧率
  if (options.framerate) {
    ffmpegArgs += ` -r ${options.framerate}`;
  }
  
  // 分辨率
  if (options.resolution) {
    ffmpegArgs += ` -vf scale=${options.resolution}`;
  }
  
  // GIF 特殊处理
  if (targetFormat === 'gif') {
    ffmpegArgs += ' -vf "fps=10,scale=480:-1:flags=lanczos"';
  }
  
  // 覆盖输出文件
  ffmpegArgs += ' -y';
  
  ffmpegArgs += ` "${absoluteOutput}"`;
  
  try {
    const { stderr } = await execAsync(`ffmpeg ${ffmpegArgs}`);
    console.log(`格式转换完成 (${targetFormat}):`, absoluteOutput);
    return absoluteOutput;
  } catch (error: any) {
    if (error.stderr && !error.message) {
      console.log(`格式转换完成 (${targetFormat}):`, absoluteOutput);
      return absoluteOutput;
    }
    throw new Error(`格式转换失败：${error.message}`);
  }
}

// ==================== 截图生成 ====================

/**
 * 从视频生成截图
 * @param inputPath - 输入视频文件路径
 * @param options - 截图选项
 * @returns 输出文件路径数组
 * 
 * @example
 * ```typescript
 * // 单张截图 (1 分钟处)
 * await generateScreenshot('video.mp4', {
 *   timestamp: '00:01:00',
 *   outputPath: 'screenshot.jpg'
 * });
 * 
 * // 多张截图 (每隔 10 秒)
 * await generateScreenshot('video.mp4', {
 *   count: 5,
 *   interval: 10,
 *   outputPath: 'screenshots/frame_%03d.jpg'
 * });
 * 
 * // 高分辨率截图
 * await generateScreenshot('video.mp4', {
 *   timestamp: '30',
 *   resolution: '1920x1080',
 *   format: 'png',
 *   outputPath: 'screenshot.png'
 * });
 * ```
 */
export async function generateScreenshot(
  inputPath: string,
  options: ScreenshotOptions = {}
): Promise<string[]> {
  const absoluteInput = path.resolve(inputPath);
  
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`输入文件不存在：${absoluteInput}`);
  }
  
  const ext = options.format || 'jpg';
  const defaultOutput = options.outputPath || `screenshot_%03d.${ext}`;
  const absoluteOutput = path.resolve(defaultOutput);
  
  // 确保输出目录存在
  const outputDir = path.dirname(absoluteOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 构建 ffmpeg 命令
  let ffmpegArgs = `-i "${absoluteInput}"`;
  
  // 时间戳或间隔
  if (options.timestamp) {
    // 单张或多张固定时间点截图
    const ts = options.timestamp.includes(':') ? options.timestamp : `${options.timestamp}`;
    ffmpegArgs += ` -ss ${ts}`;
    
    if (options.count && options.count > 1) {
      // 从指定时间点开始截取多张
      ffmpegArgs += ` -vframes ${options.count}`;
    } else {
      ffmpegArgs += ' -vframes 1';
    }
  } else if (options.interval) {
    // 按间隔截图
    ffmpegArgs += ` -vf fps=1/${options.interval}`;
    
    if (options.count) {
      ffmpegArgs += ` -vframes ${options.count}`;
    }
  } else {
    // 默认：截取第一帧
    ffmpegArgs += ' -ss 00:00:01 -vframes 1';
  }
  
  // 分辨率
  if (options.resolution) {
    ffmpegArgs += ` -vf scale=${options.resolution}`;
  }
  
  // 输出格式
  const codec = ext === 'png' ? 'png' : 'mjpeg';
  ffmpegArgs += ` -c:v ${codec}`;
  
  // 质量
  if (ext === 'jpg') {
    ffmpegArgs += ' -q:v 2';
  }
  
  // 覆盖输出文件
  ffmpegArgs += ' -y';
  
  ffmpegArgs += ` "${absoluteOutput}"`;
  
  try {
    const { stderr } = await execAsync(`ffmpeg ${ffmpegArgs}`);
    
    // 如果输出路径包含通配符，返回多个文件
    if (absoluteOutput.includes('%')) {
      // 尝试获取生成的文件列表
      const dir = path.dirname(absoluteOutput);
      const pattern = path.basename(absoluteOutput).replace(/%0\d+d/, '*');
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith(pattern.replace('*', '')))
        .sort()
        .map(f => path.join(dir, f));
      
      console.log(`生成 ${files.length} 张截图:`, files);
      return files;
    } else {
      console.log('截图生成完成:', absoluteOutput);
      return [absoluteOutput];
    }
  } catch (error: any) {
    if (error.stderr && !error.message) {
      if (absoluteOutput.includes('%')) {
        const dir = path.dirname(absoluteOutput);
        const pattern = path.basename(absoluteOutput).replace(/%0\d+d/, '*');
        const files = fs.readdirSync(dir)
          .filter(f => f.startsWith(pattern.replace('*', '')))
          .sort()
          .map(f => path.join(dir, f));
        return files;
      }
      return [absoluteOutput];
    }
    throw new Error(`截图生成失败：${error.message}`);
  }
}

// ==================== 视频信息获取 ====================

/**
 * 获取视频文件信息
 * @param inputPath - 视频文件路径
 * @returns 视频信息对象
 * 
 * @example
 * ```typescript
 * const info = await getVideoInfo('video.mp4');
 * console.log(`时长：${info.duration}秒`);
 * console.log(`分辨率：${info.resolution}`);
 * console.log(`大小：${(info.size / 1024 / 1024).toFixed(2)}MB`);
 * ```
 */
export async function getVideoInfo(inputPath: string): Promise<VideoInfo> {
  const absoluteInput = path.resolve(inputPath);
  
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`输入文件不存在：${absoluteInput}`);
  }
  
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${absoluteInput}"`
    );
    
    const data = JSON.parse(stdout);
    const videoStream = data.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = data.streams.find((s: any) => s.codec_type === 'audio');
    const format = data.format;
    
    return {
      duration: parseFloat(format.duration) || 0,
      videoCodec: videoStream?.codec_name || 'unknown',
      audioCodec: audioStream?.codec_name || 'none',
      resolution: videoStream 
        ? `${videoStream.width}x${videoStream.height}`
        : 'unknown',
      framerate: videoStream?.r_frame_rate 
        ? parseFloat(eval(videoStream.r_frame_rate)) || 0
        : 0,
      bitrate: format.bit_rate 
        ? `${(parseInt(format.bit_rate) / 1000).toFixed(0)}Kbps`
        : 'unknown',
      size: parseInt(format.size) || 0,
      format: format.format_name || 'unknown',
    };
  } catch (error: any) {
    throw new Error(`获取视频信息失败：${error.message}`);
  }
}

// ==================== 批量处理 ====================

/**
 * 批量压缩视频
 * @param inputPaths - 输入文件路径数组
 * @param options - 压缩选项
 * @returns 输出文件路径数组
 */
export async function batchCompressVideos(
  inputPaths: string[],
  options: CompressOptions = {}
): Promise<string[]> {
  const results: string[] = [];
  
  for (const inputPath of inputPaths) {
    try {
      const outputPath = await compressVideo(inputPath, options);
      results.push(outputPath);
    } catch (error: any) {
      console.error(`压缩失败 ${inputPath}:`, error.message);
    }
  }
  
  return results;
}

/**
 * 批量转换视频格式
 * @param inputPaths - 输入文件路径数组
 * @param options - 转换选项
 * @returns 输出文件路径数组
 */
export async function batchConvertVideos(
  inputPaths: string[],
  options: ConvertOptions = {}
): Promise<string[]> {
  const results: string[] = [];
  
  for (const inputPath of inputPaths) {
    try {
      const outputPath = await convertVideo(inputPath, options);
      results.push(outputPath);
    } catch (error: any) {
      console.error(`转换失败 ${inputPath}:`, error.message);
    }
  }
  
  return results;
}

/**
 * 批量生成截图
 * @param inputPaths - 输入文件路径数组
 * @param options - 截图选项
 * @returns 输出文件路径数组 (二维数组，每个视频对应一个截图数组)
 */
export async function batchGenerateScreenshots(
  inputPaths: string[],
  options: ScreenshotOptions = {}
): Promise<string[][]> {
  const results: string[][] = [];
  
  for (const inputPath of inputPaths) {
    try {
      const screenshots = await generateScreenshot(inputPath, options);
      results.push(screenshots);
    } catch (error: any) {
      console.error(`截图失败 ${inputPath}:`, error.message);
      results.push([]);
    }
  }
  
  return results;
}

// ==================== 工具函数 ====================

/**
 * 检查 ffmpeg 是否已安装
 * @returns 是否已安装
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查 ffprobe 是否已安装
 * @returns 是否已安装
 */
export async function checkFFprobe(): Promise<boolean> {
  try {
    await execAsync('ffprobe -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * 格式化时长 (秒 → HH:MM:SS)
 * @param seconds - 秒数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

// ==================== 导出 ====================

export const VideoUtils = {
  // 核心功能
  compressVideo,
  convertVideo,
  generateScreenshot,
  getVideoInfo,
  
  // 批量处理
  batchCompressVideos,
  batchConvertVideos,
  batchGenerateScreenshots,
  
  // 工具函数
  checkFFmpeg,
  checkFFprobe,
  formatDuration,
  formatFileSize,
};

export default VideoUtils;

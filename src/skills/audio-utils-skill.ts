/**
 * 音频处理工具技能 - Audio Utils Skill (ACE)
 * 
 * 功能:
 * 1. 音频转换 (MP3/WAV/OGG/M4A/FLAC/AAC)
 * 2. 音频剪辑 (裁剪/截取)
 * 3. 音量调整 (增益/标准化)
 * 
 * @author Axon
 * @version 1.0.0
 * @module ACE
 */

import ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/**
 * 音频格式
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'm4a' | 'flac' | 'aac';

/**
 * 音频质量配置
 */
export interface AudioQualityConfig {
  /** 比特率 (kbps, 默认 192) */
  bitrate?: number;
  /** 采样率 (Hz, 默认 44100) */
  sampleRate?: number;
  /** 声道数 (1=单声道，2=立体声，默认 2) */
  channels?: 1 | 2;
}

/**
 * 转换配置
 */
export interface ConvertConfig extends AudioQualityConfig {
  /** 输出格式 */
  format?: AudioFormat;
  /** 输出路径 (可选，默认输入路径 + 新扩展名) */
  outputPath?: string;
}

/**
 * 剪辑配置
 */
export interface TrimConfig {
  /** 开始时间 (秒，默认 0) */
  startTime?: number;
  /** 持续时间 (秒，必填或设置 endTime) */
  duration?: number;
  /** 结束时间 (秒，可选，与 duration 二选一) */
  endTime?: number;
  /** 输出路径 (可选) */
  outputPath?: string;
  /** 保持原格式 (默认 true) */
  keepFormat?: boolean;
}

/**
 * 音量调整配置
 */
export interface VolumeConfig {
  /** 音量增益 (dB, -50 到 +50, 默认 0) */
  gain?: number;
  /** 音量倍数 (0.01-10, 默认 1) */
  multiplier?: number;
  /** 标准化音量 (true=启用，默认 false) */
  normalize?: boolean;
  /** 标准化目标电平 (dBFS, 默认 -1) */
  normalizeTarget?: number;
  /** 输出路径 (可选) */
  outputPath?: string;
  /** 保持原格式 (默认 true) */
  keepFormat?: boolean;
}

/**
 * 处理结果
 */
export interface ProcessResult {
  /** 是否成功 */
  success: boolean;
  /** 输出文件路径 */
  outputPath?: string;
  /** 错误信息 */
  error?: string;
  /** 输入文件信息 */
  inputInfo?: AudioInfo;
  /** 输出文件信息 */
  outputInfo?: AudioInfo;
}

/**
 * 音频信息
 */
export interface AudioInfo {
  /** 文件格式 */
  format?: string;
  /** 时长 (秒) */
  duration?: number;
  /** 比特率 (kbps) */
  bitrate?: number;
  /** 采样率 (Hz) */
  sampleRate?: number;
  /** 声道数 */
  channels?: number;
  /** 文件大小 (字节) */
  size?: number;
}

// ============== 工具函数 ==============

/**
 * 获取音频信息
 */
export async function getAudioInfo(inputPath: string): Promise<AudioInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(new Error(`获取音频信息失败：${err.message}`));
        return;
      }

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      resolve({
        format: metadata.format.format_name,
        duration: metadata.format.duration,
        bitrate: metadata.format.bit_rate ? Math.round(parseInt(metadata.format.bit_rate) / 1000) : undefined,
        sampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
        channels: audioStream?.channels,
        size: metadata.format.size
      });
    });
  });
}

/**
 * 验证文件是否存在
 */
function validateInput(inputPath: string): void {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入文件不存在：${inputPath}`);
  }
}

/**
 * 生成输出路径
 */
function generateOutputPath(inputPath: string, format?: string, suffix?: string): string {
  const parsed = path.parse(inputPath);
  
  if (suffix) {
    return path.join(parsed.dir, `${parsed.name}${suffix}${format ? '.' + format : parsed.ext}`);
  }
  
  return path.join(parsed.dir, `${parsed.name}${format ? '.' + format : parsed.ext}`);
}

// ============== 核心功能 ==============

/**
 * 音频格式转换
 * 
 * 支持格式：MP3, WAV, OGG, M4A, FLAC, AAC
 * 
 * @param inputPath - 输入文件路径
 * @param config - 转换配置
 * @returns 处理结果
 * 
 * @example
 * ```typescript
 * // 转换为 MP3
 * await convertAudio('input.wav', { format: 'mp3', bitrate: 320 });
 * 
 * // 转换为高质量 OGG
 * await convertAudio('input.mp3', { 
 *   format: 'ogg', 
 *   bitrate: 256, 
 *   sampleRate: 48000 
 * });
 * ```
 */
export async function convertAudio(
  inputPath: string,
  config: ConvertConfig = {}
): Promise<ProcessResult> {
  try {
    validateInput(inputPath);

    const {
      format = 'mp3',
      bitrate = 192,
      sampleRate = 44100,
      channels = 2,
      outputPath
    } = config;

    const finalOutputPath = outputPath || generateOutputPath(inputPath, format);

    // 获取输入信息
    const inputInfo = await getAudioInfo(inputPath);

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // 设置输出格式
      command = command.toFormat(format);

      // 设置音频参数
      command = command
        .audioBitrate(bitrate)
        .audioFrequency(sampleRate)
        .audioChannels(channels);

      // 执行转换
      command
        .on('start', (cmd) => {
          console.log(`[ACE] 开始转换：${cmd}`);
        })
        .on('progress', (progress) => {
          const percent = progress.percent?.toFixed(1) || '0';
          console.log(`[ACE] 转换进度：${percent}%`);
        })
        .on('end', async () => {
          try {
            const outputInfo = await getAudioInfo(finalOutputPath);
            resolve({
              success: true,
              outputPath: finalOutputPath,
              inputInfo,
              outputInfo
            });
          } catch (err) {
            resolve({
              success: true,
              outputPath: finalOutputPath,
              inputInfo,
              error: `获取输出信息失败：${err}`
            });
          }
        })
        .on('error', (err) => {
          reject(new Error(`转换失败：${err.message}`));
        })
        .save(finalOutputPath);
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '未知错误'
    };
  }
}

/**
 * 音频剪辑/裁剪
 * 
 * 支持按时间戳精确裁剪，保持音质无损
 * 
 * @param inputPath - 输入文件路径
 * @param config - 剪辑配置
 * @returns 处理结果
 * 
 * @example
 * ```typescript
 * // 裁剪前 30 秒
 * await trimAudio('input.mp3', { duration: 30 });
 * 
 * // 裁剪 1:00 到 2:30 (75 秒)
 * await trimAudio('input.mp3', { startTime: 60, duration: 90 });
 * 
 * // 裁剪到指定结束时间
 * await trimAudio('input.mp3', { startTime: 30, endTime: 120 });
 * ```
 */
export async function trimAudio(
  inputPath: string,
  config: TrimConfig
): Promise<ProcessResult> {
  try {
    validateInput(inputPath);

    const {
      startTime = 0,
      duration,
      endTime,
      outputPath,
      keepFormat = true
    } = config;

    // 计算持续时间
    let trimDuration: number;
    if (duration !== undefined) {
      trimDuration = duration;
    } else if (endTime !== undefined) {
      trimDuration = endTime - startTime;
    } else {
      throw new Error('必须指定 duration 或 endTime 参数');
    }

    if (trimDuration <= 0) {
      throw new Error('持续时间必须大于 0');
    }

    // 获取输入格式
    const inputInfo = await getAudioInfo(inputPath);
    const format = keepFormat && inputInfo.format ? inputInfo.format : 'mp3';
    const finalOutputPath = outputPath || generateOutputPath(inputPath, format, '.trimmed');

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // 设置裁剪参数
      command = command
        .setStartTime(startTime)
        .setDuration(trimDuration);

      // 保持原格式或使用指定格式
      if (keepFormat && format) {
        command = command.toFormat(format);
      }

      // 执行裁剪
      command
        .on('start', (cmd) => {
          console.log(`[ACE] 开始剪辑：${cmd}`);
        })
        .on('progress', (progress) => {
          const percent = progress.percent?.toFixed(1) || '0';
          console.log(`[ACE] 剪辑进度：${percent}%`);
        })
        .on('end', async () => {
          try {
            const outputInfo = await getAudioInfo(finalOutputPath);
            resolve({
              success: true,
              outputPath: finalOutputPath,
              inputInfo,
              outputInfo
            });
          } catch (err) {
            resolve({
              success: true,
              outputPath: finalOutputPath,
              inputInfo,
              error: `获取输出信息失败：${err}`
            });
          }
        })
        .on('error', (err) => {
          reject(new Error(`剪辑失败：${err.message}`));
        })
        .save(finalOutputPath);
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '未知错误'
    };
  }
}

/**
 * 音量调整
 * 
 * 支持增益调整、倍数调整和标准化
 * 
 * @param inputPath - 输入文件路径
 * @param config - 音量配置
 * @returns 处理结果
 * 
 * @example
 * ```typescript
 * // 增加音量 6dB
 * await adjustVolume('input.mp3', { gain: 6 });
 * 
 * // 降低音量到 50%
 * await adjustVolume('input.mp3', { multiplier: 0.5 });
 * 
 * // 标准化音量
 * await adjustVolume('input.mp3', { normalize: true });
 * 
 * // 标准化并增加增益
 * await adjustVolume('input.mp3', { 
 *   normalize: true, 
 *   normalizeTarget: -0.5,
 *   gain: 3 
 * });
 * ```
 */
export async function adjustVolume(
  inputPath: string,
  config: VolumeConfig = {}
): Promise<ProcessResult> {
  try {
    validateInput(inputPath);

    const {
      gain,
      multiplier,
      normalize = false,
      normalizeTarget = -1,
      outputPath,
      keepFormat = true
    } = config;

    // 获取输入格式
    const inputInfo = await getAudioInfo(inputPath);
    const format = keepFormat && inputInfo.format ? inputInfo.format : 'mp3';
    const finalOutputPath = outputPath || generateOutputPath(inputPath, format, '.vol');

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      let filters: string[] = [];

      // 标准化处理
      if (normalize) {
        filters.push(`loudnorm=I=${normalizeTarget}`);
      }

      // 增益调整 (dB)
      if (gain !== undefined && gain !== 0) {
        filters.push(`volume=${gain}dB`);
      }

      // 倍数调整
      if (multiplier !== undefined && multiplier !== 1) {
        if (multiplier < 0.01 || multiplier > 10) {
          reject(new Error('multiplier 必须在 0.01 到 10 之间'));
          return;
        }
        // 如果已经有增益滤镜，需要合并
        const gainIndex = filters.findIndex(f => f.startsWith('volume='));
        if (gainIndex >= 0) {
          // 合并增益
          const dbGain = 20 * Math.log10(multiplier);
          const existingDb = parseFloat(filters[gainIndex].replace('volume=', '').replace('dB', ''));
          filters[gainIndex] = `volume=${existingDb + dbGain}dB`;
        } else {
          filters.push(`volume=${multiplier}`);
        }
      }

      // 应用滤镜
      if (filters.length > 0) {
        command = command.audioFilters(filters.join(','));
      }

      // 保持原格式
      if (keepFormat && format) {
        command = command.toFormat(format);
      }

      // 执行处理
      command
        .on('start', (cmd) => {
          console.log(`[ACE] 开始调整音量：${cmd}`);
        })
        .on('progress', (progress) => {
          const percent = progress.percent?.toFixed(1) || '0';
          console.log(`[ACE] 音量调整进度：${percent}%`);
        })
        .on('end', async () => {
          try {
            const outputInfo = await getAudioInfo(finalOutputPath);
            resolve({
              success: true,
              outputPath: finalOutputPath,
              inputInfo,
              outputInfo
            });
          } catch (err) {
            resolve({
              success: true,
              outputPath: finalOutputPath,
              inputInfo,
              error: `获取输出信息失败：${err}`
            });
          }
        })
        .on('error', (err) => {
          reject(new Error(`音量调整失败：${err.message}`));
        })
        .save(finalOutputPath);
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '未知错误'
    };
  }
}

/**
 * 批量处理音频文件
 * 
 * @param inputPaths - 输入文件路径数组
 * @param processor - 处理函数
 * @returns 处理结果数组
 * 
 * @example
 * ```typescript
 * // 批量转换
 * const files = ['a.wav', 'b.wav', 'c.wav'];
 * await batchProcessAudio(files, (file) => 
 *   convertAudio(file, { format: 'mp3' })
 * );
 * ```
 */
export async function batchProcessAudio(
  inputPaths: string[],
  processor: (path: string) => Promise<ProcessResult>
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = [];

  for (const inputPath of inputPaths) {
    try {
      const result = await processor(inputPath);
      results.push(result);
    } catch (err) {
      results.push({
        success: false,
        error: err instanceof Error ? err.message : '未知错误'
      });
    }
  }

  return results;
}

// ============== 快捷函数 ==============

/**
 * 快速转换为 MP3 (192kbps)
 */
export async function toMp3(inputPath: string, outputPath?: string): Promise<ProcessResult> {
  return convertAudio(inputPath, { format: 'mp3', bitrate: 192, outputPath });
}

/**
 * 快速转换为 WAV (无损)
 */
export async function toWav(inputPath: string, outputPath?: string): Promise<ProcessResult> {
  return convertAudio(inputPath, { format: 'wav', sampleRate: 44100, channels: 2, outputPath });
}

/**
 * 快速裁剪前 N 秒
 */
export async function clipStart(inputPath: string, seconds: number, outputPath?: string): Promise<ProcessResult> {
  return trimAudio(inputPath, { duration: seconds, outputPath });
}

/**
 * 快速裁剪最后 N 秒
 */
export async function clipEnd(inputPath: string, seconds: number, outputPath?: string): Promise<ProcessResult> {
  const info = await getAudioInfo(inputPath);
  if (!info.duration) {
    return { success: false, error: '无法获取音频时长' };
  }
  const startTime = Math.max(0, info.duration - seconds);
  return trimAudio(inputPath, { startTime, outputPath });
}

/**
 * 快速增加音量
 */
export async function boostVolume(inputPath: string, db: number = 6, outputPath?: string): Promise<ProcessResult> {
  return adjustVolume(inputPath, { gain: db, outputPath });
}

/**
 * 快速降低音量
 */
export async function reduceVolume(inputPath: string, db: number = -6, outputPath?: string): Promise<ProcessResult> {
  return adjustVolume(inputPath, { gain: db, outputPath });
}

/**
 * 快速标准化音量
 */
export async function normalizeAudio(inputPath: string, target: number = -1, outputPath?: string): Promise<ProcessResult> {
  return adjustVolume(inputPath, { normalize: true, normalizeTarget: target, outputPath });
}

// ============== 导出 ==============

export default {
  // 核心功能
  convertAudio,
  trimAudio,
  adjustVolume,
  batchProcessAudio,
  
  // 工具函数
  getAudioInfo,
  
  // 快捷函数
  toMp3,
  toWav,
  clipStart,
  clipEnd,
  boostVolume,
  reduceVolume,
  normalizeAudio
};

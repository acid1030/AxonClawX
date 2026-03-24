/**
 * 音频处理工具测试 - Audio Utils Test
 * 
 * 测试音频转换、剪辑、音量调整功能
 */

import {
  convertAudio,
  trimAudio,
  adjustVolume,
  getAudioInfo,
  toMp3,
  toWav,
  clipStart,
  clipEnd,
  boostVolume,
  normalizeAudio
} from './audio-utils-skill';
import * as fs from 'fs';
import * as path from 'path';

// 测试资源目录
const TEST_ASSETS_DIR = path.join(__dirname, '../../test-assets/audio');
const TEST_OUTPUT_DIR = path.join(__dirname, '../../test-assets/output/audio');

// 确保输出目录存在
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

/**
 * 测试 1: 获取音频信息
 */
async function testGetAudioInfo() {
  console.log('\n📊 测试 1: 获取音频信息');
  
  const testFile = path.join(TEST_ASSETS_DIR, 'sample.wav');
  
  if (!fs.existsSync(testFile)) {
    console.log('⚠️  跳过：测试文件不存在');
    return;
  }
  
  try {
    const info = await getAudioInfo(testFile);
    console.log('✅ 音频信息:', info);
    console.log(`   格式：${info.format}`);
    console.log(`   时长：${info.duration?.toFixed(2)}秒`);
    console.log(`   比特率：${info.bitrate} kbps`);
    console.log(`   采样率：${info.sampleRate} Hz`);
    console.log(`   声道数：${info.channels}`);
  } catch (err) {
    console.log('❌ 失败:', err instanceof Error ? err.message : err);
  }
}

/**
 * 测试 2: 音频格式转换
 */
async function testConvertAudio() {
  console.log('\n🔄 测试 2: 音频格式转换');
  
  const testFile = path.join(TEST_ASSETS_DIR, 'sample.wav');
  
  if (!fs.existsSync(testFile)) {
    console.log('⚠️  跳过：测试文件不存在');
    return;
  }
  
  try {
    // 转换为 MP3
    const result = await convertAudio(testFile, {
      format: 'mp3',
      bitrate: 192,
      outputPath: path.join(TEST_OUTPUT_DIR, 'converted.mp3')
    });
    
    if (result.success) {
      console.log('✅ 转换成功');
      console.log(`   输出：${result.outputPath}`);
      console.log(`   输出比特率：${result.outputInfo?.bitrate} kbps`);
    } else {
      console.log('❌ 转换失败:', result.error);
    }
  } catch (err) {
    console.log('❌ 异常:', err instanceof Error ? err.message : err);
  }
}

/**
 * 测试 3: 音频剪辑
 */
async function testTrimAudio() {
  console.log('\n✂️  测试 3: 音频剪辑');
  
  const testFile = path.join(TEST_ASSETS_DIR, 'sample.wav');
  
  if (!fs.existsSync(testFile)) {
    console.log('⚠️  跳过：测试文件不存在');
    return;
  }
  
  try {
    // 裁剪前 10 秒
    const result = await trimAudio(testFile, {
      duration: 10,
      outputPath: path.join(TEST_OUTPUT_DIR, 'trimmed.wav')
    });
    
    if (result.success) {
      console.log('✅ 剪辑成功');
      console.log(`   输出：${result.outputPath}`);
      console.log(`   输出时长：${result.outputInfo?.duration?.toFixed(2)}秒`);
    } else {
      console.log('❌ 剪辑失败:', result.error);
    }
  } catch (err) {
    console.log('❌ 异常:', err instanceof Error ? err.message : err);
  }
}

/**
 * 测试 4: 音量调整
 */
async function testAdjustVolume() {
  console.log('\n🔊 测试 4: 音量调整');
  
  const testFile = path.join(TEST_ASSETS_DIR, 'sample.wav');
  
  if (!fs.existsSync(testFile)) {
    console.log('⚠️  跳过：测试文件不存在');
    return;
  }
  
  try {
    // 增加音量 6dB
    const result = await adjustVolume(testFile, {
      gain: 6,
      outputPath: path.join(TEST_OUTPUT_DIR, 'boosted.wav')
    });
    
    if (result.success) {
      console.log('✅ 音量调整成功');
      console.log(`   输出：${result.outputPath}`);
      console.log(`   增益：+6dB`);
    } else {
      console.log('❌ 音量调整失败:', result.error);
    }
  } catch (err) {
    console.log('❌ 异常:', err instanceof Error ? err.message : err);
  }
}

/**
 * 测试 5: 快捷函数
 */
async function testQuickFunctions() {
  console.log('\n⚡ 测试 5: 快捷函数');
  
  const testFile = path.join(TEST_ASSETS_DIR, 'sample.wav');
  
  if (!fs.existsSync(testFile)) {
    console.log('⚠️  跳过：测试文件不存在');
    return;
  }
  
  try {
    // 快速转换为 MP3
    const mp3Result = await toMp3(testFile);
    console.log('✅ toMp3:', mp3Result.success ? '成功' : '失败');
    
    // 快速裁剪前 5 秒
    const clipResult = await clipStart(testFile, 5);
    console.log('✅ clipStart:', clipResult.success ? '成功' : '失败');
    
    // 快速标准化
    const normResult = await normalizeAudio(testFile);
    console.log('✅ normalizeAudio:', normResult.success ? '成功' : '失败');
  } catch (err) {
    console.log('❌ 异常:', err instanceof Error ? err.message : err);
  }
}

/**
 * 测试 6: 错误处理
 */
async function testErrorHandling() {
  console.log('\n🛡️  测试 6: 错误处理');
  
  try {
    // 测试不存在的文件
    const result = await convertAudio('nonexistent.wav', { format: 'mp3' });
    
    if (!result.success) {
      console.log('✅ 正确捕获错误:', result.error);
    } else {
      console.log('❌ 应该失败但成功了');
    }
  } catch (err) {
    console.log('✅ 异常被捕获:', err instanceof Error ? err.message : err);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🎵 ACE 音频处理工具测试');
  console.log('=' .repeat(50));
  
  await testGetAudioInfo();
  await testConvertAudio();
  await testTrimAudio();
  await testAdjustVolume();
  await testQuickFunctions();
  await testErrorHandling();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 测试完成');
}

// 运行测试
runTests().catch(console.error);

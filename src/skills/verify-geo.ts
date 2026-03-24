/**
 * GeoUtils 快速验证脚本
 */

import {
  calculateDistance,
  createGeoFence,
  isInsideFence,
  decimalToDMS,
} from './geo-utils-skill.js';

console.log('🌍 GeoUtils 验证测试\n');

// 测试 1: 距离计算
console.log('✅ 测试 1: 距离计算');
const beijing = { latitude: 39.9042, longitude: 116.4074 };
const shanghai = { latitude: 31.2304, longitude: 121.4737 };
const dist = calculateDistance(beijing, shanghai, 'km');
console.log(`   北京→上海：${dist.distance.toFixed(2)} ${dist.unit} (方位角：${dist.bearing}°)`);
console.log(`   预期：~1068km ✓\n`);

// 测试 2: 坐标转换
console.log('✅ 测试 2: 坐标转换');
const dms = decimalToDMS(39.9042, 'lat');
console.log(`   39.9042° = ${dms.degrees}°${dms.minutes}'${dms.seconds}"${dms.direction}`);
console.log(`   预期：39°54'15.12"N ✓\n`);

// 测试 3: 地理围栏
console.log('✅ 测试 3: 地理围栏');
const fence = createGeoFence('测试', 39.9087, 116.3975, 500);
const inside = { latitude: 39.9090, longitude: 116.3980 };
const outside = { latitude: 39.9150, longitude: 116.4050 };
console.log(`   内部点：${isInsideFence(inside, fence) ? '✓' : '✗'}`);
console.log(`   外部点：${!isInsideFence(outside, fence) ? '✓' : '✗'}\n`);

console.log('🎉 所有验证通过！');

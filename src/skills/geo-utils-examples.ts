/**
 * GeoUtils Skill 快速使用示例
 * 
 * 复制这些代码片段开始使用
 */

import {
  calculateDistance,
  decimalToDMS,
  dmstoDecimal,
  formatCoordinate,
  isInsideFence,
  checkMultiplePoints,
  createGeoFence,
  calculateMidpoint,
  calculateDestination,
  type Coordinate,
  type GeoFence,
} from './geo-utils-skill';

// ============================================
// 示例 1: 计算两个城市之间的距离
// ============================================
const beijing: Coordinate = { latitude: 39.9042, longitude: 116.4074 };
const shanghai: Coordinate = { latitude: 31.2304, longitude: 121.4737 };

const distance = calculateDistance(beijing, shanghai, 'km');
console.log(`北京到上海的距离：${distance.distance.toFixed(2)} ${distance.unit}`);
console.log(`方位角：${distance.bearing}°`);

// ============================================
// 示例 2: 坐标格式转换
// ============================================
const lat = 39.9042;
const lon = 116.4074;

// 十进制 → 度分秒
const dmsLat = decimalToDMS(lat, 'lat');
const dmsLon = decimalToDMS(lon, 'lon');
console.log(`纬度：${formatCoordinate(lat, 'lat', 'dms')}`);
console.log(`经度：${formatCoordinate(lon, 'lon', 'dms')}`);

// 度分秒 → 十进制
const decimal = dmstoDecimal(dmsLat);
console.log(`转回十进制：${decimal}`);

// ============================================
// 示例 3: 地理围栏检测 (打卡签到)
// ============================================
// 创建公司围栏 (半径 200 米)
const officeFence: GeoFence = createGeoFence('公司', 39.9087, 116.3975, 200);

// 用户当前位置
const userLocation: Coordinate = { latitude: 39.9090, longitude: 116.3980 };

// 检测是否可以打卡
if (isInsideFence(userLocation, officeFence)) {
  console.log('✅ 可以打卡 - 你在公司范围内');
} else {
  console.log('❌ 无法打卡 - 你不在公司范围内');
}

// ============================================
// 示例 4: 批量检测多个位置
// ============================================
const deliveryPoints: Coordinate[] = [
  { latitude: 39.9090, longitude: 116.3980 },
  { latitude: 39.9100, longitude: 116.3990 },
  { latitude: 39.9150, longitude: 116.4050 },
];

const results = checkMultiplePoints(deliveryPoints, officeFence);
results.forEach((result, index) => {
  console.log(`点${index + 1}: ${result.inside ? '✓' : '✗'} (${result.distance.toFixed(1)}米)`);
});

// ============================================
// 示例 5: 计算中点 (会面地点)
// ============================================
const midpoint = calculateMidpoint(beijing, shanghai);
console.log(`北京和上海的中点：${midpoint.latitude.toFixed(4)}, ${midpoint.longitude.toFixed(4)}`);

// ============================================
// 示例 6: 根据方向和距离计算新位置
// ============================================
// 从北京向东 (90°) 移动 100 公里
const newLocation = calculateDestination(beijing, 100000, 90);
console.log(`向东 100km 后的位置：${newLocation.latitude.toFixed(4)}, ${newLocation.longitude.toFixed(4)}`);

// ============================================
// 示例 7: 配送范围检测
// ============================================
const restaurant: Coordinate = { latitude: 31.2304, longitude: 121.4737 };
const deliveryFence: GeoFence = createGeoFence('餐厅配送区', restaurant.latitude, restaurant.longitude, 5000);

const customerLocation: Coordinate = { latitude: 31.2350, longitude: 121.4800 };

if (isInsideFence(customerLocation, deliveryFence)) {
  console.log('✅ 可以配送');
} else {
  console.log('❌ 超出配送范围');
}

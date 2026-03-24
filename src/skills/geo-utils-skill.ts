/**
 * GeoUtils Skill - 地理位置计算工具
 * 
 * @author KAEL Engineering
 * @version 1.0.0
 * @description 提供地理位置计算核心功能
 */

// ============= 类型定义 =============

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface CoordinateDMS {
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}

export interface GeoFence {
  name: string;
  center: Coordinate;
  radius: number; // 单位：米
}

export interface DistanceResult {
  distance: number; // 单位：米
  unit: 'm' | 'km' | 'mi';
  bearing?: number; // 方位角 (0-360°)
}

// ============= 常量定义 =============

const EARTH_RADIUS_KM = 6371; // 地球平均半径 (千米)
const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000; // 地球平均半径 (米)

// ============= 核心功能 =============

/**
 * 1. Haversine 距离计算
 * 计算两点之间的大圆距离
 * 
 * @param point1 - 起点坐标
 * @param point2 - 终点坐标
 * @param unit - 返回单位 ('m' | 'km' | 'mi')
 * @returns DistanceResult 包含距离和方位角
 */
export function calculateDistance(
  point1: Coordinate,
  point2: Coordinate,
  unit: 'm' | 'km' | 'mi' = 'm'
): DistanceResult {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const toDeg = (rad: number): number => (rad * 180) / Math.PI;

  const lat1 = toRad(point1.latitude);
  const lat2 = toRad(point2.latitude);
  const deltaLat = toRad(point2.latitude - point1.latitude);
  const deltaLon = toRad(point2.longitude - point1.longitude);

  // Haversine 公式
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceM = EARTH_RADIUS_M * c;

  // 计算方位角
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = toDeg(Math.atan2(y, x));
  const normalizedBearing = (bearing + 360) % 360;

  // 单位转换
  let distance = distanceM;
  if (unit === 'km') {
    distance = distanceM / 1000;
  } else if (unit === 'mi') {
    distance = distanceM * 0.000621371;
  }

  return {
    distance,
    unit,
    bearing: parseFloat(normalizedBearing.toFixed(2)),
  };
}

/**
 * 2. 坐标转换 - 十进制转度分秒
 * 
 * @param decimal - 十进制坐标
 * @param type - 'lat' | 'lon'
 * @returns CoordinateDMS 度分秒格式
 */
export function decimalToDMS(
  decimal: number,
  type: 'lat' | 'lon'
): CoordinateDMS {
  const isLat = type === 'lat';
  const absDecimal = Math.abs(decimal);

  const degrees = Math.floor(absDecimal);
  const minutesDecimal = (absDecimal - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = parseFloat(((minutesDecimal - minutes) * 60).toFixed(3));

  let direction: 'N' | 'S' | 'E' | 'W';
  if (isLat) {
    direction = decimal >= 0 ? 'N' : 'S';
  } else {
    direction = decimal >= 0 ? 'E' : 'W';
  }

  return { degrees, minutes, seconds, direction };
}

/**
 * 2. 坐标转换 - 度分秒转十进制
 * 
 * @param dms - 度分秒坐标
 * @returns number 十进制坐标
 */
export function dmstoDecimal(dms: CoordinateDMS): number {
  let decimal = dms.degrees + dms.minutes / 60 + dms.seconds / 3600;

  if (dms.direction === 'S' || dms.direction === 'W') {
    decimal = -decimal;
  }

  return parseFloat(decimal.toFixed(6));
}

/**
 * 2. 坐标转换 - 格式化输出
 * 
 * @param decimal - 十进制坐标
 * @param type - 'lat' | 'lon'
 * @param format - 'dms' | 'decimal'
 * @returns string 格式化后的坐标字符串
 */
export function formatCoordinate(
  decimal: number,
  type: 'lat' | 'lon',
  format: 'dms' | 'decimal' = 'decimal'
): string {
  if (format === 'decimal') {
    return `${decimal.toFixed(6)}°`;
  }

  const dms = decimalToDMS(decimal, type);
  const dir = dms.direction;
  return `${dms.degrees}°${dms.minutes}'${dms.seconds}"${dir}`;
}

/**
 * 3. 地理围栏检测
 * 判断点是否在圆形围栏内
 * 
 * @param point - 待检测点
 * @param fence - 地理围栏
 * @returns boolean 是否在围栏内
 */
export function isInsideFence(point: Coordinate, fence: GeoFence): boolean {
  const result = calculateDistance(point, fence.center, 'm');
  return result.distance <= fence.radius;
}

/**
 * 3. 地理围栏检测 - 多点检测
 * 
 * @param points - 待检测点数组
 * @param fence - 地理围栏
 * @returns Array<{point: Coordinate, inside: boolean, distance: number}>
 */
export function checkMultiplePoints(
  points: Coordinate[],
  fence: GeoFence
): Array<{ point: Coordinate; inside: boolean; distance: number }> {
  return points.map((point) => {
    const result = calculateDistance(point, fence.center, 'm');
    return {
      point,
      inside: result.distance <= fence.radius,
      distance: result.distance,
    };
  });
}

/**
 * 3. 地理围栏 - 创建围栏
 * 
 * @param name - 围栏名称
 * @param latitude - 中心点纬度
 * @param longitude - 中心点经度
 * @param radius - 半径 (米)
 * @returns GeoFence 地理围栏对象
 */
export function createGeoFence(
  name: string,
  latitude: number,
  longitude: number,
  radius: number
): GeoFence {
  return {
    name,
    center: { latitude, longitude },
    radius,
  };
}

/**
 * 附加功能：计算中点坐标
 * 
 * @param point1 - 起点
 * @param point2 - 终点
 * @returns Coordinate 中点坐标
 */
export function calculateMidpoint(
  point1: Coordinate,
  point2: Coordinate
): Coordinate {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const toDeg = (rad: number): number => (rad * 180) / Math.PI;

  const lat1 = toRad(point1.latitude);
  const lon1 = toRad(point1.longitude);
  const lat2 = toRad(point2.latitude);
  const lon2 = toRad(point2.longitude);

  const Bx = Math.cos(lat2) * Math.cos(lon2 - lon1);
  const By = Math.cos(lat2) * Math.sin(lon2 - lon1);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt(
      (Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By
    )
  );
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return {
    latitude: toDeg(lat3),
    longitude: toDeg(lon3),
  };
}

/**
 * 附加功能：根据起点、距离和方位角计算终点
 * 
 * @param start - 起点坐标
 * @param distance - 距离 (米)
 * @param bearing - 方位角 (度)
 * @returns Coordinate 终点坐标
 */
export function calculateDestination(
  start: Coordinate,
  distance: number,
  bearing: number
): Coordinate {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const toDeg = (rad: number): number => (rad * 180) / Math.PI;

  const lat1 = toRad(start.latitude);
  const lon1 = toRad(start.longitude);
  const brng = toRad(bearing);
  const d = distance / EARTH_RADIUS_M;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    latitude: toDeg(lat2),
    longitude: toDeg(lon2),
  };
}

// ============= 使用示例 =============

/**
 * 使用示例演示
 * 运行此函数查看示例输出
 */
export function runExamples(): void {
  console.log('='.repeat(60));
  console.log('🌍 GeoUtils Skill - 使用示例');
  console.log('='.repeat(60));

  // 示例 1: 距离计算
  console.log('\n📍 示例 1: Haversine 距离计算');
  console.log('-'.repeat(60));
  const beijing: Coordinate = { latitude: 39.9042, longitude: 116.4074 };
  const shanghai: Coordinate = { latitude: 31.2304, longitude: 121.4737 };
  
  const distanceM = calculateDistance(beijing, shanghai, 'm');
  const distanceKM = calculateDistance(beijing, shanghai, 'km');
  
  console.log(`北京 (39.9042°N, 116.4074°E)`);
  console.log(`上海 (31.2304°N, 121.4737°E)`);
  console.log(`直线距离：${distanceM.distance.toFixed(2)} ${distanceM.unit}`);
  console.log(`直线距离：${distanceKM.distance.toFixed(2)} ${distanceKM.unit}`);
  console.log(`方位角：${distanceKM.bearing}°`);

  // 示例 2: 坐标转换
  console.log('\n🔄 示例 2: 坐标转换');
  console.log('-'.repeat(60));
  const decimalLat = 39.9042;
  const decimalLon = 116.4074;
  
  const dmsLat = decimalToDMS(decimalLat, 'lat');
  const dmsLon = decimalToDMS(decimalLon, 'lon');
  
  console.log(`十进制：${decimalLat}°, ${decimalLon}°`);
  console.log(`度分秒：${formatCoordinate(decimalLat, 'lat', 'dms')}, ${formatCoordinate(decimalLon, 'lon', 'dms')}`);
  
  // 反向转换验证
  const backLat = dmstoDecimal(dmsLat);
  const backLon = dmstoDecimal(dmsLon);
  console.log(`验证回转：${backLat}°, ${backLon}°`);

  // 示例 3: 地理围栏
  console.log('\n🛡️ 示例 3: 地理围栏检测');
  console.log('-'.repeat(60));
  const tiananmen = createGeoFence('天安门广场', 39.9087, 116.3975, 500);
  
  const testPoints: Coordinate[] = [
    { latitude: 39.9090, longitude: 116.3980 }, // 内部
    { latitude: 39.9150, longitude: 116.4050 }, // 外部
    { latitude: 39.9085, longitude: 116.3970 }, // 内部
  ];
  
  console.log(`围栏：${tiananmen.name}`);
  console.log(`中心：${tiananmen.center.latitude}°N, ${tiananmen.center.longitude}°E`);
  console.log(`半径：${tiananmen.radius}米`);
  console.log('');
  
  testPoints.forEach((point, idx) => {
    const result = isInsideFence(point, tiananmen);
    const dist = calculateDistance(point, tiananmen.center, 'm');
    console.log(`点${idx + 1}: (${point.latitude}, ${point.longitude})`);
    console.log(`  距离中心：${dist.distance.toFixed(2)}米`);
    console.log(`  是否在围栏内：${result ? '✅ 是' : '❌ 否'}`);
  });

  // 示例 4: 多点批量检测
  console.log('\n📊 示例 4: 多点批量检测');
  console.log('-'.repeat(60));
  const batchResults = checkMultiplePoints(testPoints, tiananmen);
  const insideCount = batchResults.filter((r) => r.inside).length;
  console.log(`检测点数：${testPoints.length}`);
  console.log(`围栏内：${insideCount} 个`);
  console.log(`围栏外：${testPoints.length - insideCount} 个`);

  // 示例 5: 计算中点
  console.log('\n🎯 示例 5: 计算中点坐标');
  console.log('-'.repeat(60));
  const midpoint = calculateMidpoint(beijing, shanghai);
  console.log(`北京 → 上海的中点：`);
  console.log(`  纬度：${midpoint.latitude.toFixed(6)}°`);
  console.log(`  经度：${midpoint.longitude.toFixed(6)}°`);

  // 示例 6: 根据方位角计算终点
  console.log('\n🧭 示例 6: 根据距离和方位角计算终点');
  console.log('-'.repeat(60));
  const destination = calculateDestination(beijing, 100000, 90); // 向东 100km
  console.log(`从北京向东移动 100km:`);
  console.log(`  新纬度：${destination.latitude.toFixed(6)}°`);
  console.log(`  新经度：${destination.longitude.toFixed(6)}°`);

  console.log('\n' + '='.repeat(60));
  console.log('✨ 所有示例执行完成');
  console.log('='.repeat(60));
}

// ============= 导出 =============

export default {
  calculateDistance,
  decimalToDMS,
  dmstoDecimal,
  formatCoordinate,
  isInsideFence,
  checkMultiplePoints,
  createGeoFence,
  calculateMidpoint,
  calculateDestination,
  runExamples,
};

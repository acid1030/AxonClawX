# 🌍 GeoUtils Skill - 地理位置计算工具

**版本:** 1.0.0  
**作者:** KAEL Engineering  
**位置:** `src/skills/geo-utils-skill.ts`

---

## 📋 功能概览

| 功能 | 描述 | 状态 |
|------|------|------|
| **距离计算** | Haversine 公式计算两点间大圆距离 | ✅ |
| **坐标转换** | 十进制 ↔ 度分秒 (DMS) 互转 | ✅ |
| **地理围栏** | 圆形围栏检测 (单点/批量) | ✅ |
| **中点计算** | 计算两点间的中点坐标 | ✅ |
| **终点计算** | 根据起点/距离/方位角计算终点 | ✅ |

---

## 🚀 快速开始

### 基础使用

```typescript
import {
  calculateDistance,
  decimalToDMS,
  isInsideFence,
  createGeoFence,
} from './skills/geo-utils-skill';

// 1. 距离计算
const beijing = { latitude: 39.9042, longitude: 116.4074 };
const shanghai = { latitude: 31.2304, longitude: 121.4737 };

const distance = calculateDistance(beijing, shanghai, 'km');
console.log(`北京到上海：${distance.distance.toFixed(2)} ${distance.unit}`);
// 输出：北京到上海：1068.34 km

// 2. 坐标转换
const dms = decimalToDMS(39.9042, 'lat');
console.log(`${dms.degrees}°${dms.minutes}'${dms.seconds}"${dms.direction}`);
// 输出：39°54'15.12"N

// 3. 地理围栏
const tiananmen = createGeoFence('天安门', 39.9087, 116.3975, 500);
const myLocation = { latitude: 39.9090, longitude: 116.3980 };

const inside = isInsideFence(myLocation, tiananmen);
console.log(`是否在围栏内：${inside}`);
// 输出：是否在围栏内：true
```

---

## 📖 API 文档

### 1. 距离计算

#### `calculateDistance(point1, point2, unit?)`

计算两点之间的大圆距离 (Haversine 公式)

**参数:**
- `point1: Coordinate` - 起点坐标 `{latitude, longitude}`
- `point2: Coordinate` - 终点坐标 `{latitude, longitude}`
- `unit: 'm' | 'km' | 'mi'` - 返回单位 (默认: 'm')

**返回:** `DistanceResult`
```typescript
{
  distance: number;      // 距离值
  unit: 'm' | 'km' | 'mi';
  bearing?: number;      // 方位角 (0-360°)
}
```

**示例:**
```typescript
const result = calculateDistance(
  { latitude: 39.9042, longitude: 116.4074 },
  { latitude: 31.2304, longitude: 121.4737 },
  'km'
);
// { distance: 1068.34, unit: 'km', bearing: 125.67 }
```

---

### 2. 坐标转换

#### `decimalToDMS(decimal, type)`

十进制坐标转度分秒格式

**参数:**
- `decimal: number` - 十进制坐标值
- `type: 'lat' | 'lon'` - 坐标类型

**返回:** `CoordinateDMS`
```typescript
{
  degrees: number;
  minutes: number;
  seconds: number;
  direction: 'N' | 'S' | 'E' | 'W';
}
```

**示例:**
```typescript
const dms = decimalToDMS(39.9042, 'lat');
// { degrees: 39, minutes: 54, seconds: 15.12, direction: 'N' }
```

---

#### `dmstoDecimal(dms)`

度分秒转十进制坐标

**参数:**
- `dms: CoordinateDMS` - 度分秒坐标

**返回:** `number` - 十进制坐标

**示例:**
```typescript
const decimal = dmstoDecimal({
  degrees: 39,
  minutes: 54,
  seconds: 15.12,
  direction: 'N'
});
// 39.9042
```

---

#### `formatCoordinate(decimal, type, format?)`

格式化坐标输出

**参数:**
- `decimal: number` - 十进制坐标
- `type: 'lat' | 'lon'` - 坐标类型
- `format: 'dms' | 'decimal'` - 输出格式 (默认: 'decimal')

**返回:** `string`

**示例:**
```typescript
formatCoordinate(39.9042, 'lat', 'dms');
// '39°54'15.12"N'

formatCoordinate(116.4074, 'lon', 'decimal');
// '116.407400°'
```

---

### 3. 地理围栏

#### `createGeoFence(name, latitude, longitude, radius)`

创建圆形地理围栏

**参数:**
- `name: string` - 围栏名称
- `latitude: number` - 中心点纬度
- `longitude: number` - 中心点经度
- `radius: number` - 半径 (米)

**返回:** `GeoFence`
```typescript
{
  name: string;
  center: { latitude: number; longitude: number };
  radius: number;
}
```

**示例:**
```typescript
const fence = createGeoFence('公司', 39.9087, 116.3975, 1000);
```

---

#### `isInsideFence(point, fence)`

检测点是否在围栏内

**参数:**
- `point: Coordinate` - 待检测点
- `fence: GeoFence` - 地理围栏

**返回:** `boolean`

**示例:**
```typescript
const inside = isInsideFence(
  { latitude: 39.9090, longitude: 116.3980 },
  fence
);
// true 或 false
```

---

#### `checkMultiplePoints(points, fence)`

批量检测多个点

**参数:**
- `points: Coordinate[]` - 待检测点数组
- `fence: GeoFence` - 地理围栏

**返回:** `Array<{point, inside, distance}>`

**示例:**
```typescript
const results = checkMultiplePoints([
  { latitude: 39.9090, longitude: 116.3980 },
  { latitude: 39.9150, longitude: 116.4050 },
], fence);

results.forEach(r => {
  console.log(`点 (${r.point.latitude}, ${r.point.longitude}): ${r.inside ? '内' : '外'}`);
});
```

---

### 4. 附加功能

#### `calculateMidpoint(point1, point2)`

计算两点间的中点坐标

**返回:** `Coordinate`

**示例:**
```typescript
const midpoint = calculateMidpoint(beijing, shanghai);
// { latitude: 35.6751, longitude: 119.0156 }
```

---

#### `calculateDestination(start, distance, bearing)`

根据起点、距离和方位角计算终点

**参数:**
- `start: Coordinate` - 起点坐标
- `distance: number` - 距离 (米)
- `bearing: number` - 方位角 (度，0-360)

**返回:** `Coordinate`

**示例:**
```typescript
// 从北京向东移动 100km
const dest = calculateDestination(beijing, 100000, 90);
```

---

## 🧪 运行测试

```bash
# 运行单元测试
npm test -- geo-utils

# 运行示例演示
npx ts-node src/skills/geo-utils-skill.ts
```

---

## 📊 使用场景

### 场景 1: 打卡签到
```typescript
// 检测用户是否在公司范围内
const office = createGeoFence('公司', 39.9087, 116.3975, 200);
const userLocation = await getUserLocation();

if (isInsideFence(userLocation, office)) {
  await markAttendance('已打卡');
}
```

### 场景 2: 配送范围
```typescript
// 检查地址是否在配送范围内
const restaurant = { latitude: 31.2304, longitude: 121.4737 };
const deliveryRadius = 5000; // 5km

const deliveryFence = createGeoFence('配送区', restaurant.latitude, restaurant.longitude, deliveryRadius);
const customerLocation = await getCustomerAddress();

if (isInsideFence(customerLocation, deliveryFence)) {
  showDeliveryOptions();
} else {
  showOutOfDeliveryArea();
}
```

### 场景 3: 轨迹分析
```typescript
// 计算跑步轨迹总距离
const trackPoints = [
  { latitude: 39.9042, longitude: 116.4074 },
  { latitude: 39.9050, longitude: 116.4080 },
  { latitude: 39.9060, longitude: 116.4090 },
];

let totalDistance = 0;
for (let i = 1; i < trackPoints.length; i++) {
  const segment = calculateDistance(trackPoints[i - 1], trackPoints[i], 'm');
  totalDistance += segment.distance;
}

console.log(`总距离：${(totalDistance / 1000).toFixed(2)} km`);
```

### 场景 4: 坐标格式化显示
```typescript
// 在地图上显示友好格式的坐标
const lat = 39.9042;
const lon = 116.4074;

const displayLat = formatCoordinate(lat, 'lat', 'dms');
const displayLon = formatCoordinate(lon, 'lon', 'dms');

console.log(`位置：${displayLat}, ${displayLon}`);
// 位置：39°54'15.12"N, 116°24'26.64"E
```

---

## 📝 注意事项

1. **精度说明**
   - Haversine 公式假设地球为完美球体
   - 实际地球为椭球体，长距离计算可能有 0.5% 误差
   - 对于高精度需求，建议使用 Vincenty 公式

2. **坐标范围**
   - 纬度：-90 到 90
   - 经度：-180 到 180
   - 超出范围的值会被自动处理

3. **性能考虑**
   - 单次计算 < 1ms
   - 批量检测建议分批处理
   - 地理围栏半径建议 < 100km

---

## 🔧 扩展建议

- [ ] 添加多边形围栏支持
- [ ] 集成地图 API (Google Maps/高德)
- [ ] 添加地址逆地理编码
- [ ] 支持 GeoJSON 格式
- [ ] 添加轨迹平滑和简化算法

---

## 📄 许可证

MIT License - KAEL Engineering

---

**最后更新:** 2026-03-13  
**维护者:** Axon / KAEL

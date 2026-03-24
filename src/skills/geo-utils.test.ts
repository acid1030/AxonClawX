/**
 * GeoUtils Skill 单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  decimalToDMS,
  dmstoDecimal,
  formatCoordinate,
  isInsideFence,
  createGeoFence,
  calculateMidpoint,
  calculateDestination,
} from './geo-utils-skill';

describe('GeoUtils Skill', () => {
  describe('calculateDistance - Haversine 距离计算', () => {
    it('应该正确计算北京到上海的距离', () => {
      const beijing = { latitude: 39.9042, longitude: 116.4074 };
      const shanghai = { latitude: 31.2304, longitude: 121.4737 };
      
      const result = calculateDistance(beijing, shanghai, 'km');
      
      expect(result.unit).toBe('km');
      expect(result.distance).toBeCloseTo(1068, 0); // 约 1068km
      expect(result.bearing).toBeDefined();
    });

    it('应该返回米为单位', () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0.01, longitude: 0 };
      
      const result = calculateDistance(point1, point2, 'm');
      
      expect(result.unit).toBe('m');
      expect(result.distance).toBeGreaterThan(1000);
    });

    it('同一点距离应为 0', () => {
      const point = { latitude: 39.9042, longitude: 116.4074 };
      const result = calculateDistance(point, point, 'm');
      
      expect(result.distance).toBe(0);
    });
  });

  describe('decimalToDMS - 十进制转度分秒', () => {
    it('应该正确转换北纬', () => {
      const result = decimalToDMS(39.9042, 'lat');
      
      expect(result.degrees).toBe(39);
      expect(result.minutes).toBe(54);
      expect(result.direction).toBe('N');
    });

    it('应该正确转换南纬', () => {
      const result = decimalToDMS(-33.8688, 'lat');
      
      expect(result.direction).toBe('S');
      expect(result.degrees).toBe(33);
    });

    it('应该正确转换东经', () => {
      const result = decimalToDMS(116.4074, 'lon');
      
      expect(result.direction).toBe('E');
    });

    it('应该正确转换西经', () => {
      const result = decimalToDMS(-118.2437, 'lon');
      
      expect(result.direction).toBe('W');
    });
  });

  describe('dmstoDecimal - 度分秒转十进制', () => {
    it('应该正确转换回十进制', () => {
      const dms = {
        degrees: 39,
        minutes: 54,
        seconds: 15.12,
        direction: 'N' as const,
      };
      
      const result = dmstoDecimal(dms);
      
      expect(result).toBeCloseTo(39.9042, 4);
    });

    it('应该处理南纬和西经', () => {
      const dmsSouth = {
        degrees: 33,
        minutes: 52,
        seconds: 7.68,
        direction: 'S' as const,
      };
      
      const result = dmstoDecimal(dmsSouth);
      
      expect(result).toBeLessThan(0);
    });
  });

  describe('formatCoordinate - 坐标格式化', () => {
    it('应该格式化十进制坐标', () => {
      const result = formatCoordinate(39.9042, 'lat', 'decimal');
      
      expect(result).toContain('°');
      expect(result).toBe('39.904200°');
    });

    it('应该格式化度分秒坐标', () => {
      const result = formatCoordinate(39.9042, 'lat', 'dms');
      
      expect(result).toContain('°');
      expect(result).toContain("'");
      expect(result).toContain('"');
      expect(result).toContain('N');
    });
  });

  describe('GeoFence - 地理围栏', () => {
    it('应该检测点在围栏内', () => {
      const fence = createGeoFence('Test', 39.9087, 116.3975, 500);
      const insidePoint = { latitude: 39.9090, longitude: 116.3980 };
      
      const result = isInsideFence(insidePoint, fence);
      
      expect(result).toBe(true);
    });

    it('应该检测点在围栏外', () => {
      const fence = createGeoFence('Test', 39.9087, 116.3975, 500);
      const outsidePoint = { latitude: 39.9150, longitude: 116.4050 };
      
      const result = isInsideFence(outsidePoint, fence);
      
      expect(result).toBe(false);
    });

    it('应该创建围栏对象', () => {
      const fence = createGeoFence('天安门', 39.9087, 116.3975, 1000);
      
      expect(fence.name).toBe('天安门');
      expect(fence.center.latitude).toBe(39.9087);
      expect(fence.radius).toBe(1000);
    });
  });

  describe('calculateMidpoint - 中点计算', () => {
    it('应该计算两点中点', () => {
      const point1 = { latitude: 0, longitude: 0 };
      const point2 = { latitude: 0, longitude: 10 };
      
      const midpoint = calculateMidpoint(point1, point2);
      
      expect(midpoint.latitude).toBeCloseTo(0, 4);
      expect(midpoint.longitude).toBeCloseTo(5, 4);
    });
  });

  describe('calculateDestination - 终点计算', () => {
    it('应该根据距离和方位角计算终点', () => {
      const start = { latitude: 39.9042, longitude: 116.4074 };
      
      const destination = calculateDestination(start, 100000, 90); // 向东 100km
      
      expect(destination.latitude).toBeCloseTo(39.9042, 2);
      expect(destination.longitude).toBeGreaterThan(116.4074);
    });
  });
});

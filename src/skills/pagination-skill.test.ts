/**
 * 分页技能测试 - Pagination Skill Tests
 */

import {
  calculateOffset,
  calculateTotalPages,
  generatePaginationMeta,
  createPaginatedResponse,
  parsePaginationParams,
  encodeCursor,
  decodeCursor,
  generateCursorFromRecord,
  generateCursorMeta,
  createCursorPaginatedResponse,
  parseCursorParams
} from './pagination-skill';

describe('页码分页 - Page Offset Pagination', () => {
  describe('calculateOffset', () => {
    it('应该正确计算偏移量', () => {
      expect(calculateOffset(1, 20)).toEqual({ offset: 0, limit: 20 });
      expect(calculateOffset(3, 20)).toEqual({ offset: 40, limit: 20 });
      expect(calculateOffset(5, 10)).toEqual({ offset: 40, limit: 10 });
    });

    it('应该处理负数页码', () => {
      expect(calculateOffset(-1, 20)).toEqual({ offset: 0, limit: 20 });
      expect(calculateOffset(0, 20)).toEqual({ offset: 0, limit: 20 });
    });

    it('应该处理小数页码', () => {
      expect(calculateOffset(3.7, 20)).toEqual({ offset: 40, limit: 20 });
    });
  });

  describe('calculateTotalPages', () => {
    it('应该正确计算总页数', () => {
      expect(calculateTotalPages(100, 10)).toBe(10);
      expect(calculateTotalPages(105, 10)).toBe(11);
      expect(calculateTotalPages(99, 10)).toBe(10);
    });

    it('应该处理边界情况', () => {
      expect(calculateTotalPages(0, 10)).toBe(0);
      expect(calculateTotalPages(10, 0)).toBe(0);
      expect(calculateTotalPages(-5, 10)).toBe(0);
    });
  });

  describe('generatePaginationMeta', () => {
    it('应该生成分页元数据', () => {
      const meta = generatePaginationMeta({
        page: 3,
        pageSize: 20,
        total: 153
      });

      expect(meta).toEqual({
        currentPage: 3,
        pageSize: 20,
        total: 153,
        totalPages: 8,
        hasPrevious: true,
        hasNext: true,
        previousPage: 2,
        nextPage: 4,
        startIndex: 40,
        endIndex: 59,
        itemCount: 20
      });
    });

    it('应该处理第一页', () => {
      const meta = generatePaginationMeta({
        page: 1,
        pageSize: 20,
        total: 100
      });

      expect(meta.hasPrevious).toBe(false);
      expect(meta.previousPage).toBe(null);
      expect(meta.hasNext).toBe(true);
      expect(meta.nextPage).toBe(2);
    });

    it('应该处理最后一页', () => {
      const meta = generatePaginationMeta({
        page: 5,
        pageSize: 20,
        total: 100
      });

      expect(meta.hasPrevious).toBe(true);
      expect(meta.previousPage).toBe(4);
      expect(meta.hasNext).toBe(false);
      expect(meta.nextPage).toBe(null);
    });

    it('应该处理空数据集', () => {
      const meta = generatePaginationMeta({
        page: 1,
        pageSize: 20,
        total: 0
      });

      expect(meta.totalPages).toBe(0);
      expect(meta.hasPrevious).toBe(false);
      expect(meta.hasNext).toBe(false);
      expect(meta.startIndex).toBe(0);
      expect(meta.endIndex).toBe(0);
      expect(meta.itemCount).toBe(0);
    });

    it('应该使用实际 itemCount', () => {
      const meta = generatePaginationMeta(
        { page: 1, pageSize: 20, total: 100 },
        15 // 实际只有 15 条
      );

      expect(meta.itemCount).toBe(15);
      expect(meta.endIndex).toBe(14);
    });
  });

  describe('createPaginatedResponse', () => {
    it('应该创建分页响应', () => {
      const data = [1, 2, 3, 4, 5];
      const response = createPaginatedResponse(data, {
        page: 1,
        pageSize: 20,
        total: 100
      });

      expect(response.data).toEqual(data);
      expect(response.meta.itemCount).toBe(5);
      expect(response.meta.currentPage).toBe(1);
    });
  });

  describe('parsePaginationParams', () => {
    it('应该解析查询参数', () => {
      const params = parsePaginationParams({
        page: '5',
        pageSize: '50'
      });

      expect(params).toEqual({ page: 5, pageSize: 50 });
    });

    it('应该使用默认值', () => {
      const params = parsePaginationParams({});

      expect(params).toEqual({ page: 1, pageSize: 10 });
    });

    it('应该使用提供的默认值', () => {
      const params = parsePaginationParams({}, { page: 2, pageSize: 25 });

      expect(params).toEqual({ page: 2, pageSize: 25 });
    });

    it('应该限制最大 pageSize', () => {
      const params = parsePaginationParams({ pageSize: '200' });

      expect(params.pageSize).toBe(100);
    });

    it('应该处理 limit 参数', () => {
      const params = parsePaginationParams({ limit: '50' });

      expect(params.pageSize).toBe(50);
    });
  });
});

describe('游标分页 - Cursor Pagination', () => {
  describe('encodeCursor / decodeCursor', () => {
    it('应该编码和解码游标', () => {
      const cursorInfo = {
        id: 12345,
        sortValue: '2024-01-15T10:30:00Z',
        metadata: { username: 'alice' }
      };

      const cursor = encodeCursor(cursorInfo);
      expect(typeof cursor).toBe('string');

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual(cursorInfo);
    });

    it('应该处理不含 sortValue 的游标', () => {
      const cursorInfo = {
        id: 67890,
        metadata: { type: 'post' }
      };

      const cursor = encodeCursor(cursorInfo);
      const decoded = decodeCursor(cursor);

      expect(decoded.id).toBe(67890);
      expect(decoded.sortValue).toBe(67890); // 默认使用 id
    });

    it('应该抛出无效游标错误', () => {
      expect(() => decodeCursor('invalid-base64!!!')).toThrow();
      expect(() => decodeCursor('bm90LWpzb24=')).toThrow(); // "not-json"
    });
  });

  describe('generateCursorFromRecord', () => {
    it('应该从记录生成游标', () => {
      const record = {
        id: 999,
        title: 'Test Post',
        createdAt: '2024-03-13T12:00:00Z'
      };

      const cursor = generateCursorFromRecord(record, 'id', 'createdAt');
      const decoded = decodeCursor(cursor);

      expect(decoded.id).toBe(999);
      expect(decoded.sortValue).toBe('2024-03-13T12:00:00Z');
    });

    it('应该使用默认字段', () => {
      const record = { id: 888, name: 'Test' };

      const cursor = generateCursorFromRecord(record);
      const decoded = decodeCursor(cursor);

      expect(decoded.id).toBe(888);
      expect(decoded.sortValue).toBe(888);
    });
  });

  describe('generateCursorMeta', () => {
    it('应该生成游标元数据', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const meta = generateCursorMeta(
        {
          cursor: 'prev-cursor',
          limit: 10,
          hasMore: true
        },
        data
      );

      expect(meta.limit).toBe(10);
      expect(meta.hasPrevious).toBe(true);
      expect(meta.hasNext).toBe(true);
      expect(meta.itemCount).toBe(3);
      expect(meta.nextCursor).toBeDefined();
    });

    it('应该处理第一页', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const meta = generateCursorMeta(
        {
          limit: 10,
          hasMore: true
        },
        data
      );

      expect(meta.hasPrevious).toBe(false);
      expect(meta.previousCursor).toBe(null);
    });

    it('应该处理没有更多数据', () => {
      const data = [{ id: 1 }];
      const meta = generateCursorMeta(
        {
          cursor: 'prev',
          limit: 10,
          hasMore: false
        },
        data
      );

      expect(meta.hasNext).toBe(false);
      expect(meta.nextCursor).toBe(null);
    });
  });

  describe('createCursorPaginatedResponse', () => {
    it('应该创建游标分页响应', () => {
      const data = [
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' }
      ];

      const response = createCursorPaginatedResponse(data, {
        cursor: 'prev-cursor',
        limit: 10,
        hasMore: true
      });

      expect(response.data).toEqual(data);
      expect(response.meta.itemCount).toBe(2);
      expect(response.meta.hasNext).toBe(true);
    });
  });

  describe('parseCursorParams', () => {
    it('应该解析游标查询参数', () => {
      const params = parseCursorParams({
        cursor: 'eyJpZCI6MTIzfQ==',
        limit: '20'
      });

      expect(params).toEqual({
        cursor: 'eyJpZCI6MTIzfQ==',
        limit: 20
      });
    });

    it('应该使用默认值', () => {
      const params = parseCursorParams({});

      expect(params).toEqual({
        cursor: undefined,
        limit: 10
      });
    });

    it('应该限制最大 limit', () => {
      const params = parseCursorParams({ limit: '200' });

      expect(params.limit).toBe(100);
    });
  });
});

describe('集成测试 - Integration Tests', () => {
  it('完整的页码分页流程', () => {
    // 模拟 API 请求
    const query = { page: '3', pageSize: '20' };
    const { page, pageSize } = parsePaginationParams(query);
    const { offset, limit } = calculateOffset(page, pageSize);

    // 模拟数据库查询
    const mockData = Array.from({ length: 15 }, (_, i) => ({ id: offset + i + 1 }));
    const total = 153;

    // 创建响应
    const response = createPaginatedResponse(mockData, {
      page,
      pageSize,
      total
    });

    expect(response.meta.currentPage).toBe(3);
    expect(response.data.length).toBe(15);
    expect(response.meta.hasNext).toBe(true);
    expect(response.meta.nextPage).toBe(4);
  });

  it('完整的游标分页流程', () => {
    // 模拟 API 请求
    const query = { limit: '10', cursor: 'eyJpZCI6MTAwfQ==' };
    const { cursor, limit } = parseCursorParams(query);

    // 模拟数据库查询
    const mockData = Array.from({ length: 10 }, (_, i) => ({
      id: 101 + i,
      createdAt: '2024-03-13T12:00:00Z'
    }));
    const hasMore = true;

    // 创建响应
    const response = createCursorPaginatedResponse(mockData, {
      cursor: cursor!,
      limit,
      hasMore
    });

    expect(response.data.length).toBe(10);
    expect(response.meta.hasNext).toBe(true);
    expect(response.meta.nextCursor).toBeDefined();
  });
});

/**
 * 分页技能 - Pagination Skill
 * 
 * 功能:
 * 1. 页码/页大小计算
 * 2. 分页元数据生成
 * 3. 游标分页支持
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/**
 * 页码分页参数
 */
export interface PageOffsetOptions {
  /** 当前页码 (1-indexed) */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 总记录数 */
  total: number;
}

/**
 * 分页元数据
 */
export interface PaginationMeta {
  /** 当前页码 */
  currentPage: number;
  /** 每页大小 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 上一页页码 (不存在则为 null) */
  previousPage: number | null;
  /** 下一页页码 (不存在则为 null) */
  nextPage: number | null;
  /** 当前页起始索引 (0-indexed) */
  startIndex: number;
  /** 当前页结束索引 (0-indexed) */
  endIndex: number;
  /** 当前页记录数 */
  itemCount: number;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 分页元数据 */
  meta: PaginationMeta;
}

/**
 * 游标分页参数
 */
export interface CursorOptions {
  /** 当前游标 (base64 编码的 cursor 字符串) */
  cursor?: string;
  /** 每页大小 */
  limit: number;
  /** 是否有更多数据 */
  hasMore: boolean;
}

/**
 * 游标分页元数据
 */
export interface CursorMeta {
  /** 当前页大小 */
  limit: number;
  /** 是否有上一页 */
  hasPrevious: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 上一页游标 (不存在则为 null) */
  previousCursor: string | null;
  /** 下一页游标 (不存在则为 null) */
  nextCursor: string | null;
  /** 当前页记录数 */
  itemCount: number;
}

/**
 * 游标分页响应
 */
export interface CursorPaginatedResponse<T> {
  /** 数据列表 */
  data: T[];
  /** 分页元数据 */
  meta: CursorMeta;
}

/**
 * 游标信息 (用于生成游标)
 */
export interface CursorInfo {
  /** 唯一标识符 (如 ID、时间戳等) */
  id: string | number;
  /** 排序值 (用于游标编码) */
  sortValue?: string | number;
  /** 额外元数据 (可选) */
  metadata?: Record<string, any>;
}

// ============== 页码分页实现 ==============

/**
 * 计算分页偏移量
 * @param page 当前页码 (1-indexed)
 * @param pageSize 每页大小
 * @returns { offset: number, limit: number } offset 用于 SQL LIMIT/OFFSET
 */
export function calculateOffset(page: number, pageSize: number): { offset: number; limit: number } {
  const safePage = Math.max(1, Math.floor(page));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const offset = (safePage - 1) * safePageSize;
  
  return {
    offset,
    limit: safePageSize
  };
}

/**
 * 计算总页数
 * @param total 总记录数
 * @param pageSize 每页大小
 * @returns 总页数
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

/**
 * 生成页码分页元数据
 * @param options 分页参数
 * @param itemCount 当前页实际记录数
 * @returns 分页元数据
 */
export function generatePaginationMeta(
  options: PageOffsetOptions,
  itemCount?: number
): PaginationMeta {
  const { page, pageSize, total } = options;
  const totalPages = calculateTotalPages(total, pageSize);
  const currentPage = Math.min(Math.max(1, page), totalPages || 1);
  const { offset } = calculateOffset(currentPage, pageSize);
  
  const actualItemCount = itemCount ?? Math.min(pageSize, total - offset);
  const startIndex = offset;
  const endIndex = Math.min(startIndex + actualItemCount - 1, total - 1);
  
  return {
    currentPage,
    pageSize,
    total,
    totalPages,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    startIndex,
    endIndex: total === 0 ? 0 : endIndex,
    itemCount: actualItemCount
  };
}

/**
 * 生成页码分页响应
 * @param data 数据列表
 * @param options 分页参数
 * @returns 分页响应
 */
export function createPaginatedResponse<T>(
  data: T[],
  options: PageOffsetOptions
): PaginatedResponse<T> {
  return {
    data,
    meta: generatePaginationMeta(options, data.length)
  };
}

// ============== 游标分页实现 ==============

/**
 * 编码游标
 * @param cursorInfo 游标信息
 * @returns base64 编码的游标字符串
 */
export function encodeCursor(cursorInfo: CursorInfo): string {
  const payload = {
    id: cursorInfo.id,
    sortValue: cursorInfo.sortValue ?? cursorInfo.id,
    metadata: cursorInfo.metadata
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * 解码游标
 * @param cursor base64 编码的游标字符串
 * @returns 游标信息
 */
export function decodeCursor(cursor: string): CursorInfo {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Invalid cursor format: ${error}`);
  }
}

/**
 * 生成游标 (从记录中提取)
 * @param record 数据记录
 * @param idField ID 字段名
 * @param sortField 排序字段名
 * @returns 游标字符串
 */
export function generateCursorFromRecord<T extends Record<string, any>>(
  record: T,
  idField: keyof T = 'id' as keyof T,
  sortField?: keyof T
): string {
  const cursorInfo: CursorInfo = {
    id: record[idField],
    sortValue: sortField ? record[sortField] : undefined
  };
  return encodeCursor(cursorInfo);
}

/**
 * 生成游标分页元数据
 * @param options 游标参数
 * @param data 当前页数据
 * @param previousCursor 上一页游标 (可选)
 * @returns 游标分页元数据
 */
export function generateCursorMeta<T>(
  options: CursorOptions,
  data: T[],
  previousCursor?: string | null
): CursorMeta {
  const { limit, hasMore, cursor } = options;
  const itemCount = data.length;
  
  // 生成下一页游标 (最后一条记录)
  let nextCursor: string | null = null;
  if (hasMore && itemCount > 0) {
    const lastItem = data[itemCount - 1] as any;
    if (lastItem && lastItem.id) {
      nextCursor = generateCursorFromRecord(lastItem);
    }
  }
  
  return {
    limit,
    hasPrevious: !!cursor,
    hasNext: hasMore,
    previousCursor: previousCursor ?? null,
    nextCursor,
    itemCount
  };
}

/**
 * 生成游标分页响应
 * @param data 数据列表
 * @param options 游标参数
 * @param previousCursor 上一页游标 (可选)
 * @returns 游标分页响应
 */
export function createCursorPaginatedResponse<T extends Record<string, any>>(
  data: T[],
  options: CursorOptions,
  previousCursor?: string | null
): CursorPaginatedResponse<T> {
  return {
    data,
    meta: generateCursorMeta(options, data, previousCursor)
  };
}

/**
 * 解析查询参数中的分页参数
 * @param query URL 查询参数对象
 * @param defaults 默认值
 * @returns 分页参数
 */
export function parsePaginationParams(
  query: Record<string, any>,
  defaults: { page?: number; pageSize?: number; limit?: number } = {}
): { page: number; pageSize: number } {
  const page = parseInt(query.page ?? defaults.page ?? '1', 10);
  const pageSize = parseInt(
    query.pageSize ?? query.limit ?? defaults.pageSize ?? defaults.limit ?? '10',
    10
  );
  
  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(1, pageSize), 100) // 限制最大 100
  };
}

/**
 * 解析查询参数中的游标分页参数
 * @param query URL 查询参数对象
 * @param defaults 默认值
 * @returns 游标分页参数
 */
export function parseCursorParams(
  query: Record<string, any>,
  defaults: { cursor?: string; limit?: number } = {}
): { cursor?: string; limit: number } {
  const cursor = query.cursor ?? defaults.cursor;
  const limit = parseInt(query.limit ?? defaults.limit ?? '10', 10);
  
  return {
    cursor: cursor || undefined,
    limit: Math.min(Math.max(1, limit), 100) // 限制最大 100
  };
}

// ============== 导出 ==============

export default {
  // 页码分页
  calculateOffset,
  calculateTotalPages,
  generatePaginationMeta,
  createPaginatedResponse,
  parsePaginationParams,
  
  // 游标分页
  encodeCursor,
  decodeCursor,
  generateCursorFromRecord,
  generateCursorMeta,
  createCursorPaginatedResponse,
  parseCursorParams
};

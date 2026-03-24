/**
 * 统一网关在线状态 hook
 * 合并 gateway store 与 API status，确保各页面显示一致
 */
import { useGatewayStore } from '@/stores/gateway';

/** API 返回的 status 结构（如 /api/gateway/status） */
export interface GatewayApiStatus {
  running?: boolean;
}

/**
 * @param apiStatus 可选，来自 /api/gateway/status 的 status，用于网关监控等需要 REST 详情的页面
 * @returns 任一来源显示运行中即视为在线
 */
export function useGatewayOnline(apiStatus?: GatewayApiStatus | null): boolean {
  const gatewayStatus = useGatewayStore((s) => s.status);
  return Boolean(apiStatus?.running || gatewayStatus?.state === 'running');
}

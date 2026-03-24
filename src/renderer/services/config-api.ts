/**
 * 配置中心 API
 * AxonClawX 风格：Gateway 在线用 RPC，离线用 hostApiFetch 读写 ~/.openclaw/openclaw.json
 */
import { useGatewayStore } from '@/stores/gateway';
import { hostApiFetch } from '@/lib/host-api';

export interface OpenClawConfig {
  agents?: Record<string, unknown>;
  models?: Record<string, unknown>;
  channels?: Record<string, unknown>;
  tools?: Record<string, unknown>;
  session?: Record<string, unknown>;
  gateway?: Record<string, unknown>;
  memory?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 从 Gateway RPC 获取配置（在线时） */
export async function configGetFromGateway(): Promise<OpenClawConfig> {
  const rpc = useGatewayStore.getState().rpc;
  return rpc('config.get') as Promise<OpenClawConfig>;
}

/** 从主进程 API 获取配置（离线时） */
export async function configGetFromHost(): Promise<OpenClawConfig> {
  const res = await hostApiFetch<OpenClawConfig>('/api/config', { method: 'GET' });
  return res ?? {};
}

/** 获取配置：优先 Gateway，离线时用 host */
export async function configGet(isOnline: boolean): Promise<OpenClawConfig> {
  if (isOnline) {
    try {
      return await configGetFromGateway();
    } catch {
      return await configGetFromHost();
    }
  }
  return configGetFromHost();
}

/** 通过 Gateway 保存配置（在线时） */
export async function configSetViaGateway(config: OpenClawConfig): Promise<void> {
  const rpc = useGatewayStore.getState().rpc;
  await rpc('config.set', config);
}

/** 通过主进程保存配置（离线时） */
export async function configSetViaHost(config: OpenClawConfig): Promise<void> {
  await hostApiFetch('/api/config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

/** 保存配置：优先 Gateway，离线时用 host */
export async function configSet(config: OpenClawConfig, isOnline: boolean): Promise<void> {
  if (isOnline) {
    try {
      await configSetViaGateway(config);
      return;
    } catch {
      await configSetViaHost(config);
      return;
    }
  }
  await configSetViaHost(config);
}

/** 获取配置文件路径 */
export async function configGetPath(): Promise<string> {
  const res = await hostApiFetch<{ path?: string }>('/api/config/path', { method: 'GET' });
  return res?.path ?? '~/.openclaw/openclaw.json';
}

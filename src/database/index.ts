/**
 * AxonClaw 数据库模块
 * 默认 SQLite，配置可在后续启动配置中选择
 */

export {
  initDatabase,
  closeDatabase,
  getDb,
  isInitialized,
} from './db';

export type { DatabaseConfig, DatabaseDriver } from './config';
export { getDefaultConfig, getDataDir } from './config';
export {
  loadBootstrapConfig,
  saveBootstrapConfig,
  getConfigFilePath,
  type BootstrapConfig,
} from './bootstrap-config';

export * from './repos/alert';
export * from './repos/setting';

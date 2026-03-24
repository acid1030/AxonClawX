/**
 * Audit Trail Skill - 审计日志追踪工具
 * 
 * 功能:
 * 1. 审计事件 - 记录用户操作、系统事件、安全事件
 * 2. 日志存储 - 自动轮转、异步写入、敏感数据脱敏
 * 3. 查询分析 - 多维度筛选、统计信息、报告生成
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 * @dependencies 无 (纯 Node.js 原生模块)
 */

// 重新导出 audit-utils-skill 的所有内容
export {
  AuditTracker,
  AuditEventType,
  AuditLevel,
  AuditLogEntry,
  AuditConfig,
  AuditQueryOptions,
  AuditStats,
  AuditReportOptions,
} from './audit-utils-skill';

// 快捷导入示例
// import { AuditTracker } from './audit-trail-skill';
// 
// const tracker = new AuditTracker();
// await tracker.log({
//   eventType: 'USER_LOGIN',
//   userId: 'user_001',
//   action: '用户登录',
//   result: 'success',
// });

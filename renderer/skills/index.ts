/**
 * Skills Index - 技能统一导出
 * 
 * 技能集成框架统一入口
 */

// ============ 技能发现系统 ============
export {
  SkillDiscovery,
  quickScan,
  quickSearch,
  type SkillMetadata,
  type SkillPackage,
  type SkillIndex,
  type SkillIndexItem,
  type SkillDiscoveryConfig,
  type SearchResults,
} from './skill-discovery';

// ============ 技能注册表 ============
export {
  SkillRegistry,
  skillRegistry,
  type Skill,
  type Command,
  type SkillRegistryConfig,
  type SkillInfo,
} from './skill-registry';

// ============ 技能调用器 ============
export {
  SkillInvoker,
  invokeSkill,
  type InvokeOptions,
  type InvokeResult,
  type InvokeLog,
  type SkillInvokerConfig,
} from './skill-invoker';

// ============ Git-Ops 技能 ============
export {
  GitOpsSkill,
  gitOps,
  GitOpsError,
  type GitStatus,
  type FileChange,
  type CommitResult,
  type PushResult,
  type PullRequest,
  type PullRequestResult,
  type GitOpsConfig,
} from './git-ops';

// ============ 示例 ============
export {
  runAllExamples,
  example1_ManualRegistration,
  example2_AutoScanSkills,
  example3_SkillInvocation,
  example4_BatchInvocation,
  example5_ParallelInvocation,
  example6_SkillManagement,
  example7_InvocationStats,
  example8_DefaultExport,
  example9_ErrorHandling,
  example10_ExportSkillList,
} from './examples';

// ============ 默认导出 ============
// 常用导出
export default {
  // 注册表
  skillRegistry,
  
  // 技能
  gitOps,
};

/**
 * Services Index - 统一导出所有服务
 */

export { AgentsService } from './agentsService';
export { SessionsService } from './sessionsService';
export { MessagesService } from './messagesService';
export { ChannelsService } from './channelsService';
export { SkillsService } from './skillsService';
export { UserPreferencesService } from './userPreferencesService';
export { ContentTemplatesService } from './content-templates';
export { ContentFactoryService } from './content-factory';
export { MemoriesService } from './memoriesService';

// 技能模块
export * from '../skills';

// 多 Agent 协作服务
export {
  AgentOrchestrator,
  orchestrator,
  type WorkflowDefinition,
  type WorkflowNode,
  type WorkflowAgent,
  type WorkflowExecution,
  type NodeExecutionResult,
  type WorkflowStatus,
  type NodeStatus,
} from './agent-orchestrator';

export {
  contentCreationWorkflow,
  codeReviewWorkflow,
  dataAnalysisWorkflow,
  customerSupportWorkflow,
  productLaunchWorkflow,
  parallelResearchWorkflow,
  getAllWorkflowTemplates,
  getWorkflowTemplateById,
  getWorkflowTemplatesByCategory,
} from './workflow-templates';

// 默认导出所有服务
export default {
  AgentsService,
  SessionsService,
  MessagesService,
  ChannelsService,
  SkillsService,
  UserPreferencesService,
  ContentTemplatesService,
  ContentFactoryService,
  MemoriesService,
  orchestrator,
};

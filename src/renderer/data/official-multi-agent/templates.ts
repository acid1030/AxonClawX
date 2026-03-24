import type { MultiAgentTemplate } from '@/types/multi-agent-template';
import contentFactory from './content-factory.json';
import researchTeam from './research-team.json';
import devopsTeam from './devops-team.json';
import customerSupport from './customer-support.json';
import dataPipeline from './data-pipeline.json';

/** 与 AxonClawX `templates/official/multi-agent/*.json` 一致 */
export const OFFICIAL_MULTI_AGENT_TEMPLATES: MultiAgentTemplate[] = [
  contentFactory as MultiAgentTemplate,
  researchTeam as MultiAgentTemplate,
  devopsTeam as MultiAgentTemplate,
  customerSupport as MultiAgentTemplate,
  dataPipeline as MultiAgentTemplate,
];

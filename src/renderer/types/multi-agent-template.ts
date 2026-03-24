/**
 * 与 AxonClawX template-manager-v2 MultiAgentTemplate 对齐
 */

export interface TemplateMetadata {
  name: string;
  description: string;
  category?: string;
  difficulty?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  author?: string;
}

export interface TemplateAgent {
  id: string;
  name: string;
  role: string;
  icon?: string;
  color?: string;
  soulSnippet?: string;
  description?: string;
}

export interface TemplateWorkflow {
  type: 'sequential' | 'parallel' | 'collaborative' | 'event-driven' | 'routing';
  description: string;
  steps: Array<{
    agent?: string;
    agents?: string[];
    action: string;
    parallel?: boolean;
    condition?: string;
    trigger?: string;
  }>;
}

export interface MultiAgentTemplate {
  id: string;
  type: 'multi-agent';
  version: string;
  metadata: TemplateMetadata;
  requirements?: {
    skills?: string[];
    channels?: string[];
  };
  content: {
    agents: TemplateAgent[];
    workflow: TemplateWorkflow;
    examples?: string[];
  };
}

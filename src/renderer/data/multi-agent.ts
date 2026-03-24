/**
 * Multi-agent collaboration - workflow and team templates
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
  agentCount: number;
  tags: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'Research + Writing Pipeline',
    description: 'Research agent gathers materials, writing agent drafts, and editing agent polishes the final output.',
    iconBg: 'rgba(99, 102, 241, 0.2)',
    iconColor: '#6366f1',
    agentCount: 3,
    tags: ['Research', 'Writing', 'Collaboration'],
  },
  {
    id: '2',
    name: 'Support + Ticket Workflow',
    description: 'Triage agent provides initial response, specialist agent handles complex issues, and tickets are auto-archived.',
    iconBg: 'rgba(34, 197, 94, 0.2)',
    iconColor: '#22c55e',
    agentCount: 2,
    tags: ['Support', 'Tickets', 'Routing'],
  },
  {
    id: '3',
    name: 'Code Review Chain',
    description: 'Analysis agent inspects code, security agent scans vulnerabilities, and style agent checks conventions.',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#f59e0b',
    agentCount: 3,
    tags: ['Code', 'Review', 'Security'],
  },
  {
    id: '4',
    name: 'Multilingual Content Production',
    description: 'Creative agent generates source text, translation agent localizes, and proofreading agent ensures quality.',
    iconBg: 'rgba(139, 92, 246, 0.2)',
    iconColor: '#8b5cf6',
    agentCount: 3,
    tags: ['Content', 'Translation', 'Multilingual'],
  },
  {
    id: '5',
    name: 'Data Analysis Pipeline',
    description: 'Ingestion agent collects data, analysis agent produces insights, and reporting agent outputs visuals.',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
    agentCount: 3,
    tags: ['Data', 'Analysis', 'Reports'],
  },
];

/**
 * Agent presets - persona and role templates
 */

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
  personality: string;
  tags: string[];
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: '1',
    name: 'General Assistant',
    description: 'Balanced assistant for conversation, tasks, and information retrieval',
    iconBg: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#3b82f6',
    personality: 'Friendly, professional, efficient',
    tags: ['General', 'Beginner', 'Recommended'],
  },
  {
    id: '2',
    name: 'Coding Expert',
    description: 'Coding, debugging, refactoring, and architecture guidance',
    iconBg: 'rgba(34, 197, 94, 0.2)',
    iconColor: '#22c55e',
    personality: 'Rigorous, detail-oriented, tech-driven',
    tags: ['Coding', 'Development', 'Tech'],
  },
  {
    id: '3',
    name: 'Business Assistant',
    description: 'Email drafting, meeting notes, scheduling, and follow-up reminders',
    iconBg: 'rgba(139, 92, 246, 0.2)',
    iconColor: '#8b5cf6',
    personality: 'Capable, thoughtful, detail-focused',
    tags: ['Business', 'Productivity', 'Efficiency'],
  },
  {
    id: '4',
    name: 'Creative Writer',
    description: 'Story writing, copywriting, brainstorming, and stylized output',
    iconBg: 'rgba(236, 72, 153, 0.2)',
    iconColor: '#ec4899',
    personality: 'Creative, flexible, expressive',
    tags: ['Writing', 'Creative', 'Copywriting'],
  },
  {
    id: '5',
    name: 'Translation Expert',
    description: 'Multilingual translation, localization, and terminology consistency',
    iconBg: 'rgba(245, 158, 11, 0.2)',
    iconColor: '#f59e0b',
    personality: 'Accurate, natural, culturally aware',
    tags: ['Translation', 'Multilingual', 'Localization'],
  },
  {
    id: '6',
    name: 'Support Representative',
    description: 'Customer inquiries, troubleshooting, and ticket handling',
    iconBg: 'rgba(16, 185, 129, 0.2)',
    iconColor: '#10b981',
    personality: 'Patient, polite, solution-oriented',
    tags: ['Support', 'Operations', 'Users'],
  },
  {
    id: '7',
    name: 'Research Analyst',
    description: 'Literature search, synthesis, reporting, and trend analysis',
    iconBg: 'rgba(99, 102, 241, 0.2)',
    iconColor: '#6366f1',
    personality: 'Objective, rigorous, data-driven',
    tags: ['Research', 'Analysis', 'Reports'],
  },
];

/**
 * Scene library data for Knowledge Center
 */

export type SceneCategory = 'all' | 'productivity' | 'social' | 'content' | 'devops' | 'research' | 'finance' | 'family';

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
  iconName: string;
  category: SceneCategory;
  difficulty: 'simple' | 'medium' | 'hard';
  recommended?: boolean;
  tags: string[];
  skillsCount: number;
  cronCount: number;
  i18n?: {
    zh?: {
      name: string;
      description: string;
      tags: string[];
    };
  };
}

const SCENES: SceneTemplate[] = [
  { id: '1', name: 'Personal Assistant', description: 'Schedule reminders, task management, and daily assistance with multi-turn context memory.', iconBg: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6', iconName: 'MessageCircle', category: 'productivity', difficulty: 'simple', recommended: true, tags: ['Assistant', 'Productivity', 'Tasks', 'Reminders'], skillsCount: 1, cronCount: 1, i18n: { zh: { name: '个人助理', description: '日程提醒、任务管理与日常协助，支持多轮上下文记忆。', tags: ['助理', '效率', '任务', '提醒'] } } },
  { id: '2', name: 'Mail Assistant', description: 'Email classification, smart replies, and summaries for inbox automation.', iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6', iconName: 'Mail', category: 'productivity', difficulty: 'medium', tags: ['Email', 'Productivity', 'Automation'], skillsCount: 2, cronCount: 1, i18n: { zh: { name: '邮件助理', description: '邮件分类、智能回复与摘要，提升收件箱自动化效率。', tags: ['邮件', '效率', '自动化'] } } },
  { id: '3', name: 'Schedule Manager', description: 'Calendar sync, meeting scheduling, and reminders across platforms.', iconBg: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e', iconName: 'Calendar', category: 'productivity', difficulty: 'simple', recommended: true, tags: ['Schedule', 'Calendar', 'Reminders'], skillsCount: 1, cronCount: 1, i18n: { zh: { name: '日程管理', description: '跨平台日历同步、会议安排与提醒管理。', tags: ['日程', '日历', '提醒'] } } },
  { id: '4', name: 'Task Tracker', description: 'To-do and progress tracking with board and list views.', iconBg: 'rgba(148, 163, 184, 0.2)', iconColor: '#94a3b8', iconName: 'CheckSquare', category: 'productivity', difficulty: 'simple', recommended: true, tags: ['Tasks', 'Productivity', 'Todo'], skillsCount: 1, cronCount: 0, i18n: { zh: { name: '任务追踪', description: '通过看板与列表视图进行待办与进度追踪。', tags: ['任务', '效率', '待办'] } } },
  { id: '5', name: 'Personal CRM', description: 'Contact management and follow-up reminders for sales and business.', iconBg: 'rgba(239, 68, 68, 0.2)', iconColor: '#ef4444', iconName: 'Contact', category: 'productivity', difficulty: 'simple', tags: ['Contacts', 'CRM', 'Sales'], skillsCount: 1, cronCount: 1, i18n: { zh: { name: '个人 CRM', description: '联系人管理与跟进提醒，适用于销售与商务场景。', tags: ['联系人', 'CRM', '销售'] } } },
  { id: '6', name: 'Second Brain', description: 'Knowledge management, notes, and memory enhancement with semantic retrieval.', iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6', iconName: 'Brain', category: 'research', difficulty: 'simple', tags: ['Knowledge', 'Notes', 'Memory'], skillsCount: 2, cronCount: 0, i18n: { zh: { name: '第二大脑', description: '结合语义检索进行知识管理、笔记整理与记忆增强。', tags: ['知识', '笔记', '记忆'] } } },
  { id: '7', name: 'Social Media Ops', description: 'Multi-platform publishing, sentiment monitoring, and engagement replies.', iconBg: 'rgba(236, 72, 153, 0.2)', iconColor: '#ec4899', iconName: 'Share2', category: 'social', difficulty: 'medium', recommended: true, tags: ['Social', 'Operations', 'Content'], skillsCount: 3, cronCount: 2, i18n: { zh: { name: '社媒运营', description: '多平台发布、舆情监测与互动回复。', tags: ['社媒', '运营', '内容'] } } },
  { id: '8', name: 'Content Creation Assistant', description: 'Article drafting, topic suggestions, and multi-format output.', iconBg: 'rgba(245, 158, 11, 0.2)', iconColor: '#f59e0b', iconName: 'PenLine', category: 'content', difficulty: 'simple', tags: ['Writing', 'Creation', 'Copywriting'], skillsCount: 2, cronCount: 0, i18n: { zh: { name: '内容创作助理', description: '文章起草、选题建议与多格式内容输出。', tags: ['写作', '创作', '文案'] } } },
  { id: '9', name: 'Code Review Assistant', description: 'Automated code review, vulnerability scanning, and best-practice suggestions.', iconBg: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e', iconName: 'Terminal', category: 'devops', difficulty: 'medium', tags: ['Code', 'DevOps', 'Review'], skillsCount: 2, cronCount: 1, i18n: { zh: { name: '代码评审助理', description: '自动代码评审、漏洞扫描与最佳实践建议。', tags: ['代码', '开发运维', '评审'] } } },
  { id: '10', name: 'Research Assistant', description: 'Paper retrieval, summary generation, and knowledge graph building.', iconBg: 'rgba(99, 102, 241, 0.2)', iconColor: '#6366f1', iconName: 'GraduationCap', category: 'research', difficulty: 'medium', tags: ['Research', 'Papers', 'Academic'], skillsCount: 2, cronCount: 0, i18n: { zh: { name: '研究助理', description: '论文检索、摘要生成与知识图谱构建。', tags: ['研究', '论文', '学术'] } } },
  { id: '11', name: 'Trading Signals Assistant', description: 'Market analysis, position alerts, and risk notifications.', iconBg: 'rgba(16, 185, 129, 0.2)', iconColor: '#10b981', iconName: 'Banknote', category: 'finance', difficulty: 'hard', tags: ['Trading', 'Finance', 'Quant'], skillsCount: 3, cronCount: 2, i18n: { zh: { name: '交易信号助理', description: '市场分析、仓位预警与风险通知。', tags: ['交易', '金融', '量化'] } } },
  { id: '12', name: 'Family Schedule Coordinator', description: 'Family calendar, reminders, and member coordination.', iconBg: 'rgba(251, 146, 60, 0.2)', iconColor: '#fb923c', iconName: 'Home', category: 'family', difficulty: 'simple', tags: ['Family', 'Schedule', 'Coordination'], skillsCount: 1, cronCount: 1, i18n: { zh: { name: '家庭日程协调', description: '家庭日历、提醒与成员协同管理。', tags: ['家庭', '日程', '协同'] } } },
];

export const SCENE_CATEGORIES: { id: SceneCategory; label: string; iconName: string }[] = [
  { id: 'all', label: 'All', iconName: 'LayoutGrid' },
  { id: 'productivity', label: 'Productivity', iconName: 'Briefcase' },
  { id: 'social', label: 'Social Media', iconName: 'Share2' },
  { id: 'content', label: 'Content Creation', iconName: 'PenLine' },
  { id: 'devops', label: 'DevOps', iconName: 'Terminal' },
  { id: 'research', label: 'Research & Learning', iconName: 'GraduationCap' },
  { id: 'finance', label: 'Finance & Trading', iconName: 'Banknote' },
  { id: 'family', label: 'Family Life', iconName: 'Home' },
];

export function getScenes(category?: SceneCategory, search?: string, locale?: string): SceneTemplate[] {
  const useZh = /^(zh|cn)/i.test(locale || '');
  const localize = (scene: SceneTemplate): SceneTemplate => {
    if (!useZh || !scene.i18n?.zh) return scene;
    return {
      ...scene,
      name: scene.i18n.zh.name,
      description: scene.i18n.zh.description,
      tags: scene.i18n.zh.tags,
    };
  };

  let result = SCENES.map(localize);
  if (category && category !== 'all') {
    result = result.filter((s) => s.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return result;
}

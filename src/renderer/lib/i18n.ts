// AxonClaw - i18n 国际化支持
// 参考 AxonClawX web/locales 架构

export type Locale = 'zh' | 'en';

export const translations = {
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
      confirm: '确认',
      edit: '编辑',
      create: '创建',
      loading: '加载中...',
      success: '成功',
      error: '错误',
    },
    agents: {
      title: 'Agent 管理',
      create: '创建 Agent',
      edit: '编辑 Agent',
      delete: '删除 Agent',
      name: '名称',
      role: '角色',
      specialty: '专业领域',
      status: '状态',
      idle: '空闲',
      busy: '忙碌',
      offline: '离线',
      error: '错误',
    },
    dashboard: {
      title: '项目仪表板',
      progress: '整体进度',
      activeAgents: '活跃 Agent',
      todayTasks: '今日任务',
      milestones: '里程碑',
    },
    navigation: {
      dashboard: '仪表板',
      chat: '对话',
      agents: 'Agent',
      channels: 'Channel',
      memory: '记忆',
      skills: '技能',
      settings: '设置',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      edit: 'Edit',
      create: 'Create',
      loading: 'Loading...',
      success: 'Success',
      error: 'Error',
    },
    agents: {
      title: 'Agent Management',
      create: 'Create Agent',
      edit: 'Edit Agent',
      delete: 'Delete Agent',
      name: 'Name',
      role: 'Role',
      specialty: 'Specialty',
      status: 'Status',
      idle: 'Idle',
      busy: 'Busy',
      offline: 'Offline',
      error: 'Error',
    },
    dashboard: {
      title: 'Project Dashboard',
      progress: 'Overall Progress',
      activeAgents: 'Active Agents',
      todayTasks: 'Today\'s Tasks',
      milestones: 'Milestones',
    },
    navigation: {
      dashboard: 'Dashboard',
      chat: 'Chat',
      agents: 'Agents',
      channels: 'Channels',
      memory: 'Memory',
      skills: 'Skills',
      settings: 'Settings',
    },
  },
};

let currentLocale: Locale = 'zh';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(path: string): string {
  const keys = path.split('.');
  let value: any = translations[currentLocale];
  
  for (const key of keys) {
    value = value?.[key];
  }
  
  return value || path;
}

// React Hook
export function useTranslation() {
  return {
    t,
    locale: currentLocale,
    setLocale,
  };
}

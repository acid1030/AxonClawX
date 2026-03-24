/**
 * 知识中心服务 - AxonClawX KnowledgeHub 数据加载
 * 使用 Vite import.meta.glob 在构建时打包 JSON
 */

export type KnowledgeItemType = 'recipe' | 'tip' | 'snippet' | 'faq';

export interface KnowledgeItem {
  id: string;
  type: KnowledgeItemType;
  version?: string;
  metadata: {
    name: string;
    description: string;
    category?: string;
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    featured?: boolean;
    icon?: string;
    color?: string;
    lastUpdated?: string;
    relatedTemplates?: string[];
    i18n?: Record<string, { name?: string; description?: string }>;
  };
  content: {
    body?: string;
    question?: string;
    answer?: string;
    snippet?: string;
    snippetLanguage?: string;
    targetFile?: string;
    steps?: Array<{
      title: string;
      description?: string;
      code?: string;
      file?: string;
      language?: string;
      action?: 'copy' | 'append' | 'replace' | 'command';
      target?: string;
    }>;
    statusCheck?: {
      type: string;
      field?: string;
      okWhen?: string;
      okTemplate?: string;
      failTemplate?: string;
      threshold?: number;
    };
    editorSection?: string;
    relatedDoctorChecks?: string[];
  };
}

// Vite glob: 构建时打包所有 knowledge JSON（路径相对于当前文件）
const knowledgeModules = import.meta.glob<{ default: KnowledgeItem }>(
  '../data/knowledge/**/*.json',
  { eager: true }
);

let cachedItems: KnowledgeItem[] | null = null;

function loadFromGlob(): KnowledgeItem[] {
  const items: KnowledgeItem[] = [];
  for (const mod of Object.values(knowledgeModules)) {
    if (mod && typeof mod === 'object' && 'default' in mod) {
      const item = (mod as { default: KnowledgeItem }).default;
      if (item && item.id) items.push(item);
    }
  }
  return items;
}

export async function getKnowledgeItems(): Promise<KnowledgeItem[]> {
  if (cachedItems) return cachedItems;
  cachedItems = loadFromGlob();
  return cachedItems;
}

export function getKnowledgeByType(type: KnowledgeItemType): Promise<KnowledgeItem[]> {
  return getKnowledgeItems().then((all) => all.filter((i) => i.type === type));
}

export function getGroupedKnowledge(): Promise<Record<KnowledgeItemType, KnowledgeItem[]>> {
  return getKnowledgeItems().then((all) => {
    const groups: Record<string, KnowledgeItem[]> = {
      recipe: [],
      tip: [],
      snippet: [],
      faq: [],
    };
    for (const item of all) {
      groups[item.type].push(item);
    }
    return groups as Record<KnowledgeItemType, KnowledgeItem[]>;
  });
}

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Clapperboard,
  Copy,
  DownloadCloud,
  Image,
  Library,
  RefreshCw,
  Scissors,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  BUILTIN_RESOURCE_LIBRARY,
  type ResourceLibraryCategory,
  type ResourceLibraryCategoryId,
  type ResourceLibraryItem,
  type ResourceLibraryPayload,
} from '@/data/resource-library';
import { cn } from '@/lib/utils';

const CACHE_KEY = 'axonclawx.resource-library.cache';
const REMOTE_URL_KEY = 'axonclawx.resource-library.remote-url';
const DEFAULT_REMOTE_URL = 'https://axonclawx.cn/resource-api/api/resource-library/latest';

const CATEGORY_ICON: Record<ResourceLibraryCategoryId, React.ComponentType<{ className?: string }>> = {
  imagePrompts: Image,
  cameraPrompts: Clapperboard,
  capcutTips: Scissors,
};

const ACCENT_CLASS: Record<ResourceLibraryCategory['accent'], {
  tab: string;
  card: string;
  icon: string;
  badge: string;
}> = {
  cyan: {
    tab: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30',
    card: 'border-cyan-400/25 hover:border-cyan-300/45',
    icon: 'bg-cyan-500/15 text-cyan-300',
    badge: 'bg-cyan-500/15 text-cyan-200',
  },
  orange: {
    tab: 'bg-orange-500/15 text-orange-200 border-orange-400/30',
    card: 'border-orange-400/25 hover:border-orange-300/45',
    icon: 'bg-orange-500/15 text-orange-300',
    badge: 'bg-orange-500/15 text-orange-200',
  },
  emerald: {
    tab: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
    card: 'border-emerald-400/25 hover:border-emerald-300/45',
    icon: 'bg-emerald-500/15 text-emerald-300',
    badge: 'bg-emerald-500/15 text-emerald-200',
  },
};

function normalizeRemotePayload(payload: unknown): ResourceLibraryPayload {
  const record = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const categories = Array.isArray(record.categories) ? record.categories : [];
  const normalized = categories
    .map((category): ResourceLibraryCategory | null => {
      const source = category && typeof category === 'object' ? category as Record<string, unknown> : {};
      const id = String(source.id || '').trim() as ResourceLibraryCategoryId;
      if (!['imagePrompts', 'cameraPrompts', 'capcutTips'].includes(id)) return null;
      const fallback = BUILTIN_RESOURCE_LIBRARY.categories.find((item) => item.id === id);
      const items = Array.isArray(source.items) ? source.items : [];
      return {
        id,
        titleKey: fallback?.titleKey || `resourceLibrary.categories.${id}.title`,
        fallbackTitle: String(source.title || fallback?.fallbackTitle || id),
        descriptionKey: fallback?.descriptionKey || `resourceLibrary.categories.${id}.description`,
        fallbackDescription: String(source.description || fallback?.fallbackDescription || ''),
        accent: fallback?.accent || 'cyan',
        items: items.map((item, index): ResourceLibraryItem => {
          const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
          return {
            id: String(row.id || `${id}-${index}`),
            title: String(row.title || row.name || 'Untitled'),
            description: String(row.description || ''),
            prompt: typeof row.prompt === 'string' ? row.prompt : undefined,
            imageUrl: typeof row.imageUrl === 'string' ? row.imageUrl : undefined,
            imageAlt: typeof row.imageAlt === 'string' ? row.imageAlt : undefined,
            tags: Array.isArray(row.tags) ? row.tags.map((tag) => String(tag)).filter(Boolean) : [],
            level: row.level === 'pro' ? 'pro' : 'basic',
          };
        }),
      };
    })
    .filter((category): category is ResourceLibraryCategory => Boolean(category));

  if (normalized.length === 0) {
    throw new Error('Invalid resource library payload');
  }

  return {
    version: String(record.version || `remote-${Date.now()}`),
    updatedAt: String(record.updatedAt || new Date().toISOString()),
    categories: normalized,
  };
}

function loadCachedPayload(): ResourceLibraryPayload {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return BUILTIN_RESOURCE_LIBRARY;
    return normalizeRemotePayload(JSON.parse(raw));
  } catch {
    return BUILTIN_RESOURCE_LIBRARY;
  }
}

export const ResourceLibraryView: React.FC = () => {
  const { t } = useTranslation();
  const [payload, setPayload] = useState<ResourceLibraryPayload>(() => loadCachedPayload());
  const [activeTab, setActiveTab] = useState<ResourceLibraryCategoryId>('imagePrompts');
  const [query, setQuery] = useState('');
  const [remoteUrl, setRemoteUrl] = useState(() => window.localStorage.getItem(REMOTE_URL_KEY) || DEFAULT_REMOTE_URL);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    window.localStorage.setItem(REMOTE_URL_KEY, remoteUrl.trim());
  }, [remoteUrl]);

  const activeCategory = payload.categories.find((category) => category.id === activeTab) || payload.categories[0];
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeCategory?.items || [];
    return (activeCategory?.items || []).filter((item) => {
      const haystack = [item.title, item.description, item.prompt, ...item.tags].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [activeCategory, query]);

  const totalCount = payload.categories.reduce((sum, category) => sum + category.items.length, 0);

  const updateFromRemote = async () => {
    const url = remoteUrl.trim();
    if (!url) {
      setStatus('error');
      setStatusText(t('resourceLibrary.remote.emptyUrl'));
      return;
    }

    setStatus('loading');
    setStatusText(t('resourceLibrary.remote.loading'));
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = normalizeRemotePayload(await res.json());
      setPayload(next);
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      setStatus('success');
      setStatusText(t('resourceLibrary.remote.success', { version: next.version }));
    } catch (err) {
      setStatus('error');
      setStatusText(t('resourceLibrary.remote.failed', { reason: String(err) }));
    }
  };

  const resetBuiltin = () => {
    setPayload(BUILTIN_RESOURCE_LIBRARY);
    window.localStorage.removeItem(CACHE_KEY);
    setStatus('success');
    setStatusText(t('resourceLibrary.remote.resetDone'));
  };

  const copyPrompt = async (item: ResourceLibraryItem) => {
    const text = item.prompt || `${item.title}\n${item.description}`;
    await navigator.clipboard.writeText(text);
    setStatus('success');
    setStatusText(t('resourceLibrary.copied', { title: item.title }));
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto px-5 py-5 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827]/90 p-5 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(249,115,22,0.16),transparent_32%),radial-gradient(circle_at_60%_90%,rgba(16,185,129,0.14),transparent_35%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                <Library className="h-4 w-4 text-cyan-300" />
                {t('resourceLibrary.badge')}
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                {t('resourceLibrary.title')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {t('resourceLibrary.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
              <div className="rounded-xl bg-white/[0.06] px-4 py-3">
                <div className="text-2xl font-black">{payload.categories.length}</div>
                <div className="text-xs text-slate-400">{t('resourceLibrary.stats.categories')}</div>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-4 py-3">
                <div className="text-2xl font-black">{totalCount}</div>
                <div className="text-xs text-slate-400">{t('resourceLibrary.stats.items')}</div>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-4 py-3">
                <div className="truncate text-sm font-black">{payload.version}</div>
                <div className="text-xs text-slate-400">{t('resourceLibrary.stats.version')}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_420px]">
          <div className="flex flex-wrap gap-2">
            {payload.categories.map((category) => {
              const Icon = CATEGORY_ICON[category.id] || Sparkles;
              const active = activeTab === category.id;
              const accent = ACCENT_CLASS[category.accent];
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={cn(
                    'flex min-w-[180px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                    active ? accent.tab : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]',
                  )}
                >
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', active ? accent.icon : 'bg-white/5 text-slate-400')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">
                      {t(category.titleKey, { defaultValue: category.fallbackTitle })}
                    </span>
                    <span className="block text-xs text-slate-400">{category.items.length} {t('resourceLibrary.stats.items')}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#172033] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <DownloadCloud className="h-4 w-4 text-cyan-300" />
              {t('resourceLibrary.remote.title')}
            </div>
            <div className="flex gap-2">
              <input
                value={remoteUrl}
                onChange={(event) => setRemoteUrl(event.target.value)}
                placeholder={t('resourceLibrary.remote.placeholder')}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
              <button
                onClick={updateFromRemote}
                disabled={status === 'loading'}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-bold text-white hover:bg-blue-400 disabled:opacity-60"
              >
                <RefreshCw className={cn('h-4 w-4', status === 'loading' && 'animate-spin')} />
                {t('resourceLibrary.remote.update')}
              </button>
            </div>
            <button onClick={resetBuiltin} className="mt-2 text-xs font-medium text-slate-400 hover:text-white">
              {t('resourceLibrary.remote.reset')}
            </button>
          </div>
        </section>

        {statusText && (
          <div className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            status === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
          )}>
            {statusText}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-[#101827] p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                {activeCategory ? t(activeCategory.titleKey, { defaultValue: activeCategory.fallbackTitle }) : ''}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {activeCategory ? t(activeCategory.descriptionKey, { defaultValue: activeCategory.fallbackDescription }) : ''}
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('resourceLibrary.searchPlaceholder')}
                className="w-full rounded-xl border border-white/10 bg-[#0f172a] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const accent = ACCENT_CLASS[activeCategory?.accent || 'cyan'];
              return (
                <article
                  key={item.id}
                  className={cn('flex min-h-[220px] flex-col rounded-2xl border bg-[#141e31] p-4 transition-all', accent.card)}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate-400">{item.description}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase', accent.badge)}>
                      {item.level === 'pro' ? t('resourceLibrary.level.pro') : t('resourceLibrary.level.basic')}
                    </span>
                  </div>

                  {item.prompt && (
                    <pre className="mb-3 max-h-28 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-slate-200 whitespace-pre-wrap">
                      {item.prompt}
                    </pre>
                  )}

                  {item.imageUrl && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title}
                        className="h-36 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/[0.06] px-2 py-1 text-[11px] text-slate-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => copyPrompt(item)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t('resourceLibrary.copy')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-slate-400">
              {t('resourceLibrary.empty')}
            </div>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Camera, title: t('resourceLibrary.workflow.shot.title'), desc: t('resourceLibrary.workflow.shot.desc') },
            { icon: Sparkles, title: t('resourceLibrary.workflow.prompt.title'), desc: t('resourceLibrary.workflow.prompt.desc') },
            { icon: Scissors, title: t('resourceLibrary.workflow.edit.title'), desc: t('resourceLibrary.workflow.edit.desc') },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <item.icon className="mb-3 h-5 w-5 text-cyan-300" />
              <h3 className="font-black text-white">{item.title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-400">{item.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ResourceLibraryView;

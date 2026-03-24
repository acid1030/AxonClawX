/**
 * Intl Utils Skill - 国际化工具技能
 * 
 * 提供完整的多语言支持能力：
 * 1. 多语言翻译
 * 2. 日期/数字格式化
 * 3. 复数规则处理
 * 
 * @module intl-utils-skill
 * @author AxonClaw
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es';

export interface Translation {
  app: {
    title: string;
    subtitle: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    search: string;
    noData: string;
  };
  navigation: {
    home: string;
    settings: string;
    profile: string;
    logout: string;
  };
  messages: {
    welcome: string;
    goodbye: string;
    confirmDelete: string;
  };
  [key: string]: any;
}

export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  locale?: Language;
  style?: 'short' | 'medium' | 'long' | 'full';
}

export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  locale?: Language;
  currency?: string;
}

export interface IntlUtilsConfig {
  defaultLanguage: Language;
  fallbackLanguage: Language;
  supportedLanguages: Language[];
}

// ============================================================================
// 翻译数据
// ============================================================================

const translations: Record<Language, Translation> = {
  zh: {
    app: { title: 'ARIA', subtitle: '智能助手' },
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      cancel: '取消',
      confirm: '确认',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      noData: '暂无数据',
    },
    navigation: {
      home: '首页',
      settings: '设置',
      profile: '个人资料',
      logout: '退出登录',
    },
    messages: {
      welcome: '欢迎使用 ARIA',
      goodbye: '再见，期待再次相见',
      confirmDelete: '确定要删除吗？此操作不可恢复。',
    },
  },
  en: {
    app: { title: 'ARIA', subtitle: 'Intelligent Assistant' },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      noData: 'No data available',
    },
    navigation: {
      home: 'Home',
      settings: 'Settings',
      profile: 'Profile',
      logout: 'Logout',
    },
    messages: {
      welcome: 'Welcome to ARIA',
      goodbye: 'Goodbye, see you again',
      confirmDelete: 'Are you sure you want to delete? This action cannot be undone.',
    },
  },
  ja: {
    app: { title: 'ARIA', subtitle: 'インテリジェントアシスタント' },
    common: {
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      cancel: 'キャンセル',
      confirm: '確認',
      save: '保存',
      delete: '削除',
      edit: '編集',
      search: '検索',
      noData: 'データがありません',
    },
    navigation: {
      home: 'ホーム',
      settings: '設定',
      profile: 'プロフィール',
      logout: 'ログアウト',
    },
    messages: {
      welcome: 'ARIA へようこそ',
      goodbye: 'さようなら、またお会いしましょう',
      confirmDelete: '削除してもよろしいですか？この操作は元に戻せません。',
    },
  },
  ko: {
    app: { title: 'ARIA', subtitle: '인텔리전트 어시스턴트' },
    common: {
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      confirm: '확인',
      save: '저장',
      delete: '삭제',
      edit: '편집',
      search: '검색',
      noData: '데이터가 없습니다',
    },
    navigation: {
      home: '홈',
      settings: '설정',
      profile: '프로필',
      logout: '로그아웃',
    },
    messages: {
      welcome: 'ARIA 에 오신 것을 환영합니다',
      goodbye: '안녕히 계세요, 다시 만나요',
      confirmDelete: '삭제하시겠습니까? 이 작업은 취소할 수 없습니다.',
    },
  },
  fr: {
    app: { title: 'ARIA', subtitle: 'Assistant Intelligent' },
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      search: 'Rechercher',
      noData: 'Aucune donnée disponible',
    },
    navigation: {
      home: 'Accueil',
      settings: 'Paramètres',
      profile: 'Profil',
      logout: 'Déconnexion',
    },
    messages: {
      welcome: 'Bienvenue sur ARIA',
      goodbye: 'Au revoir, à bientôt',
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer ? Cette action ne peut pas être annulée.',
    },
  },
  de: {
    app: { title: 'ARIA', subtitle: 'Intelligenter Assistent' },
    common: {
      loading: 'Laden...',
      error: 'Fehler',
      success: 'Erfolg',
      cancel: 'Abbrechen',
      confirm: 'Bestätigen',
      save: 'Speichern',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      search: 'Suchen',
      noData: 'Keine Daten verfügbar',
    },
    navigation: {
      home: 'Startseite',
      settings: 'Einstellungen',
      profile: 'Profil',
      logout: 'Abmelden',
    },
    messages: {
      welcome: 'Willkommen bei ARIA',
      goodbye: 'Auf Wiedersehen, bis bald',
      confirmDelete: 'Möchten Sie wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    },
  },
  es: {
    app: { title: 'ARIA', subtitle: 'Asistente Inteligente' },
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      search: 'Buscar',
      noData: 'No hay datos disponibles',
    },
    navigation: {
      home: 'Inicio',
      settings: 'Configuración',
      profile: 'Perfil',
      logout: 'Cerrar sesión',
    },
    messages: {
      welcome: 'Bienvenido a ARIA',
      goodbye: 'Adiós, hasta pronto',
      confirmDelete: '¿Está seguro de que desea eliminar? Esta acción no se puede deshacer.',
    },
  },
};

// ============================================================================
// 核心工具类
// ============================================================================

export class IntlUtils {
  private currentLanguage: Language;
  private config: IntlUtilsConfig;

  constructor(config?: Partial<IntlUtilsConfig>) {
    this.config = {
      defaultLanguage: config?.defaultLanguage || 'zh',
      fallbackLanguage: config?.fallbackLanguage || 'en',
      supportedLanguages: config?.supportedLanguages || ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'],
    };
    this.currentLanguage = this.config.defaultLanguage;
  }

  // ============================================================================
  // 1. 多语言翻译
  // ============================================================================

  /**
   * 设置当前语言
   */
  setLanguage(lang: Language): void {
    if (this.config.supportedLanguages.includes(lang)) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language "${lang}" is not supported. Falling back to "${this.config.defaultLanguage}"`);
    }
  }

  /**
   * 获取当前语言
   */
  getLanguage(): Language {
    return this.currentLanguage;
  }

  /**
   * 获取支持的語言列表
   */
  getSupportedLanguages(): Language[] {
    return this.config.supportedLanguages;
  }

  /**
   * 翻译函数 - 通过键路径获取翻译
   * @param keyPath - 点号分隔的键路径，如 'common.loading'
   * @param lang - 可选，指定语言（默认使用当前语言）
   * @returns 翻译后的字符串
   * 
   * @example
   * intl.t('common.loading') // => '加载中...'
   * intl.t('messages.welcome', 'en') // => 'Welcome to ARIA'
   */
  t(keyPath: string, lang?: Language): string {
    const targetLang = lang || this.currentLanguage;
    const keys = keyPath.split('.');
    let value: any = translations[targetLang] || translations[this.config.fallbackLanguage];

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        // 尝试使用 fallback language
        if (targetLang !== this.config.fallbackLanguage) {
          value = translations[this.config.fallbackLanguage];
          for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
              value = value[k];
            } else {
              console.warn(`Translation key not found: ${keyPath} in ${targetLang}`);
              return keyPath;
            }
          }
        } else {
          console.warn(`Translation key not found: ${keyPath} in ${targetLang}`);
          return keyPath;
        }
      }
    }

    return typeof value === 'string' ? value : keyPath;
  }

  /**
   * 带插值的翻译
   * @param keyPath - 翻译键路径
   * @param params - 插值参数
   * @param lang - 可选语言
   * @returns 插值后的字符串
   * 
   * @example
   * intl.tInterpolate('messages.greeting', { name: 'Axon' }) 
   * // 翻译文本："Hello, {name}!" => "Hello, Axon!"
   */
  tInterpolate(keyPath: string, params: Record<string, string | number>, lang?: Language): string {
    let text = this.t(keyPath, lang);
    
    for (const [key, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    return text;
  }

  /**
   * 获取完整翻译对象
   */
  getTranslations(lang?: Language): Translation {
    const targetLang = lang || this.currentLanguage;
    return translations[targetLang] || translations[this.config.fallbackLanguage];
  }

  // ============================================================================
  // 2. 日期格式化
  // ============================================================================

  /**
   * 格式化日期
   * @param date - 日期对象或时间戳
   * @param options - 格式化选项
   * @returns 格式化后的日期字符串
   * 
   * @example
   * intl.formatDate(new Date()) // => '2026 年 3 月 13 日'
   * intl.formatDate(Date.now(), { style: 'long' }) // => '2026 年 3 月 13 日 星期五'
   * intl.formatDate(new Date(), { locale: 'en', dateStyle: 'full' }) // => 'Friday, March 13, 2026'
   */
  formatDate(date: Date | number, options?: DateFormatOptions): string {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    const locale = options?.locale || this.currentLanguage;
    const localeMap: Record<Language, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
    };

    // 如果使用了 dateStyle，直接使用它
    if (options?.dateStyle) {
      const finalOptions = { ...options };
      delete (finalOptions as any).locale;
      delete (finalOptions as any).style;
      return new Intl.DateTimeFormat(localeMap[locale], finalOptions).format(dateObj);
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    const styleOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { year: '2-digit', month: '2-digit', day: '2-digit' },
      medium: { year: 'numeric', month: 'short', day: '2-digit' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
      full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
    };

    const finalOptions: Intl.DateTimeFormatOptions = {
      ...defaultOptions,
      ...(options?.style ? styleOptions[options.style] : {}),
    };

    // 添加其他选项（排除 locale 和 style）
    if (options) {
      Object.keys(options).forEach(key => {
        if (key !== 'locale' && key !== 'style' && key !== 'dateStyle') {
          (finalOptions as any)[key] = (options as any)[key];
        }
      });
    }

    return new Intl.DateTimeFormat(localeMap[locale], finalOptions).format(dateObj);
  }

  /**
   * 格式化时间
   * @param date - 日期对象或时间戳
   * @param options - 格式化选项
   * @returns 格式化后的时间字符串
   * 
   * @example
   * intl.formatTime(new Date()) // => '18:24'
   * intl.formatTime(Date.now(), { style: 'long' }) // => '18:24:35 CST'
   */
  formatTime(date: Date | number, options?: DateFormatOptions): string {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    const locale = options?.locale || this.currentLanguage;
    const localeMap: Record<Language, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
    };

    // 如果使用了 timeStyle，直接使用它
    if (options?.timeStyle) {
      const finalOptions = { ...options };
      delete (finalOptions as any).locale;
      delete (finalOptions as any).style;
      return new Intl.DateTimeFormat(localeMap[locale], finalOptions).format(dateObj);
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    const styleOptions: Record<string, Intl.DateTimeFormatOptions> = {
      short: { hour: '2-digit', minute: '2-digit' },
      medium: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
      long: { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' },
    };

    const finalOptions: Intl.DateTimeFormatOptions = {
      ...defaultOptions,
      ...(options?.style ? styleOptions[options.style] : {}),
    };

    // 添加其他选项（排除 locale 和 style）
    if (options) {
      Object.keys(options).forEach(key => {
        if (key !== 'locale' && key !== 'style' && key !== 'timeStyle') {
          (finalOptions as any)[key] = (options as any)[key];
        }
      });
    }

    return new Intl.DateTimeFormat(localeMap[locale], finalOptions).format(dateObj);
  }

  /**
   * 格式化日期时间
   * @param date - 日期对象或时间戳
   * @param options - 格式化选项
   * @returns 格式化后的日期时间字符串
   */
  formatDateTime(date: Date | number, options?: DateFormatOptions): string {
    return `${this.formatDate(date, options)} ${this.formatTime(date, options)}`;
  }

  /**
   * 相对时间格式化（多久以前）
   * @param date - 日期对象或时间戳
   * @param lang - 可选语言
   * @returns 相对时间字符串
   * 
   * @example
   * intl.formatRelativeTime(Date.now() - 60000) // => '1 分钟前'
   * intl.formatRelativeTime(Date.now() - 3600000, 'en') // => '1 hour ago'
   */
  formatRelativeTime(date: Date | number, lang?: Language): string {
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    const locale = lang || this.currentLanguage;
    const rtf = new Intl.RelativeTimeFormat(locale === 'zh' ? 'zh-CN' : locale, { numeric: 'auto' });

    if (Math.abs(diffDays) >= 1) {
      return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffHours) >= 1) {
      return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffMins) >= 1) {
      return rtf.format(diffMins, 'minute');
    } else {
      return rtf.format(diffSecs, 'second');
    }
  }

  // ============================================================================
  // 3. 数字格式化
  // ============================================================================

  /**
   * 格式化数字
   * @param number - 要格式化的数字
   * @param options - 格式化选项
   * @returns 格式化后的数字字符串
   * 
   * @example
   * intl.formatNumber(1234567.89) // => '1,234,567.89'
   * intl.formatNumber(1234567.89, { locale: 'de' }) // => '1.234.567,89'
   * intl.formatNumber(0.75, { style: 'percent' }) // => '75%'
   */
  formatNumber(number: number, options?: NumberFormatOptions): string {
    const locale = options?.locale || this.currentLanguage;
    const localeMap: Record<Language, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
    };

    return new Intl.NumberFormat(localeMap[locale], options).format(number);
  }

  /**
   * 格式化货币
   * @param amount - 金额
   * @param currency - 货币代码 (ISO 4217)
   * @param options - 格式化选项
   * @returns 格式化后的货币字符串
   * 
   * @example
   * intl.formatCurrency(1234.56, 'USD') // => '$1,234.56'
   * intl.formatCurrency(1234.56, 'EUR', { locale: 'de' }) // => '1.234,56 €'
   * intl.formatCurrency(1234.56, 'CNY') // => '¥1,234.56'
   */
  formatCurrency(amount: number, currency: string = 'USD', options?: NumberFormatOptions): string {
    return this.formatNumber(amount, {
      style: 'currency',
      currency,
      ...options,
    });
  }

  /**
   * 格式化百分比
   * @param value - 小数值 (0-1)
   * @param options - 格式化选项
   * @returns 格式化后的百分比字符串
   * 
   * @example
   * intl.formatPercent(0.75) // => '75%'
   * intl.formatPercent(0.1234, { minimumFractionDigits: 2 }) // => '12.34%'
   */
  formatPercent(value: number, options?: NumberFormatOptions): string {
    return this.formatNumber(value, {
      style: 'percent',
      ...options,
    });
  }

  /**
   * 格式化文件大小
   * @param bytes - 字节数
   * @param locale - 可选语言
   * @returns 格式化后的文件大小字符串
   * 
   * @example
   * intl.formatFileSize(1024) // => '1 KB'
   * intl.formatFileSize(1536000) // => '1.5 MB'
   */
  formatFileSize(bytes: number, locale?: Language): string {
    const lang = locale || this.currentLanguage;
    const units = {
      zh: ['字节', 'KB', 'MB', 'GB', 'TB'],
      en: ['B', 'KB', 'MB', 'GB', 'TB'],
      ja: ['バイト', 'KB', 'MB', 'GB', 'TB'],
      ko: ['바이트', 'KB', 'MB', 'GB', 'TB'],
      fr: ['o', 'Ko', 'Mo', 'Go', 'To'],
      de: ['B', 'KB', 'MB', 'GB', 'TB'],
      es: ['B', 'KB', 'MB', 'GB', 'TB'],
    };

    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units[lang].length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${this.formatNumber(size, { maximumFractionDigits: 2, locale })} ${units[lang][unitIndex]}`;
  }

  // ============================================================================
  // 4. 复数规则
  // ============================================================================

  /**
   * 获取复数形式
   * @param count - 数量
   * @param rules - 复数规则对象
   * @param lang - 可选语言
   * @returns 正确的复数形式
   * 
   * @example
   * intl.plural(1, { one: 'item', other: 'items' }) // => 'item'
   * intl.plural(5, { one: 'item', other: 'items' }) // => 'items'
   * intl.plural(0, { zero: '无', one: '项', other: '项' }, 'zh') // => '无'
   */
  plural(count: number, rules: PluralRules, lang?: Language): string {
    const locale = lang || this.currentLanguage;
    const localeMap: Record<Language, string> = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR',
      fr: 'fr-FR',
      de: 'de-DE',
      es: 'es-ES',
    };

    const pluralRules = new Intl.PluralRules(localeMap[locale]);
    const pluralCategory = pluralRules.select(count) as keyof PluralRules;

    // 按优先级查找：具体类别 -> few/many -> other
    return rules[pluralCategory] || rules.other;
  }

  /**
   * 带计数的复数翻译
   * @param keyPath - 翻译键路径（会自动添加 .zero/.one/.other 后缀）
   * @param count - 数量
   * @param params - 额外插值参数
   * @param lang - 可选语言
   * @returns 带计数的翻译字符串
   * 
   * @example
   * intl.pluralT('messages.items', 5, { count: 5 })
   * // 翻译键：messages.items.zero/one/other
   * // 结果："5 items"
   */
  pluralT(keyPath: string, count: number, params?: Record<string, string | number>, lang?: Language): string {
    const locale = lang || this.currentLanguage;
    const pluralRules = new Intl.PluralRules(locale === 'zh' ? 'zh-CN' : locale);
    const pluralCategory = pluralRules.select(count);

    // 尝试获取特定复数形式的翻译
    const specificKey = `${keyPath}.${pluralCategory}`;
    const fallbackKey = `${keyPath}.other`;

    let text = this.t(specificKey, lang);
    if (text === specificKey) {
      text = this.t(fallbackKey, lang);
    }
    if (text === fallbackKey) {
      text = this.t(keyPath, lang);
    }

    // 插值
    if (params) {
      return this.tInterpolate(text, { count, ...params }, lang);
    }

    return text.replace('{count}', String(count));
  }

  // ============================================================================
  // 5. 工具方法
  // ============================================================================

  /**
   * 从 localStorage 加载用户语言偏好
   */
  loadLanguageFromStorage(storageKey: string = 'intl-language'): Language | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem(storageKey);
    if (stored && this.config.supportedLanguages.includes(stored as Language)) {
      return stored as Language;
    }

    return null;
  }

  /**
   * 保存语言偏好到 localStorage
   */
  saveLanguageToStorage(lang: Language, storageKey: string = 'intl-language'): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(storageKey, lang);
  }

  /**
   * 初始化（自动加载存储的语言偏好）
   */
  init(storageKey?: string): void {
    const storedLang = this.loadLanguageFromStorage(storageKey);
    if (storedLang) {
      this.setLanguage(storedLang);
    }
  }

  /**
   * 检测浏览器语言
   * @returns 匹配的支持语言或默认语言
   */
  detectBrowserLanguage(): Language {
    if (typeof navigator === 'undefined') {
      return this.config.defaultLanguage;
    }

    const browserLang = navigator.language.slice(0, 2);
    
    if (this.config.supportedLanguages.includes(browserLang as Language)) {
      return browserLang as Language;
    }

    return this.config.defaultLanguage;
  }
}

// ============================================================================
// 默认导出
// ============================================================================

export const intl = new IntlUtils();

export default intl;

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import intl, { IntlUtils } from './intl-utils-skill';
 * 
 * // 基础翻译
 * console.log(intl.t('common.loading')); // '加载中...'
 * 
 * // 切换语言
 * intl.setLanguage('en');
 * console.log(intl.t('common.loading')); // 'Loading...'
 * 
 * // 带插值的翻译
 * console.log(intl.tInterpolate('messages.greeting', { name: 'Axon' }));
 * 
 * // 日期格式化
 * console.log(intl.formatDate(new Date())); // '2026 年 3 月 13 日'
 * console.log(intl.formatDate(Date.now(), { style: 'long', locale: 'en' }));
 * 
 * // 相对时间
 * console.log(intl.formatRelativeTime(Date.now() - 60000)); // '1 分钟前'
 * 
 * // 数字格式化
 * console.log(intl.formatNumber(1234567.89)); // '1,234,567.89'
 * console.log(intl.formatCurrency(1234.56, 'USD')); // '$1,234.56'
 * console.log(intl.formatPercent(0.75)); // '75%'
 * console.log(intl.formatFileSize(1536000)); // '1.5 MB'
 * 
 * // 复数规则
 * console.log(intl.plural(1, { one: 'item', other: 'items' })); // 'item'
 * console.log(intl.plural(5, { one: 'item', other: 'items' })); // 'items'
 * 
 * // 创建自定义实例
 * const customIntl = new IntlUtils({
 *   defaultLanguage: 'ja',
 *   supportedLanguages: ['ja', 'en']
 * });
 * ```
 */

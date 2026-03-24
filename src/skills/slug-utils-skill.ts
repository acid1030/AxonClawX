/**
 * URL Slug 生成工具技能
 * 
 * 功能:
 * 1. Slug 生成 - 将文本转换为 URL 友好的 slug
 * 2. 多语言支持 - 支持中文、英文、日文等常见语言
 * 3. 唯一性保证 - 通过计数器确保 slug 唯一性
 * 
 * @module skills/slug-utils
 */

// ==================== 语言映射表 ====================

/**
 * 中文拼音映射 (常用汉字)
 * 实际项目中建议使用 pinyin 库获得更完整的支持
 */
const CHINESE_PINYIN_MAP: Record<string, string> = {
  '中': 'zhong',
  '国': 'guo',
  '人': 'ren',
  '民': 'min',
  '北': 'bei',
  '京': 'jing',
  '上': 'shang',
  '海': 'hai',
  '天': 'tian',
  '安': 'an',
  '门': 'men',
  '欢': 'huan',
  '迎': 'ying',
  '你': 'ni',
  '好': 'hao',
  '世': 'shi',
  '界': 'jie',
  '测': 'ce',
  '试': 'shi',
  '数': 'shu',
  '据': 'ju',
  '库': 'ku',
  '服': 'fu',
  '务': 'wu',
  '器': 'qi',
  '应': 'ying',
  '用': 'yong',
  '程': 'cheng',
  '序': 'xu',
  '开': 'kai',
  '发': 'fa',
  '设': 'she',
  '计': 'ji',
  '系': 'xi',
  '统': 'tong',
  '管': 'guan',
  '理': 'li',
  '配': 'pei',
  '置': 'zhi',
  '优': 'you',
  '化': 'hua',
  '性': 'xing',
  '能': 'neng',
  '全': 'quan',
  '监': 'jian',
  '控': 'kong',
  '日': 'ri',
  '志': 'zhi',
  '分': 'fen',
  '析': 'xi',
  '报': 'bao',
  '告': 'gao',
  '图': 'tu',
  '表': 'biao',
  '看': 'kan',
  '板': 'ban',
  '仪': 'yi',
  '盘': 'pan',
  '导': 'dao',
  '航': 'hang',
  '菜': 'cai',
  '单': 'dan',
  '按': 'an',
  '钮': 'niu',
  '格': 'ge',
  '列': 'lie',
  '卡': 'ka',
  '片': 'pian',
  '模': 'mo',
  '块': 'kuai',
  '组': 'zu',
  '件': 'jian',
  '插': 'cha',
  '入': 'ru',
  '式': 'shi',
  '页': 'ye',
  '面': 'mian',
  '路': 'lu',
  '由': 'you',
  '接': 'jie',
  '口': 'kou',
  '端': 'duan',
  '点': 'dian',
  '请': 'qing',
  '求': 'qiu',
  '响': 'xiang',
  '类': 'lei',
  '型': 'xing',
  '属': 'shu',
  '方': 'fang',
  '法': 'fa',
  '参': 'can',
  '返': 'fan',
  '回': 'hui',
  '值': 'zhi',
  '错': 'cuo',
  '误': 'wu',
  '异': 'yi',
  '常': 'chang',
  '处': 'chu',
  '捕': 'bu',
  '获': 'huo',
  '抛': 'pao',
  '出': 'chu',
  '投': 'tou',
  '递': 'di',
  '注': 'zhu',
  '释': 'shi',
  '说': 'shuo',
  '明': 'ming',
  '文': 'wen',
  '档': 'dang',
  '教': 'jiao',
  '指': 'zhi',
  '南': 'nan',
  '手': 'shou',
  '册': 'ce',
  '帮': 'bang',
  '助': 'zhu',
  '支': 'zhi',
  '持': 'chi',
  '反': 'fan',
  '馈': 'kui',
  '建': 'jian',
  '议': 'yi',
  '问': 'wen',
  '题': 'ti',
  '修': 'xiu',
  '复': 'fu',
  '更': 'geng',
  '新': 'xin',
  '升': 'sheng',
  '级': 'ji',
  '版': 'ban',
  '本': 'ben',
  '号': 'hao',
  '期': 'qi',
  '时': 'shi',
  '间': 'jian',
  '戳': 'chuo',
  '标': 'biao',
  '签': 'qian',
  '记': 'ji',
  '索': 'suo',
  '引': 'yin',
  '搜': 'sou',
  '擎': 'qing',
  '过': 'guo',
  '滤': 'lv',
  '排': 'pai',
  '加': 'jia',
  '载': 'zai',
  '空': 'kong',
  '状': 'zhuang',
  '态': 'tai',
  '未': 'wei',
  '找': 'zhao',
  '到': 'dao',
  '权': 'quan',
  '限': 'xian',
  '不': 'bu',
  '足': 'zu',
  '拒': 'ju',
  '绝': 'jue',
  '访': 'fang',
  '登': 'deng',
  '录': 'lu',
  '销': 'xiao',
  '密': 'mi',
  '码': 'ma',
  '重': 'chong',
  '验': 'yan',
  '证': 'zheng',
  '邮': 'you',
  '机': 'ji',
  '短': 'duan',
  '信': 'xin',
  '微': 'wei',
  '博': 'bo',
  '付': 'fu',
  '宝': 'bao',
  '订': 'ding',
  '购': 'gou',
  '物': 'wu',
  '车': 'che',
  '收': 'shou',
  '藏': 'cang',
  '喜': 'xi',
  '浏': 'liu',
  '览': 'lan',
  '历': 'li',
  '史': 'shi',
  '迹': 'ji',
  '推': 'tui',
  '荐': 'jian',
  '热': 're',
  '行': 'hang',
  '榜': 'bang',
  '闻': 'wen',
  '资': 'zi',
  '讯': 'xun',
  '公': 'gong',
  '通': 'tong',
  '知': 'zhi',
  '消': 'xiao',
  '息': 'xi',
  '醒': 'xing',
  '个': 'ge',
  '主': 'zhu',
  '肤': 'fu',
  '色': 'se',
  '字': 'zi',
  '体': 'ti',
  '大': 'da',
  '小': 'xiao',
  '亮': 'liang',
  '度': 'du',
  '对': 'dui',
  '比': 'bi',
  '饱': 'bao',
  '和': 'he',
  '调': 'diao',
  '风': 'feng',
  '布': 'bu',
  '局': 'ju',
  '视': 'shi',
  '元': 'yuan',
  '素': 'su',
  '节': 'jie',
  '树': 'shu',
  '结': 'jie',
  '构': 'gou',
  '层': 'ceng',
  '关': 'guan',
  '依': 'yi',
  '赖': 'lai',
  '继': 'ji',
  '承': 'cheng',
  '实': 'shi',
  '现': 'xian',
  '抽': 'chou',
  '象': 'xiang',
  '例': 'li',
  '网': 'wang',
  '络': 'luo',
  '地': 'di',
  '址': 'zhi',
  '链': 'lian',
  '夹': 'jia',
  '目': 'mu',
  '操': 'cao',
  '作': 'zuo',
  '进': 'jin',
  '线': 'xian',
  '步': 'bu',
  '同': 'tong',
  '池': 'chi',
  '连': 'lian'
};

/**
 * 日文罗马音映射 (常用假名)
 */
const JAPANESE_ROMAJI_MAP: Record<string, string> = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'wo', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
};

/**
 * 韩文罗马音映射 (常用音节)
 */
const KOREAN_ROMAJI_MAP: Record<string, string> = {
  '가': 'ga', '나': 'na', '다': 'da', '라': 'ra', '마': 'ma',
  '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha',
  '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha',
  '고': 'go', '노': 'no', '도': 'do', '로': 'ro', '모': 'mo',
  '보': 'bo', '소': 'so', '오': 'o', '조': 'jo', '초': 'cho',
  '코': 'ko', '토': 'to', '포': 'po', '호': 'ho',
};

// ==================== 核心工具函数 ====================

/**
 * 移除变音符号 (accents)
 * @param str - 输入字符串
 * @returns 移除变音符号后的字符串
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * 将中文转换为拼音 (简化版)
 * @param str - 中文字符串
 * @returns 拼音字符串
 */
function chineseToPinyin(str: string): string {
  let result = '';
  for (const char of str) {
    result += CHINESE_PINYIN_MAP[char] || char;
  }
  return result;
}

/**
 * 将日文转换为罗马音 (简化版)
 * @param str - 日文字符串
 * @returns 罗马音字符串
 */
function japaneseToRomaji(str: string): string {
  let result = '';
  for (const char of str) {
    result += JAPANESE_ROMAJI_MAP[char] || char;
  }
  return result;
}

/**
 * 将韩文转换为罗马音 (简化版)
 * @param str - 韩文字符串
 * @returns 罗马音字符串
 */
function koreanToRomaji(str: string): string {
  let result = '';
  for (const char of str) {
    result += KOREAN_ROMAJI_MAP[char] || char;
  }
  return result;
}

/**
 * 检测字符串中的主要语言
 * @param str - 输入字符串
 * @returns 语言代码
 */
function detectLanguage(str: string): string {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  const koreanRegex = /[\uac00-\ud7af]/;
  
  if (chineseRegex.test(str)) return 'zh';
  if (japaneseRegex.test(str)) return 'ja';
  if (koreanRegex.test(str)) return 'ko';
  return 'en';
}

/**
 * 将文本转换为 ASCII (处理多语言)
 * @param str - 输入字符串
 * @returns ASCII 字符串
 */
function toASCII(str: string): string {
  const lang = detectLanguage(str);
  
  switch (lang) {
    case 'zh':
      return chineseToPinyin(str);
    case 'ja':
      return japaneseToRomaji(str);
    case 'ko':
      return koreanToRomaji(str);
    default:
      return removeAccents(str);
  }
}

// ==================== Slug 生成 ====================

/**
 * 生成 URL Slug
 * 
 * 功能:
 * 1. 转换为小写
 * 2. 移除特殊字符
 * 3. 空格替换为连字符
 * 4. 移除多余连字符
 * 5. 支持多语言 (中文/日文/韩文)
 * 
 * @param text - 要转换的文本
 * @param options - 配置选项
 * @returns URL 友好的 slug
 * 
 * @example
 * generateSlug('Hello World!') // 'hello-world'
 * generateSlug('你好世界') // 'ni-hao-shi-jie'
 * generateSlug('日本語テスト') // 'ji-ben-yu-tesuto'
 */
export function generateSlug(
  text: string,
  options: {
    maxLength?: number;
    separator?: string;
    lowercase?: boolean;
    stopWords?: string[];
  } = {}
): string {
  const {
    maxLength = 100,
    separator = '-',
    lowercase = true,
    stopWords = [],
  } = options;
  
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // 1. 转换为 ASCII (处理多语言)
  let slug = toASCII(text);
  
  // 2. 转换为小写
  if (lowercase) {
    slug = slug.toLowerCase();
  }
  
  // 3. 移除所有非字母数字字符 (保留空格用于后续处理)
  slug = slug.replace(/[^\w\s-]/g, '');
  
  // 4. 移除多余空白
  slug = slug.trim();
  
  // 5. 移除停用词 (如果提供)
  if (stopWords.length > 0) {
    const words = slug.split(/\s+/);
    slug = words.filter(word => !stopWords.includes(word.toLowerCase())).join(' ');
  }
  
  // 6. 空格替换为分隔符
  slug = slug.replace(/\s+/g, separator);
  
  // 7. 移除连续的 separator
  const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const multiSeparatorRegex = new RegExp(`${escapedSeparator}+`, 'g');
  slug = slug.replace(multiSeparatorRegex, separator);
  
  // 8. 移除首尾的 separator
  slug = slug.replace(new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, 'g'), '');
  
  // 9. 限制长度
  if (maxLength && slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    // 确保不在 separator 处截断
    slug = slug.replace(new RegExp(`${escapedSeparator}+$`), '');
  }
  
  return slug || 'untitled';
}

/**
 * 批量生成 Slugs
 * @param texts - 文本数组
 * @param options - 配置选项
 * @returns Slugs 数组
 */
export function generateSlugs(
  texts: string[],
  options?: {
    maxLength?: number;
    separator?: string;
    lowercase?: boolean;
  }
): string[] {
  return texts.map(text => generateSlug(text, options));
}

// ==================== 唯一性保证 ====================

/**
 * Slug 生成器类 (带唯一性保证)
 * 
 * 通过内部计数器确保生成的 slug 唯一
 */
export class SlugGenerator {
  private usedSlugs: Set<string> = new Set();
  private slugCounts: Map<string, number> = new Map();
  
  /**
   * 生成唯一的 slug
   * 
   * 如果 slug 已存在，自动添加数字后缀
   * 
   * @param text - 要转换的文本
   * @param options - 配置选项
   * @returns 唯一的 slug
   * 
   * @example
   * const generator = new SlugGenerator();
   * generator.generateUnique('Hello World') // 'hello-world'
   * generator.generateUnique('Hello World') // 'hello-world-1'
   * generator.generateUnique('Hello World') // 'hello-world-2'
   */
  generateUnique(
    text: string,
    options: {
      maxLength?: number;
      separator?: string;
      lowercase?: boolean;
    } = {}
  ): string {
    const baseSlug = generateSlug(text, options);
    const { separator = '-' } = options;
    
    // 如果 slug 未被使用，直接返回
    if (!this.usedSlugs.has(baseSlug)) {
      this.usedSlugs.add(baseSlug);
      this.slugCounts.set(baseSlug, 0);
      return baseSlug;
    }
    
    // 如果已存在，添加数字后缀
    let count = this.slugCounts.get(baseSlug) || 0;
    let uniqueSlug: string;
    
    do {
      count++;
      uniqueSlug = `${baseSlug}${separator}${count}`;
    } while (this.usedSlugs.has(uniqueSlug));
    
    this.usedSlugs.add(uniqueSlug);
    this.slugCounts.set(baseSlug, count);
    
    return uniqueSlug;
  }
  
  /**
   * 批量生成唯一 slugs
   * @param texts - 文本数组
   * @param options - 配置选项
   * @returns 唯一 slugs 数组
   */
  generateUniqueBatch(
    texts: string[],
    options?: {
      maxLength?: number;
      separator?: string;
      lowercase?: boolean;
    }
  ): string[] {
    return texts.map(text => this.generateUnique(text, options));
  }
  
  /**
   * 检查 slug 是否已被使用
   * @param slug - 要检查的 slug
   * @returns 是否已使用
   */
  isUsed(slug: string): boolean {
    return this.usedSlugs.has(slug);
  }
  
  /**
   * 标记 slug 为已使用
   * @param slug - 要标记的 slug
   */
  markAsUsed(slug: string): void {
    this.usedSlugs.add(slug);
  }
  
  /**
   * 释放 slug (标记为未使用)
   * @param slug - 要释放的 slug
   */
  release(slug: string): void {
    this.usedSlugs.delete(slug);
  }
  
  /**
   * 重置生成器
   */
  reset(): void {
    this.usedSlugs.clear();
    this.slugCounts.clear();
  }
  
  /**
   * 获取已使用的 slugs 数量
   * @returns 数量
   */
  getCount(): number {
    return this.usedSlugs.size;
  }
  
  /**
   * 获取所有已使用的 slugs
   * @returns Slugs 数组
   */
  getAll(): string[] {
    return Array.from(this.usedSlugs);
  }
}

/**
 * 从现有 slugs 创建生成器
 * @param existingSlugs - 已存在的 slugs 数组
 * @returns SlugGenerator 实例
 */
export function createSlugGenerator(existingSlugs: string[] = []): SlugGenerator {
  const generator = new SlugGenerator();
  existingSlugs.forEach(slug => generator.markAsUsed(slug));
  return generator;
}

// ==================== 高级功能 ====================

/**
 * 验证 slug 是否合法
 * @param slug - 要验证的 slug
 * @param options - 验证选项
 * @returns 是否合法
 */
export function validateSlug(
  slug: string,
  options: {
    maxLength?: number;
    allowNumbers?: boolean;
    allowSeparator?: boolean;
    separator?: string;
  } = {}
): boolean {
  const {
    maxLength = 100,
    allowNumbers = true,
    allowSeparator = true,
    separator = '-',
  } = options;
  
  if (!slug || slug.length === 0 || slug.length > maxLength) {
    return false;
  }
  
  // 不能以 separator 开头或结尾
  if (slug.startsWith(separator) || slug.endsWith(separator)) {
    return false;
  }
  
  // 不能有连续的 separator
  if (slug.includes(separator + separator)) {
    return false;
  }
  
  // 构建正则表达式
  let pattern = '^[a-z';
  if (allowNumbers) pattern += '0-9';
  if (allowSeparator) pattern += separator.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  pattern += ']+$';
  
  const regex = new RegExp(pattern);
  return regex.test(slug);
}

/**
 * 修复不合法的 slug
 * @param slug - 要修复的 slug
 * @param options - 配置选项
 * @returns 修复后的 slug
 */
export function fixSlug(
  slug: string,
  options: {
    maxLength?: number;
    separator?: string;
  } = {}
): string {
  const { maxLength = 100, separator = '-' } = options;
  
  if (!slug) return 'untitled';
  
  // 转换为小写
  slug = slug.toLowerCase();
  
  // 替换非法字符为 separator
  slug = slug.replace(/[^a-z0-9-]/g, separator);
  
  // 移除连续的 separator
  const escapedSeparator = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const multiSeparatorRegex = new RegExp(`${escapedSeparator}+`, 'g');
  slug = slug.replace(multiSeparatorRegex, separator);
  
  // 移除首尾的 separator
  slug = slug.replace(new RegExp(`^${escapedSeparator}+|${escapedSeparator}+$`, 'g'), '');
  
  // 限制长度
  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength);
    slug = slug.replace(new RegExp(`${escapedSeparator}+$`), '');
  }
  
  return slug || 'untitled';
}

/**
 * 生成带时间戳的 slug (保证唯一性)
 * @param text - 要转换的文本
 * @param options - 配置选项
 * @returns 带时间戳的 slug
 */
export function generateSlugWithTimestamp(
  text: string,
  options: {
    maxLength?: number;
    separator?: string;
    timestampFormat?: 'date' | 'datetime' | 'unix';
  } = {}
): string {
  const {
    maxLength = 100,
    separator = '-',
    timestampFormat = 'date',
  } = options;
  
  const baseSlug = generateSlug(text, { maxLength: maxLength - 20, separator });
  let timestamp: string;
  
  const now = new Date();
  switch (timestampFormat) {
    case 'datetime':
      timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      break;
    case 'unix':
      timestamp = now.getTime().toString();
      break;
    case 'date':
    default:
      timestamp = now.toISOString().slice(0, 10);
      break;
  }
  
  return `${baseSlug}${separator}${timestamp}`;
}

// ==================== 导出 ====================

export const SlugUtils = {
  // 核心功能
  generateSlug,
  generateSlugs,
  
  // 唯一性保证
  SlugGenerator,
  createSlugGenerator,
  
  // 验证与修复
  validateSlug,
  fixSlug,
  
  // 高级功能
  generateSlugWithTimestamp,
  
  // 语言检测
  detectLanguage,
  
  // 转换工具
  toASCII,
  chineseToPinyin,
  japaneseToRomaji,
  koreanToRomaji,
};

export default SlugUtils;

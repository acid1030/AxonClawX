/**
 * Emoji Utils Skill - ACE Emoji 处理工具
 * 
 * 功能:
 * 1. Emoji 解析 - 将 Emoji 转换为 Unicode 码点
 * 2. Emoji 转换 - Unicode 码点转 Emoji / 文本转 Emoji
 * 3. 表情映射 - 关键词到 Emoji 的映射表
 */

// ==================== 类型定义 ====================

export interface EmojiInfo {
  emoji: string;
  unicode: string;
  name: string;
  category: string;
  keywords: string[];
}

export interface EmojiMap {
  [key: string]: string;
}

// ==================== 表情映射表 ====================

export const EMOJI_KEYWORD_MAP: EmojiMap = {
  // 表情
  '开心': '😀',
  '笑': '😂',
  '哭': '😢',
  '生气': '😠',
  '爱': '😍',
  '喜欢': '😍',
  '思考': '🤔',
  '疑惑': '🤨',
  '惊讶': '😮',
  '害怕': '😱',
  '困': '😴',
  '累': '😫',
  '酷': '😎',
  '得意': '😏',
  '尴尬': '😅',
  '无语': '😑',
  '晕': '😵',
  '病': '🤒',
  '吐': '🤮',
  '吐舌头': '😜',
  '眨眼': '😉',
  '亲亲': '😘',
  '拥抱': '🤗',
  '祈祷': '🙏',
  '鼓掌': '👏',
  '点赞': '👍',
  '踩': '👎',
  '拳头': '👊',
  '胜利': '✌️',
  'OK': '👌',
  '挥手': '👋',
  '举手': '🙌',
  '肌肉': '💪',
  '大脑': '🧠',
  '心脏': '❤️',
  '心碎': '💔',
  '火': '🔥',
  '水': '💧',
  '太阳': '☀️',
  '月亮': '🌙',
  '星星': '⭐',
  '闪电': '⚡',
  '彩虹': '🌈',
  '雪': '❄️',
  
  // 动物
  '猫': '🐱',
  '狗': '🐶',
  '老鼠': '🐭',
  '兔子': '🐰',
  '狐狸': '🦊',
  '熊': '🐻',
  '熊猫': '🐼',
  '老虎': '🐯',
  '狮子': '🦁',
  '牛': '🐮',
  '猪': '🐷',
  '青蛙': '🐸',
  '猴子': '🐵',
  '鸡': '🐔',
  '鸟': '🐦',
  '鱼': '🐟',
  '蝴蝶': '🦋',
  '蜜蜂': '🐝',
  '蜘蛛': '🕷️',
  '乌龟': '🐢',
  '蛇': '🐍',
  '龙': '🐉',
  '恐龙': '🦕',
  '鲸鱼': '🐳',
  '海豚': '🐬',
  '章鱼': '🐙',
  '虾': '🦐',
  '螃蟹': '🦀',
  '马': '🐴',
  '羊': '🐑',
  '鹿': '🦌',
  '大象': '🐘',
  '长颈鹿': '🦒',
  '河马': '🦛',
  '犀牛': '🦏',
  '蝙蝠': '🦇',
  '狼': '🐺',
  '豹': '🐆',
  '斑马': '🦓',
  '袋鼠': '🦘',
  '树懒': '🦥',
  '水獭': '🦦',
  '臭鼬': '🦨',
  '天鹅': '🦢',
  '孔雀': '🦚',
  '鹦鹉': '🦜',
  ' flamingo': '🦩',
  '猫头鹰': '🦉',
  '鹰': '🦅',
  '鸭子': '🦆',
  '公鸡': '🐓',
  '火鸡': '🦃',
  
  // 食物
  '苹果': '🍎',
  '香蕉': '🍌',
  '葡萄': '🍇',
  '西瓜': '🍉',
  '橙子': '🍊',
  '柠檬': '🍋',
  '草莓': '🍓',
  '樱桃': '🍒',
  '桃子': '🍑',
  '梨': '🍐',
  '菠萝': '🍍',
  '芒果': '🥭',
  '椰子': '🥥',
  '猕猴桃': '🥝',
  '西红柿': '🍅',
  '茄子': '🍆',
  '土豆': '🥔',
  '胡萝卜': '🥕',
  '玉米': '🌽',
  '辣椒': '🌶️',
  '黄瓜': '🥒',
  '生菜': '🥬',
  '西兰花': '🥦',
  '蘑菇': '🍄',
  '花生': '🥜',
  '面包': '🍞',
  '米饭': '🍚',
  '面条': '🍜',
  '披萨': '🍕',
  '汉堡': '🍔',
  '薯条': '🍟',
  '热狗': '🌭',
  '三明治': '🥪',
  ' tacos': '🌮',
  ' burrito': '🌯',
  '芝士': '🧀',
  '肉': '🥩',
  '鸡肉': '🍗',
  '培根': '🥓',
  '鸡蛋': '🥚',
  '煎蛋': '🍳',
  '鱼': '🐟',
  '虾': '🦐',
  '寿司': '🍣',
  '便当': '🍱',
  '咖喱': '🍛',
  '汤': '🍲',
  '沙拉': '🥗',
  '爆米花': '🍿',
  '饼干': '🍪',
  '蛋糕': '🎂',
  '冰淇淋': '🍦',
  '巧克力': '🍫',
  '糖果': '🍬',
  '棒棒糖': '🍭',
  '甜甜圈': '🍩',
  '咖啡': '☕',
  '茶': '🍵',
  '牛奶': '🥛',
  '啤酒': '🍺',
  '葡萄酒': '🍷',
  '鸡尾酒': '🍹',
  '香槟': '🥂',
  
  // 交通
  '汽车': '🚗',
  '出租车': '🚕',
  '公交车': '🚌',
  '火车': '🚂',
  '地铁': '🚇',
  '飞机': '✈️',
  '船': '🚢',
  '自行车': '🚲',
  '摩托车': '🏍️',
  '火箭': '🚀',
  '警车': '🚓',
  '消防车': '🚒',
  '救护车': '🚑',
  '卡车': '🚚',
  '拖拉机': '🚜',
  '滑板车': '🛴',
  '滑板': '🛹',
  '直升机': '🚁',
  '帆船': '⛵',
  '快艇': '🚤',
  ' UFO': '🛸',
  '卫星': '🛰️',
  
  // 建筑
  '房子': '🏠',
  '家': '🏡',
  '办公楼': '🏢',
  '学校': '🏫',
  '医院': '🏥',
  '商店': '🏪',
  '酒店': '🏨',
  '银行': '🏦',
  '教堂': '⛪',
  '清真寺': '🕌',
  '寺庙': '⛩️',
  '城堡': '🏰',
  '工厂': '🏭',
  '体育馆': '🏟️',
  '图书馆': '📚',
  '电影院': '🎬',
  '博物馆': '🏛️',
  '帐篷': '⛺',
  '桥': '🌉',
  '喷泉': '⛲',
  
  // 物品
  '手机': '📱',
  '电脑': '💻',
  '键盘': '⌨️',
  '鼠标': '🖱️',
  '屏幕': '🖥️',
  '打印机': '🖨️',
  '相机': '📷',
  '录像': '📹',
  '电视': '📺',
  '收音机': '📻',
  '电话': '☎️',
  '传真': '📠',
  '电池': '🔋',
  '插头': '🔌',
  '灯泡': '💡',
  '手电筒': '🔦',
  '蜡烛': '🕯️',
  '书': '📖',
  '笔记本': '📓',
  '笔': '🖊️',
  '铅笔': '✏️',
  '剪刀': '✂️',
  '尺子': '📏',
  '回形针': '📎',
  '图钉': '📌',
  '标签': '🏷️',
  '钥匙': '🔑',
  '锁': '🔒',
  '锤子': '🔨',
  '螺丝刀': '🪛',
  '扳手': '🔧',
  '锯子': '🪚',
  '枪': '🔫',
  '炸弹': '💣',
  '刀': '🔪',
  '剑': '⚔️',
  '盾': '🛡️',
  '弓箭': '🏹',
  '魔术': '🎩',
  '礼物': '🎁',
  '气球': '🎈',
  '彩带': '🎉',
  '烟花': '🎆',
  '灯笼': '🏮',
  '风筝': '🪁',
  '拼图': '🧩',
  '玩具': '🧸',
  '骰子': '🎲',
  '飞镖': '🎯',
  '台球': '🎱',
  '足球': '⚽',
  '篮球': '🏀',
  '橄榄球': '🏈',
  '棒球': '⚾',
  '网球': '🎾',
  '排球': '🏐',
  '乒乓球': '🏓',
  '羽毛球': '🏸',
  '冰球': '🏒',
  '曲棍球': '🏑',
  '高尔夫': '⛳',
  '钓鱼': '🎣',
  '滑雪': '🎿',
  '冲浪': '🏄',
  '游泳': '🏊',
  '跑步': '🏃',
  '骑行': '🚴',
  '登山': '🧗',
  '瑜伽': '🧘',
  '奖牌': '🏅',
  '奖杯': '🏆',
  '皇冠': '👑',
  '戒指': '💍',
  '钻石': '💎',
  '钱': '💰',
  '信用卡': '💳',
  '图表': '📊',
  '日历': '📅',
  '时钟': '🕐',
  '闹钟': '⏰',
  '沙漏': '⏳',
  '地球': '🌍',
  '地图': '🗺️',
  '指南针': '🧭',
  '望远镜': '🔭',
  '显微镜': '🔬',
  'DNA': '🧬',
  '药丸': '💊',
  '注射器': '💉',
  '口罩': '😷',
  '温度计': '🌡️',
  '创可贴': '🩹',
  '听诊器': '🩺',
  
  // 符号
  '对': '✅',
  '错': '❌',
  '问号': '❓',
  '感叹号': '❗',
  '禁止': '🚫',
  '警告': '⚠️',
  '辐射': '☢️',
  '生物危害': '☣️',
  '回收': '♻️',
  '和平': '☮️',
  '阴阳': '☯️',
  '无限': '♾️',
  '版权': '©️',
  '注册': '®️',
  '商标': '™️',
  '箭头': '➡️',
  '向上': '⬆️',
  '向下': '⬇️',
  '向左': '⬅️',
  '向右': '➡️',
  '播放': '▶️',
  '暂停': '⏸️',
  '停止': '⏹️',
  '录制': '⏺️',
  '快进': '⏩',
  '快退': '⏪',
  '随机': '🔀',
  '循环': '🔁',
  '音量': '🔊',
  '静音': '🔇',
  '搜索': '🔍',
  '链接': '🔗',
  '链条': '⛓️',
  '工具': '🛠️',
  '齿轮': '⚙️',
  '开关': '🔛',
  '电源': '🔌',
  'wifi': '📶',
  '信号': '📡',
  '蓝牙': '📲',
  '二维码': '📱',
  '条形码': '📊',
  '指纹': '👆',
  '眼睛': '👀',
  '耳朵': '👂',
  '鼻子': '👃',
  '嘴巴': '👄',
  '舌头': '👅',
  '脚印': '👣',
  
  // 自然
  '树': '🌲',
  '森林': '🌳',
  '棕榈树': '🌴',
  '仙人掌': '🌵',
  '花': '🌸',
  '玫瑰': '🌹',
  '向日葵': '🌻',
  '郁金香': '🌷',
  '樱花': '🌸',
  '叶子': '🍃',
  '草': '🌿',
  '四叶草': '🍀',
  '枫叶': '🍁',
  '枯叶': '🍂',
  '山': '⛰️',
  '火山': '🌋',
  '沙漠': '🏜️',
  '海滩': '🏖️',
  '岛屿': '🏝️',
  '峡谷': '🏞️',
  '瀑布': '💦',
  '河流': '🌊',
  '湖泊': '🏞️',
  '海洋': '🌊',
  '波浪': '🌊',
  '水滴': '💧',
  '汗滴': '💦',
  '云': '☁️',
  '乌云': '🌧️',
  '雷': '⛈️',
  '雾': '🌫️',
  '风': '💨',
  '龙卷风': '🌪️',
  '飓风': '🌀',
  '流星': '☄️',
  '彗星': '☄️',
  '银河': '🌌',
  '宇航员': '👨‍🚀',
  '外星人': '👽',
  '机器人': '🤖',
  '幽灵': '👻',
  '骷髅': '💀',
  '恶魔': '👿',
  '天使': '👼',
  '圣诞': '🎄',
  '南瓜': '🎃',
  '圣诞树': '🎄',
  '圣诞帽': '🎅',
  '雪人': '⛄',
  
  // 人物
  '男人': '👨',
  '女人': '👩',
  '男孩': '👦',
  '女孩': '👧',
  '婴儿': '👶',
  '老人': '👴',
  '老奶奶': '👵',
  '家庭': '👪',
  '情侣': '💑',
  '接吻': '💏',
  '婚礼': '💒',
  '生日': '🎂',
  '派对': '🎉',
  '庆祝': '🎊',
  '节日': '🎆',
  '圣诞': '🎄',
  '万圣节': '🎃',
  '新年': '🎆',
  '春节': '🧧',
  '红包': '🧧',
  '灯笼': '🏮',
  '舞狮': '🦁',
  '舞龙': '🐉',
  '饺子': '🥟',
  '汤圆': '🥣',
  '月饼': '🥮',
  '粽子': '🍙',
};

// ==================== 核心功能 ====================

/**
 * 1. Emoji 解析 - 将 Emoji 转换为 Unicode 码点
 */
export function parseEmoji(emoji: string): string {
  if (!emoji || emoji.trim() === '') {
    return '';
  }
  
  // 将 Emoji 转换为 Unicode 码点表示
  const codePoints = [...emoji].map(char => {
    const code = char.codePointAt(0);
    return code ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : '';
  });
  
  return codePoints.join(' ');
}

/**
 * 2. Emoji 转换 - Unicode 码点转 Emoji
 */
export function convertUnicodeToEmoji(unicode: string): string {
  if (!unicode || unicode.trim() === '') {
    return '';
  }
  
  // 支持多种格式: U+1F600, 1F600, \u{1F600}
  const matches = unicode.matchAll(/U\+([0-9A-Fa-f]+)|([0-9A-Fa-f]{4,6})|\\u\{([0-9A-Fa-f]+)\}/g);
  
  let result = '';
  for (const match of matches) {
    const codePoint = match[1] || match[2] || match[3];
    if (codePoint) {
      const code = parseInt(codePoint, 16);
      result += String.fromCodePoint(code);
    }
  }
  
  return result;
}

/**
 * 2. Emoji 转换 - 文本转 Emoji (基于关键词映射)
 */
export function convertTextToEmoji(text: string): string {
  if (!text || text.trim() === '') {
    return '';
  }
  
  let result = text;
  
  // 按关键词长度降序排序，优先匹配长关键词
  const sortedKeywords = Object.keys(EMOJI_KEYWORD_MAP).sort((a, b) => b.length - a.length);
  
  for (const keyword of sortedKeywords) {
    const regex = new RegExp(keyword, 'gi');
    result = result.replace(regex, EMOJI_KEYWORD_MAP[keyword]);
  }
  
  return result;
}

/**
 * 2. Emoji 转换 - Emoji 转文本
 */
export function convertEmojiToText(emoji: string): string {
  if (!emoji || emoji.trim() === '') {
    return '';
  }
  
  let result = emoji;
  
  // 反向映射
  const reverseMap: { [emoji: string]: string } = {};
  for (const [keyword, emojiChar] of Object.entries(EMOJI_KEYWORD_MAP)) {
    reverseMap[emojiChar] = keyword;
  }
  
  // 按 Emoji 长度降序排序，优先匹配复合 Emoji
  const sortedEmojis = Object.keys(reverseMap).sort((a, b) => b.length - a.length);
  
  for (const emojiChar of sortedEmojis) {
    const regex = new RegExp(emojiChar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, `[${reverseMap[emojiChar]}]`);
  }
  
  return result;
}

/**
 * 3. 表情映射 - 根据关键词获取 Emoji
 */
export function getEmojiByKeyword(keyword: string): string | undefined {
  return EMOJI_KEYWORD_MAP[keyword];
}

/**
 * 3. 表情映射 - 根据 Emoji 获取关键词
 */
export function getKeywordByEmoji(emoji: string): string | undefined {
  const reverseMap: { [emoji: string]: string } = {};
  for (const [keyword, emojiChar] of Object.entries(EMOJI_KEYWORD_MAP)) {
    reverseMap[emojiChar] = keyword;
  }
  return reverseMap[emoji];
}

/**
 * 3. 表情映射 - 搜索相关 Emoji
 */
export function searchEmojis(query: string): EmojiInfo[] {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const results: EmojiInfo[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const [keyword, emoji] of Object.entries(EMOJI_KEYWORD_MAP)) {
    if (keyword.toLowerCase().includes(lowerQuery)) {
      results.push({
        emoji,
        unicode: parseEmoji(emoji),
        name: keyword,
        category: getCategoryByKeyword(keyword),
        keywords: [keyword],
      });
    }
  }
  
  return results.slice(0, 20); // 限制返回数量
}

/**
 * 辅助函数 - 根据关键词获取分类
 */
function getCategoryByKeyword(keyword: string): string {
  const categoryMap: { [pattern: string]: string } = {
    '^(开心 | 笑 | 哭 | 生气 | 爱 | 喜欢 | 思考 | 疑惑 | 惊讶 | 害怕 | 困 | 累 | 酷 | 得意 | 尴尬 | 无语 | 晕 | 病 | 吐 | 吐舌头 | 眨眼 | 亲亲 | 拥抱 | 祈祷 | 鼓掌 | 点赞 | 踩 | 拳头 | 胜利 | OK|挥手 | 举手 | 肌肉 | 大脑 | 心脏 | 心碎)$': '表情',
    '^(猫 | 狗 | 老鼠 | 兔子 | 狐狸 | 熊 | 熊猫 | 老虎 | 狮子 | 牛 | 猪 | 青蛙 | 猴子 | 鸡 | 鸟 | 鱼 | 蝴蝶 | 蜜蜂 | 蜘蛛 | 乌龟 | 蛇 | 龙 | 恐龙 | 鲸鱼 | 海豚 | 章鱼 | 虾 | 螃蟹 | 马 | 羊 | 鹿 | 大象 | 长颈鹿 | 河马 | 犀牛 | 蝙蝠 | 狼 | 豹 | 斑马 | 袋鼠 | 树懒 | 水獭 | 臭鼬 | 天鹅 | 孔雀 | 鹦鹉 | 猫头鹰 | 鹰 | 鸭子 | 公鸡 | 火鸡)$': '动物',
    '^(苹果 | 香蕉 | 葡萄 | 西瓜 | 橙子 | 柠檬 | 草莓 | 樱桃 | 桃子 | 梨 | 菠萝 | 芒果 | 椰子 | 猕猴桃 | 西红柿 | 茄子 | 土豆 | 胡萝卜 | 玉米 | 辣椒 | 黄瓜 | 生菜 | 西兰花 | 蘑菇 | 花生 | 面包 | 米饭 | 面条 | 披萨 | 汉堡 | 薯条 | 热狗 | 三明治 | 芝士 | 肉 | 鸡肉 | 培根 | 鸡蛋 | 煎蛋 | 寿司 | 便当 | 咖喱 | 汤 | 沙拉 | 爆米花 | 饼干 | 蛋糕 | 冰淇淋 | 巧克力 | 糖果 | 棒棒糖 | 甜甜圈 | 咖啡 | 茶 | 牛奶 | 啤酒 | 葡萄酒 | 鸡尾酒 | 香槟)$': '食物',
    '^(汽车 | 出租车 | 公交车 | 火车 | 地铁 | 飞机 | 船 | 自行车 | 摩托车 | 火箭 | 警车 | 消防车 | 救护车 | 卡车 | 拖拉机 | 滑板车 | 滑板 | 直升机 | 帆船 | 快艇 | UFO|卫星)$': '交通',
    '^(房子 | 家 | 办公楼 | 学校 | 医院 | 商店 | 酒店 | 银行 | 教堂 | 清真寺 | 寺庙 | 城堡 | 工厂 | 体育馆 | 图书馆 | 电影院 | 博物馆 | 帐篷 | 桥 | 喷泉)$': '建筑',
    '^(手机 | 电脑 | 键盘 | 鼠标 | 屏幕 | 打印机 | 相机 | 录像 | 电视 | 收音机 | 电话 | 传真 | 电池 | 插头 | 灯泡 | 手电筒 | 蜡烛 | 书 | 笔记本 | 笔 | 铅笔 | 剪刀 | 尺子 | 回形针 | 图钉 | 标签 | 钥匙 | 锁 | 锤子 | 螺丝刀 | 扳手 | 锯子 | 枪 | 炸弹 | 刀 | 剑 | 盾 | 弓箭 | 魔术 | 礼物 | 气球 | 彩带 | 烟花 | 灯笼 | 风筝 | 拼图 | 玩具 | 骰子 | 飞镖 | 台球 | 足球 | 篮球 | 橄榄球 | 棒球 | 网球 | 排球 | 乒乓球 | 羽毛球 | 冰球 | 曲棍球 | 高尔夫 | 钓鱼 | 滑雪 | 冲浪 | 游泳 | 跑步 | 骑行 | 登山 | 瑜伽 | 奖牌 | 奖杯 | 皇冠 | 戒指 | 钻石 | 钱 | 信用卡 | 图表 | 日历 | 时钟 | 闹钟 | 沙漏 | 地球 | 地图 | 指南针 | 望远镜 | 显微镜 | DNA|药丸 | 注射器 | 口罩 | 温度计 | 创可贴 | 听诊器)$': '物品',
    '^(对 | 错 | 问号 | 感叹号 | 禁止 | 警告 | 辐射 | 生物危害 | 回收 | 和平 | 阴阳 | 无限 | 版权 | 注册 | 商标 | 箭头 | 向上 | 向下 | 向左 | 向右 | 播放 | 暂停 | 停止 | 录制 | 快进 | 快退 | 随机 | 循环 | 音量 | 静音 | 搜索 | 链接 | 链条 | 工具 | 齿轮 | 开关 | 电源 | wifi|信号 | 蓝牙 | 二维码 | 条形码 | 指纹 | 眼睛 | 耳朵 | 鼻子 | 嘴巴 | 舌头 | 脚印)$': '符号',
    '^(树 | 森林 | 棕榈树 | 仙人掌 | 花 | 玫瑰 | 向日葵 | 郁金香 | 樱花 | 叶子 | 草 | 四叶草 | 枫叶 | 枯叶 | 山 | 火山 | 沙漠 | 海滩 | 岛屿 | 峡谷 | 瀑布 | 河流 | 湖泊 | 海洋 | 波浪 | 水滴 | 汗滴 | 云 | 乌云 | 雷 | 雾 | 风 | 龙卷风 | 飓风 | 流星 | 彗星 | 银河 | 宇航员 | 外星人 | 机器人 | 幽灵 | 骷髅 | 恶魔 | 天使 | 圣诞 | 南瓜 | 圣诞树 | 圣诞帽 | 雪人)$': '自然',
    '^(男人 | 女人 | 男孩 | 女孩 | 婴儿 | 老人 | 老奶奶 | 家庭 | 情侣 | 接吻 | 婚礼 | 生日 | 派对 | 庆祝 | 节日 | 万圣节 | 新年 | 春节 | 红包 | 舞狮 | 舞龙 | 饺子 | 汤圆 | 月饼 | 粽子)$': '人物',
  };
  
  for (const [pattern, category] of Object.entries(categoryMap)) {
    if (new RegExp(pattern).test(keyword)) {
      return category;
    }
  }
  
  return '其他';
}

/**
 * 获取所有分类
 */
export function getAllCategories(): string[] {
  return ['表情', '动物', '食物', '交通', '建筑', '物品', '符号', '自然', '人物', '其他'];
}

/**
 * 根据分类获取 Emoji 列表
 */
export function getEmojisByCategory(category: string): EmojiInfo[] {
  const results: EmojiInfo[] = [];
  
  for (const [keyword, emoji] of Object.entries(EMOJI_KEYWORD_MAP)) {
    if (getCategoryByKeyword(keyword) === category) {
      results.push({
        emoji,
        unicode: parseEmoji(emoji),
        name: keyword,
        category,
        keywords: [keyword],
      });
    }
  }
  
  return results;
}

// ==================== 使用示例 ====================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { 
 *   parseEmoji, 
 *   convertUnicodeToEmoji, 
 *   convertTextToEmoji, 
 *   convertEmojiToText,
 *   getEmojiByKeyword,
 *   searchEmojis,
 *   getEmojisByCategory
 * } from './emoji-utils-skill';
 * 
 * // 1. Emoji 解析
 * console.log(parseEmoji('😀')); // 输出: U+1F600
 * console.log(parseEmoji('👨‍💻')); // 输出: U+1F468 U+200D U+1F4BB
 * 
 * // 2. Emoji 转换
 * console.log(convertUnicodeToEmoji('U+1F600')); // 输出: 😀
 * console.log(convertTextToEmoji('今天很开心')); // 输出: 今天很😀
 * console.log(convertEmojiToText('😀😂😍')); // 输出: [开心][笑][爱]
 * 
 * // 3. 表情映射
 * console.log(getEmojiByKeyword('开心')); // 输出: 😀
 * console.log(getKeywordByEmoji('😀')); // 输出: 开心
 * 
 * // 搜索相关 Emoji
 * const results = searchEmojis('猫');
 * console.log(results); // 输出: [{emoji: '🐱', name: '猫', ...}, {emoji: '🐱', name: '猫', ...}]
 * 
 * // 按分类获取
 * const animals = getEmojisByCategory('动物');
 * console.log(animals.length); // 输出: 动物类 Emoji 数量
 * ```
 */

// ==================== 导出 ====================

export default {
  parseEmoji,
  convertUnicodeToEmoji,
  convertTextToEmoji,
  convertEmojiToText,
  getEmojiByKeyword,
  getKeywordByEmoji,
  searchEmojis,
  getAllCategories,
  getEmojisByCategory,
  EMOJI_KEYWORD_MAP,
};

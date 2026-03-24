/**
 * Number Utils Skill - 数字工具技能
 * 
 * 功能:
 * 1. 数字格式化 (千分位、小数位控制)
 * 2. 科学计数法转换
 * 3. 中文大写数字转换
 */

// ============== 数字格式化 ==============

/**
 * 格式化数字为千分位格式
 * @param num - 要格式化的数字
 * @param decimals - 小数位数 (默认 2)
 * @param separator - 千分位分隔符 (默认 ',')
 * @param decimalPoint - 小数点符号 (默认 '.')
 * @returns 格式化后的字符串
 */
export function formatNumber(
  num: number,
  decimals: number = 2,
  separator: string = ',',
  decimalPoint: string = '.'
): string {
  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return parts.join(decimalPoint);
}

/**
 * 格式化数字为货币格式
 * @param num - 要格式化的数字
 * @param currency - 货币符号 (默认 '¥')
 * @param decimals - 小数位数 (默认 2)
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(
  num: number,
  currency: string = '¥',
  decimals: number = 2
): string {
  return `${currency}${formatNumber(num, decimals)}`;
}

/**
 * 格式化数字为百分比格式
 * @param num - 要格式化的数字 (0.15 → 15%)
 * @param decimals - 小数位数 (默认 0)
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(
  num: number,
  decimals: number = 0
): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

// ============== 科学计数法 ==============

/**
 * 将数字转换为科学计数法
 * @param num - 要转换的数字
 * @param precision - 有效数字位数 (默认 4)
 * @returns 科学计数法字符串 (如: "1.2345e+10")
 */
export function toScientificNotation(
  num: number,
  precision: number = 4
): string {
  if (num === 0) return '0';
  
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  const exponent = Math.floor(Math.log10(absNum));
  const mantissa = absNum / Math.pow(10, exponent);
  
  return `${sign}${mantissa.toFixed(precision - 1)}e${exponent >= 0 ? '+' : ''}${exponent}`;
}

/**
 * 将科学计数法字符串转换为数字
 * @param scientific - 科学计数法字符串 (如: "1.2345e+10")
 * @returns 转换后的数字
 */
export function fromScientificNotation(scientific: string): number {
  return Number(scientific);
}

/**
 * 格式化大数为易读格式 (K, M, B, T)
 * @param num - 要格式化的数字
 * @param decimals - 小数位数 (默认 1)
 * @returns 格式化后的字符串 (如: "1.5M", "2.3B")
 */
export function formatLargeNumber(
  num: number,
  decimals: number = 1
): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  const units = [
    { value: 1e12, symbol: 'T' },
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'K' },
  ];
  
  for (const unit of units) {
    if (absNum >= unit.value) {
      return `${sign}${(absNum / unit.value).toFixed(decimals)}${unit.symbol}`;
    }
  }
  
  return `${sign}${absNum.toFixed(decimals)}`;
}

// ============== 中文大写数字 ==============

/**
 * 中文大写数字映射表
 */
const CHINESE_NUMERALS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CHINESE_UNITS = ['', '拾', '佰', '仟'];
const CHINESE_BIG_UNITS = ['', '万', '亿', '兆'];

/**
 * 将数字转换为中文大写数字
 * @param num - 要转换的数字 (支持整数和小数)
 * @param options - 转换选项
 * @param options.isCurrency - 是否为金额模式 (添加"元整") (默认 false)
 * @param options.showZero - 是否显示零 (默认 true)
 * @returns 中文大写数字字符串
 */
export function toChineseUppercase(
  num: number,
  options: { isCurrency?: boolean; showZero?: boolean } = {}
): string {
  const { isCurrency = false, showZero = true } = options;
  
  if (num === 0) {
    return isCurrency ? '零元整' : '零';
  }
  
  const sign = num < 0 ? '负' : '';
  const absNum = Math.abs(num);
  
  // 分离整数和小数部分
  const [integerPart, decimalPart] = absNum.toString().split('.');
  
  // 转换整数部分
  let integerChinese = convertIntegerPart(integerPart, showZero);
  
  // 转换小数部分
  let decimalChinese = '';
  if (decimalPart) {
    decimalChinese = '点' + decimalPart.split('').map(d => CHINESE_NUMERALS[Number(d)]).join('');
  }
  
  // 组合结果
  let result = sign + integerChinese + decimalChinese;
  
  if (isCurrency) {
    result = result + '元';
    if (!decimalPart) {
      result = result + '整';
    }
  }
  
  return result;
}

/**
 * 转换整数部分为中文大写
 */
function convertIntegerPart(numStr: string, showZero: boolean): string {
  const len = numStr.length;
  let result = '';
  let zeroFlag = false;
  
  // 按 4 位分组处理 (万、亿等单位)
  const groups: string[] = [];
  for (let i = len; i > 0; i -= 4) {
    const start = Math.max(0, i - 4);
    groups.unshift(numStr.slice(start, i));
  }
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupLen = group.length;
    let groupResult = '';
    let groupZeroFlag = false;
    
    // 处理组内的每一位
    for (let j = 0; j < groupLen; j++) {
      const digit = Number(group[j]);
      const unitIndex = groupLen - j - 1;
      
      if (digit === 0) {
        groupZeroFlag = true;
      } else {
        if (groupZeroFlag && showZero) {
          groupResult += '零';
        }
        groupResult += CHINESE_NUMERALS[digit] + CHINESE_UNITS[unitIndex];
        groupZeroFlag = false;
      }
    }
    
    // 添加组单位 (万、亿等)
    if (groupResult) {
      const bigUnitIndex = groups.length - i - 1;
      groupResult += CHINESE_BIG_UNITS[bigUnitIndex];
      result += groupResult;
    } else if (result && groupZeroFlag && showZero) {
      // 处理连续的零
      if (!result.endsWith('零')) {
        result += '零';
      }
    }
  }
  
  // 清理末尾的零
  result = result.replace(/零+$/, '');
  result = result.replace(/零+/g, '零');
  
  return result || '零';
}

/**
 * 将中文大写数字转换回阿拉伯数字
 * @param chinese - 中文大写数字字符串
 * @returns 转换后的数字
 */
export function fromChineseUppercase(chinese: string): number {
  const sign = chinese.startsWith('负') ? -1 : 1;
  const cleanChinese = chinese.replace(/^负/, '').replace(/[元整点].*$/, '');
  
  let result = 0;
  let currentNum = 0;
  let currentUnit = 1;
  
  const numeralsMap: Record<string, number> = {};
  CHINESE_NUMERALS.forEach((char, idx) => {
    numeralsMap[char] = idx;
  });
  
  const unitsMap: Record<string, number> = {
    '拾': 10,
    '佰': 100,
    '仟': 1000,
    '万': 10000,
    '亿': 100000000,
    '兆': 1000000000000,
  };
  
  for (let i = 0; i < cleanChinese.length; i++) {
    const char = cleanChinese[i];
    
    if (char === '零') {
      currentNum = 0;
    } else if (char in numeralsMap) {
      currentNum = numeralsMap[char];
    } else if (char in unitsMap) {
      const unitValue = unitsMap[char];
      if (unitValue >= 10000) {
        result += currentNum * unitValue;
        currentNum = 0;
        currentUnit = unitValue;
      } else {
        currentNum = (currentNum || 1) * unitValue;
      }
    } else if (char === '点') {
      // 处理小数部分 (简化处理)
      break;
    }
  }
  
  return sign * (result + currentNum);
}

// ============== 工具函数 ==============

/**
 * 判断是否为有效数字
 */
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * 安全解析数字字符串
 */
export function safeParseNumber(str: string, defaultValue: number = 0): number {
  const parsed = Number(str);
  return isValidNumber(parsed) ? parsed : defaultValue;
}

/**
 * 四舍五入到指定精度
 */
export function roundTo(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

// ============== 导出技能接口 ==============

export interface NumberUtilsSkill {
  // 数字格式化
  formatNumber: typeof formatNumber;
  formatCurrency: typeof formatCurrency;
  formatPercent: typeof formatPercent;
  formatLargeNumber: typeof formatLargeNumber;
  
  // 科学计数法
  toScientificNotation: typeof toScientificNotation;
  fromScientificNotation: typeof fromScientificNotation;
  
  // 中文大写数字
  toChineseUppercase: typeof toChineseUppercase;
  fromChineseUppercase: typeof fromChineseUppercase;
  
  // 工具函数
  isValidNumber: typeof isValidNumber;
  safeParseNumber: typeof safeParseNumber;
  roundTo: typeof roundTo;
}

export const numberUtilsSkill: NumberUtilsSkill = {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatLargeNumber,
  toScientificNotation,
  fromScientificNotation,
  toChineseUppercase,
  fromChineseUppercase,
  isValidNumber,
  safeParseNumber,
  roundTo,
};

export default numberUtilsSkill;

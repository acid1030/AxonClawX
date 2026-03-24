/**
 * 货币工具技能 - KAEL
 * 
 * 功能:
 * 1. 货币格式化 (支持多币种/多区域)
 * 2. 汇率转换 (支持自定义汇率表)
 * 3. 大写金额 (中文大写金额转换)
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ==================== 货币格式化 ====================

/**
 * 货币格式化选项
 */
export interface CurrencyFormatOptions {
  /** 货币符号 (默认: ¥) */
  symbol?: string;
  /** 货币代码 (默认: CNY) */
  code?: string;
  /** 小数位数 (默认: 2) */
  decimals?: number;
  /** 区域设置 (默认: zh-CN) */
  locale?: string;
  /** 是否显示货币代码 (默认: false) */
  showCode?: boolean;
  /** 是否显示负数括号 (默认: false) */
  negativeInParentheses?: boolean;
}

/**
 * 货币格式化
 * 
 * @param amount - 金额数字
 * @param options - 格式化选项
 * @returns 格式化后的货币字符串
 * 
 * @example
 * formatCurrency(1234567.89) // "¥1,234,567.89"
 * formatCurrency(1234567.89, { symbol: '$', locale: 'en-US' }) // "$1,234,567.89"
 * formatCurrency(-1234.56, { negativeInParentheses: true }) // "¥(1,234.56)"
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    symbol = '¥',
    code = 'CNY',
    decimals = 2,
    locale = 'zh-CN',
    showCode = false,
    negativeInParentheses = false,
  } = options;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  }).format(absAmount);

  let result = `${symbol}${formatted}`;

  if (showCode) {
    result += ` ${code}`;
  }

  if (isNegative) {
    if (negativeInParentheses) {
      result = `(${result})`;
    } else {
      result = `-${result}`;
    }
  }

  return result;
}

/**
 * 快速格式化人民币
 */
export function formatCNY(amount: number, decimals: number = 2): string {
  return formatCurrency(amount, { symbol: '¥', locale: 'zh-CN', decimals });
}

/**
 * 快速格式化美元
 */
export function formatUSD(amount: number, decimals: number = 2): string {
  return formatCurrency(amount, { symbol: '$', locale: 'en-US', decimals });
}

/**
 * 快速格式化欧元
 */
export function formatEUR(amount: number, decimals: number = 2): string {
  return formatCurrency(amount, { symbol: '€', locale: 'de-DE', decimals });
}

// ==================== 汇率转换 ====================

/**
 * 汇率表 (基础货币为 USD)
 * 实际使用时可从 API 获取实时汇率
 */
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  CNY: 7.24,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 150.25,
  HKD: 7.82,
  KRW: 1320.50,
  SGD: 1.34,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  INR: 83.12,
  RUB: 92.50,
  BRL: 4.97,
  MXN: 17.15,
  ZAR: 18.95,
  TRY: 32.15,
  SEK: 10.42,
  NOK: 10.68,
  DKK: 6.87,
  PLN: 3.95,
  THB: 35.80,
  MYR: 4.72,
  IDR: 15680.00,
  PHP: 56.25,
  VND: 24500.00,
  NZD: 1.64,
  AED: 3.67,
  SAR: 3.75,
  ILS: 3.65,
};

/**
 * 汇率转换选项
 */
export interface ExchangeOptions {
  /** 源货币代码 (默认: CNY) */
  from?: string;
  /** 目标货币代码 (默认: USD) */
  to?: string;
  /** 自定义汇率表 (可选) */
  rates?: Record<string, number>;
  /** 结果小数位数 (默认: 2) */
  decimals?: number;
  /** 是否返回详细结果 (默认: false) */
  verbose?: boolean;
}

/**
 * 汇率转换详细结果
 */
export interface ExchangeResult {
  /** 原始金额 */
  originalAmount: number;
  /** 转换后金额 */
  convertedAmount: number;
  /** 源货币代码 */
  fromCurrency: string;
  /** 目标货币代码 */
  toCurrency: string;
  /** 使用的汇率 */
  rate: number;
  /** 格式化后的结果 */
  formatted: string;
}

/**
 * 汇率转换
 * 
 * @param amount - 原始金额
 * @param options - 转换选项
 * @returns 转换后的金额或详细结果
 * 
 * @example
 * exchangeCurrency(1000, { from: 'CNY', to: 'USD' }) // 138.12
 * exchangeCurrency(1000, { from: 'CNY', to: 'USD', verbose: true }) // ExchangeResult
 * exchangeCurrency(100, { from: 'USD', to: 'EUR' }) // 92.00
 */
export function exchangeCurrency(
  amount: number,
  options: ExchangeOptions = {}
): number | ExchangeResult {
  const {
    from = 'CNY',
    to = 'USD',
    rates = EXCHANGE_RATES,
    decimals = 2,
    verbose = false,
  } = options;

  const fromRate = rates[from.toUpperCase()];
  const toRate = rates[to.toUpperCase()];

  if (fromRate === undefined) {
    throw new Error(`未知的货币代码：${from}`);
  }

  if (toRate === undefined) {
    throw new Error(`未知的货币代码：${to}`);
  }

  // 先转换为 USD，再转换为目标货币
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;
  const roundedAmount = parseFloat(convertedAmount.toFixed(decimals));

  if (!verbose) {
    return roundedAmount;
  }

  return {
    originalAmount: amount,
    convertedAmount: roundedAmount,
    fromCurrency: from.toUpperCase(),
    toCurrency: to.toUpperCase(),
    rate: toRate / fromRate,
    formatted: `${roundedAmount} ${to.toUpperCase()}`,
  };
}

/**
 * 批量汇率转换
 * 
 * @param amount - 原始金额
 * @param fromCurrency - 源货币代码
 * @param toCurrencies - 目标货币代码数组
 * @returns 转换结果对象
 * 
 * @example
 * batchExchange(1000, 'CNY', ['USD', 'EUR', 'GBP', 'JPY'])
 * // { USD: 138.12, EUR: 127.07, GBP: 109.11, JPY: 20753.46 }
 */
export function batchExchange(
  amount: number,
  fromCurrency: string,
  toCurrencies: string[]
): Record<string, number> {
  const results: Record<string, number> = {};

  for (const toCurrency of toCurrencies) {
    const converted = exchangeCurrency(amount, {
      from: fromCurrency,
      to: toCurrency,
      verbose: false,
    }) as number;
    results[toCurrency.toUpperCase()] = converted;
  }

  return results;
}

/**
 * 获取汇率
 * 
 * @param from - 源货币代码
 * @param to - 目标货币代码
 * @param rates - 自定义汇率表 (可选)
 * @returns 汇率值
 * 
 * @example
 * getExchangeRate('CNY', 'USD') // 0.138
 * getExchangeRate('USD', 'JPY') // 150.25
 */
export function getExchangeRate(
  from: string,
  to: string,
  rates: Record<string, number> = EXCHANGE_RATES
): number {
  const fromRate = rates[from.toUpperCase()];
  const toRate = rates[to.toUpperCase()];

  if (fromRate === undefined) {
    throw new Error(`未知的货币代码：${from}`);
  }

  if (toRate === undefined) {
    throw new Error(`未知的货币代码：${to}`);
  }

  return toRate / fromRate;
}

// ==================== 大写金额 ====================

/**
 * 中文大写数字映射
 */
const CHINESE_NUMBERS: string[] = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];

/**
 * 中文大写单位 (个十百千)
 */
const CHINESE_UNITS: string[] = ['', '拾', '佰', '仟'];

/**
 * 中文大写金额单位 (万、亿)
 */
const CHINESE_BIG_UNITS: string[] = ['', '万', '亿', '兆'];

/**
 * 大写金额选项
 */
export interface UppercaseAmountOptions {
  /** 是否添加"人民币"前缀 (默认: false) */
  withPrefix?: boolean;
  /** 是否添加"整"后缀 (默认: true) */
  withSuffix?: boolean;
  /** 是否显示角分 (默认: true) */
  showDecimals?: boolean;
  /** 货币符号 (默认: 人民币) */
  currency?: 'CNY' | 'USD' | 'EUR';
}

/**
 * 数字转中文大写 (0-9999)
 */
function convertFourDigits(num: number): string {
  if (num === 0) {
    return '';
  }

  let result = '';
  let zeroFlag = false;

  for (let i = 0; i < 4; i++) {
    const divisor = Math.pow(10, 3 - i);
    const digit = Math.floor(num / divisor);
    num %= divisor;

    if (digit === 0) {
      zeroFlag = true;
    } else {
      if (zeroFlag) {
        result += '零';
        zeroFlag = false;
      }
      result += CHINESE_NUMBERS[digit] + CHINESE_UNITS[3 - i];
    }
  }

  return result;
}

/**
 * 整数部分转大写
 */
function convertIntegerPart(num: number): string {
  if (num === 0) {
    return '零';
  }

  const chunks: number[] = [];
  let tempNum = num;

  while (tempNum > 0) {
    chunks.push(tempNum % 10000);
    tempNum = Math.floor(tempNum / 10000);
  }

  let result = '';
  let needZero = false;

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    const chunkStr = convertFourDigits(chunk);

    if (chunkStr) {
      if (needZero && result) {
        result = result.replace(/零$/, '') + '零';
      }
      result += chunkStr + CHINESE_BIG_UNITS[i];
      needZero = false;
    } else {
      needZero = true;
    }
  }

  // 处理末尾的零
  result = result.replace(/零+$/, '');
  result = result.replace(/零+/g, '零');

  return result || '零';
}

/**
 * 小数部分转大写 (角分)
 */
function convertDecimalPart(decimal: number): string {
  const jiao = Math.floor(decimal * 10);
  const fen = Math.round((decimal * 100) % 10);

  let result = '';

  if (jiao > 0) {
    result += CHINESE_NUMBERS[jiao] + '角';
  } else if (fen > 0 && decimal > 0) {
    result += '零';
  }

  if (fen > 0) {
    result += CHINESE_NUMBERS[fen] + '分';
  }

  return result;
}

/**
 * 金额转中文大写
 * 
 * @param amount - 金额数字
 * @param options - 转换选项
 * @returns 中文大写金额字符串
 * 
 * @example
 * amountToUppercase(1234.56) // "壹仟贰佰叁拾肆元伍角陆分"
 * amountToUppercase(10000) // "壹万元整"
 * amountToUppercase(0.50) // "伍角整"
 * amountToUppercase(1234.56, { withPrefix: true }) // "人民币壹仟贰佰叁拾肆元伍角陆分"
 */
export function amountToUppercase(
  amount: number,
  options: UppercaseAmountOptions = {}
): string {
  const {
    withPrefix = false,
    withSuffix = true,
    showDecimals = true,
    currency = 'CNY',
  } = options;

  if (amount < 0) {
    throw new Error('金额不能为负数');
  }

  // 处理精度问题
  const scaled = Math.round(amount * 100);
  const integerPart = Math.floor(scaled / 100);
  const decimalPart = scaled % 100;

  let result = '';

  // 添加前缀
  if (withPrefix) {
    const prefixMap: Record<string, string> = {
      CNY: '人民币',
      USD: '美元',
      EUR: '欧元',
    };
    result += prefixMap[currency] || '';
  }

  // 转换整数部分
  const integerStr = convertIntegerPart(integerPart);
  if (integerStr) {
    result += integerStr;

    // 添加"元"
    const currencyUnitMap: Record<string, string> = {
      CNY: '元',
      USD: '美元',
      EUR: '欧元',
    };
    result += currencyUnitMap[currency] || '元';
  } else {
    result += '零元';
  }

  // 转换小数部分
  if (showDecimals && decimalPart > 0) {
    const decimalStr = convertDecimalPart(decimalPart / 100);
    result += decimalStr;
  }

  // 添加后缀
  if (withSuffix) {
    if (decimalPart === 0 || !showDecimals) {
      result += '整';
    }
  }

  return result;
}

/**
 * 验证金额格式
 * 
 * @param amount - 待验证的金额
 * @param options - 验证选项
 * @returns 验证结果
 */
export interface ValidationOptions {
  /** 最小值 (可选) */
  min?: number;
  /** 最大值 (可选) */
  max?: number;
  /** 是否允许小数 (默认: true) */
  allowDecimals?: boolean;
  /** 是否允许负数 (默认: false) */
  allowNegative?: boolean;
}

export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息 (如果无效) */
  error?: string;
  /** 标准化后的金额 */
  normalized?: number;
}

/**
 * 验证金额
 * 
 * @param amount - 待验证的金额
 * @param options - 验证选项
 * @returns 验证结果
 * 
 * @example
 * validateAmount(100.50) // { valid: true, normalized: 100.5 }
 * validateAmount(-100, { allowNegative: true }) // { valid: true, normalized: -100 }
 * validateAmount(1000001, { max: 1000000 }) // { valid: false, error: "金额超出最大值" }
 */
export function validateAmount(
  amount: unknown,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    min,
    max,
    allowDecimals = true,
    allowNegative = false,
  } = options;

  // 类型检查
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: '金额必须是有效的数字' };
  }

  // 负数检查
  if (!allowNegative && amount < 0) {
    return { valid: false, error: '金额不能为负数' };
  }

  // 小数检查
  if (!allowDecimals && !Number.isInteger(amount)) {
    return { valid: false, error: '金额不能包含小数' };
  }

  // 范围检查
  if (min !== undefined && amount < min) {
    return { valid: false, error: `金额不能小于 ${min}` };
  }

  if (max !== undefined && amount > max) {
    return { valid: false, error: `金额不能大于 ${max}` };
  }

  // 精度处理 (保留 2 位小数)
  const normalized = allowDecimals
    ? parseFloat(amount.toFixed(2))
    : Math.round(amount);

  return { valid: true, normalized };
}

// ==================== 导出 ====================

export default {
  // 货币格式化
  formatCurrency,
  formatCNY,
  formatUSD,
  formatEUR,

  // 汇率转换
  exchangeCurrency,
  batchExchange,
  getExchangeRate,
  EXCHANGE_RATES,

  // 大写金额
  amountToUppercase,

  // 验证
  validateAmount,
};

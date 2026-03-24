/**
 * 手机号验证格式化工具技能
 * 
 * 功能:
 * 1. 手机号验证 (支持中国大陆、台湾、香港、澳门及国际号码)
 * 2. 归属地查询 (基于号段识别)
 * 3. 格式化输出 (多种格式支持)
 * 
 * @module skills/phone-utils
 */

// ==================== 常量定义 ====================

/**
 * 中国大陆手机号正则
 * 支持 13x, 14x, 15x, 16x, 17x, 18x, 19x 号段
 */
const CN_MOBILE_REGEX = /^1[3-9]\d{9}$/;

/**
 * 台湾手机号正则
 * 支持 09xx 格式
 */
const TW_MOBILE_REGEX = /^09\d{8}$/;

/**
 * 香港手机号正则
 * 支持 5x, 6x, 7x, 9x 开头
 */
const HK_MOBILE_REGEX = /^[5-79]\d{7}$/;

/**
 * 澳门手机号正则
 * 支持 6x 开头
 */
const MO_MOBILE_REGEX = /^6\d{7}$/;

/**
 * 国际手机号正则 (宽松模式)
 */
const INTL_MOBILE_REGEX = /^\+?[1-9]\d{6,14}$/;

/**
 * 中国大陆号段归属地数据
 * 格式：号段前 7 位 -> 归属地
 */
const CN_PHONE_AREAS: Record<string, string> = {
  // 中国移动
  '1340': '北京', '1341': '北京', '1342': '北京', '1343': '广东', '1344': '广东',
  '1345': '浙江', '1346': '浙江', '1347': '四川', '1348': '四川', '1349': '上海',
  '1350': '北京', '1351': '北京', '1352': '广东', '1353': '广东', '1354': '辽宁',
  '1355': '福建', '1356': '安徽', '1357': '云南', '1358': '贵州', '1359': '河南',
  '1360': '北京', '1361': '北京', '1362': '广东', '1363': '广东', '1364': '上海',
  '1365': '浙江', '1366': '浙江', '1367': '江苏', '1368': '江苏', '1369': '山东',
  '1370': '北京', '1371': '广东', '1372': '广东', '1373': '河北', '1374': '内蒙古',
  '1375': '广东', '1376': '广东', '1377': '河南', '1378': '河南', '1379': '浙江',
  '1380': '北京', '1381': '上海', '1382': '天津', '1383': '河北', '1384': '辽宁',
  '1385': '江苏', '1386': '浙江', '1387': '江西', '1388': '贵州', '1389': '陕西',
  '1390': '北京', '1391': '江苏', '1392': '广东', '1393': '河北', '1394': '辽宁',
  '1395': '福建', '1396': '安徽', '1397': '河南', '1398': '四川', '1399': '陕西',
  '1470': '北京', '1471': '内蒙古', '1472': '辽宁', '1473': '内蒙古', '1474': '内蒙古',
  '1475': '广东', '1476': '广东', '1477': '内蒙古', '1478': '内蒙古', '1479': '山西',
  '1500': '北京', '1501': '广东', '1502': '北京', '1503': '河北', '1504': '辽宁',
  '1505': '浙江', '1506': '福建', '1507': '内蒙古', '1508': '河北', '1509': '河北',
  '1510': '北京', '1511': '北京', '1512': '江苏', '1513': '河北', '1514': '内蒙古',
  '1515': '江苏', '1516': '江苏', '1517': '河南', '1518': '江苏', '1519': '河北',
  '1520': '北京', '1521': '北京', '1522': '河北', '1523': '河北', '1524': '辽宁',
  '1525': '山东', '1526': '山东', '1527': '广东', '1528': '四川', '1529': '河北',
  '1570': '北京', '1571': '北京', '1572': '北京', '1573': '河北', '1574': '浙江',
  '1575': '浙江', '1576': '浙江', '1577': '浙江', '1578': '浙江', '1579': '浙江',
  '1580': '北京', '1581': '广东', '1582': '河北', '1583': '河北', '1584': '辽宁',
  '1585': '浙江', '1586': '山东', '1587': '江西', '1588': '河南', '1589': '河南',
  '1590': '北京', '1591': '广东', '1592': '福建', '1593': '河北', '1594': '辽宁',
  '1595': '江西', '1596': '江西', '1597': '江西', '1598': '河南', '1599': '河南',
  // 中国联通
  '1300': '北京', '1301': '北京', '1302': '北京', '1303': '北京', '1304': '北京',
  '1305': '河北', '1306': '广东', '1307': '广东', '1308': '广东', '1309': '广东',
  '1310': '北京', '1311': '北京', '1312': '北京', '1313': '河北', '1314': '河北',
  '1315': '浙江', '1316': '浙江', '1317': '浙江', '1318': '河北', '1319': '湖北',
  '1320': '北京', '1321': '北京', '1322': '天津', '1323': '河北', '1324': '北京',
  '1325': '浙江', '1326': '广东', '1327': '广东', '1328': '广东', '1329': '广东',
  '1550': '北京', '1551': '河北', '1552': '内蒙古', '1553': '河北', '1554': '辽宁',
  '1555': '山东', '1556': '安徽', '1557': '湖北', '1558': '安徽', '1559': '陕西',
  '1560': '北京', '1561': '北京', '1562': '广东', '1563': '安徽', '1564': '辽宁',
  '1565': '浙江', '1566': '广东', '1567': '广东', '1568': '河北', '1569': '北京',
  '1660': '北京', '1661': '北京', '1662': '广东', '1663': '河北', '1664': '辽宁',
  '1665': '山东', '1666': '广东', '1667': '广东', '1668': '广东', '1669': '广东',
  // 中国电信
  '1330': '北京', '1331': '北京', '1332': '北京', '1333': '北京', '1334': '北京',
  '1335': '北京', '1336': '北京', '1337': '北京', '1338': '北京', '1339': '北京',
  '1530': '北京', '1531': '北京', '1532': '山东', '1533': '河北', '1534': '辽宁',
  '1535': '甘肃', '1536': '四川', '1537': '河南', '1538': '四川', '1539': '四川',
  '1730': '北京', '1731': '湖南', '1732': '内蒙古', '1733': '河北', '1734': '辽宁',
  '1735': '北京', '1736': '广东', '1737': '江西', '1738': '四川', '1739': '河南',
  '1770': '北京', '1771': '广西', '1772': '广西', '1773': '广西', '1774': '广西',
  '1775': '广东', '1776': '广东', '1777': '新疆', '1778': '四川', '1779': '江西',
  '1800': '北京', '1801': '北京', '1802': '北京', '1803': '河北', '1804': '辽宁',
  '1805': '江苏', '1806': '福建', '1807': '江西', '1808': '四川', '1809': '甘肃',
  '1810': '北京', '1811': '河北', '1812': '辽宁', '1813': '四川', '1814': '辽宁',
  '1815': '北京', '1816': '湖南', '1817': '湖南', '1818': '四川', '1819': '海南',
  '1890': '北京', '1891': '陕西', '1892': '江苏', '1893': '甘肃', '1894': '辽宁',
  '1895': '江西', '1896': '浙江', '1897': '湖南', '1898': '广东', '1899': '新疆',
  // 虚拟运营商
  '1700': '虚拟', '1701': '虚拟', '1702': '虚拟', '1703': '虚拟', '1704': '虚拟',
  '1705': '虚拟', '1706': '虚拟', '1707': '虚拟', '1708': '虚拟', '1709': '虚拟',
  '1620': '虚拟', '1621': '虚拟', '1622': '虚拟', '1623': '虚拟', '1624': '虚拟',
  '1625': '虚拟', '1626': '虚拟', '1627': '虚拟', '1628': '虚拟', '1629': '虚拟',
  // 5G 号段
  '1900': '北京', '1901': '北京', '1902': '北京', '1903': '北京', '1904': '北京',
  '1905': '北京', '1906': '北京', '1907': '北京', '1908': '北京', '1909': '北京',
  '1910': '北京', '1911': '北京', '1912': '北京', '1913': '北京', '1914': '北京',
  '1915': '北京', '1916': '北京', '1917': '北京', '1918': '北京', '1919': '北京',
  '1920': '北京', '1921': '北京', '1922': '北京', '1923': '北京', '1924': '北京',
  '1925': '北京', '1926': '北京', '1927': '北京', '1928': '北京', '1929': '北京',
  '1930': '北京', '1931': '湖南', '1932': '吉林', '1933': '湖南', '1934': '山西',
  '1935': '湖南', '1936': '重庆', '1937': '湖南', '1938': '湖南', '1939': '湖南',
  '1950': '北京', '1951': '北京', '1952': '北京', '1953': '北京', '1954': '北京',
  '1955': '北京', '1956': '北京', '1957': '北京', '1958': '北京', '1959': '北京',
  '1960': '北京', '1961': '北京', '1962': '北京', '1963': '北京', '1964': '北京',
  '1965': '北京', '1966': '北京', '1967': '北京', '1968': '北京', '1969': '北京',
  '1970': '北京', '1971': '内蒙古', '1972': '内蒙古', '1973': '山西', '1974': '浙江',
  '1975': '广东', '1976': '广东', '1977': '北京', '1978': '北京', '1979': '北京',
  '1980': '北京', '1981': '北京', '1982': '北京', '1983': '北京', '1984': '北京',
  '1985': '北京', '1986': '北京', '1987': '北京', '1988': '北京', '1989': '海南',
};

/**
 * 运营商映射表
 */
const CARRIER_MAP: Record<string, string> = {
  '134': '中国移动', '135': '中国移动', '136': '中国移动', '137': '中国移动',
  '138': '中国移动', '139': '中国移动', '147': '中国移动', '150': '中国移动',
  '151': '中国移动', '152': '中国移动', '157': '中国移动', '158': '中国移动',
  '159': '中国移动', '178': '中国移动', '182': '中国移动', '183': '中国移动',
  '184': '中国移动', '187': '中国移动', '188': '中国移动', '198': '中国移动',
  '130': '中国联通', '131': '中国联通', '132': '中国联通', '155': '中国联通',
  '156': '中国联通', '166': '中国联通', '171': '中国联通', '175': '中国联通',
  '176': '中国联通', '185': '中国联通', '186': '中国联通',
  '133': '中国电信', '153': '中国电信', '173': '中国电信', '177': '中国电信',
  '180': '中国电信', '181': '中国电信', '189': '中国电信', '199': '中国电信',
  '170': '虚拟运营商', '162': '虚拟运营商', '165': '虚拟运营商', '167': '虚拟运营商',
  '190': '中国电信', '191': '中国电信', '192': '中国广电', '193': '中国电信',
  '195': '中国移动', '196': '中国联通', '197': '中国移动',
};

// ==================== 类型定义 ====================

/**
 * 手机号验证结果
 */
export interface PhoneValidationResult {
  /** 是否有效 */
  isValid: boolean;
  /** 手机号类型 */
  type?: 'mobile' | 'landline' | 'tollfree' | 'premium' | 'unknown';
  /** 地区代码 */
  region?: 'CN' | 'TW' | 'HK' | 'MO' | 'INTL';
  /** 错误信息 */
  error?: string;
}

/**
 * 手机号归属地信息
 */
export interface PhoneLocationInfo {
  /** 省份 */
  province?: string;
  /** 城市 */
  city?: string;
  /** 运营商 */
  carrier?: string;
  /** 号段 */
  prefix?: string;
  /** 未知 */
  unknown?: boolean;
}

/**
 * 格式化选项
 */
export interface FormatOptions {
  /** 分隔符，默认 ' ' */
  separator?: string;
  /** 格式模板，如 'XXX-XXXX-XXXX' */
  template?: string;
  /** 是否带国家代码 */
  withCountryCode?: boolean;
  /** 国家代码，默认 '+86' */
  countryCode?: string;
}

// ==================== 手机号验证 ====================

/**
 * 清理手机号 (移除空格、横线、括号等)
 * @param phone - 原始手机号
 * @returns 清理后的手机号
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]+/g, '');
}

/**
 * 验证中国大陆手机号
 * @param phone - 手机号 (可带国家代码)
 * @returns 验证结果
 */
export function validateCNMobile(phone: string): PhoneValidationResult {
  const cleaned = cleanPhone(phone);
  
  // 移除国家代码
  const number = cleaned.startsWith('+86') ? cleaned.slice(3) : 
                 cleaned.startsWith('86') ? cleaned.slice(2) : 
                 cleaned.startsWith('0086') ? cleaned.slice(4) : cleaned;
  
  if (!CN_MOBILE_REGEX.test(number)) {
    return {
      isValid: false,
      region: 'CN',
      type: 'mobile',
      error: '不符合中国大陆手机号格式 (11 位，1 开头)'
    };
  }
  
  return {
    isValid: true,
    region: 'CN',
    type: 'mobile'
  };
}

/**
 * 验证台湾手机号
 * @param phone - 手机号
 * @returns 验证结果
 */
export function validateTWMobile(phone: string): PhoneValidationResult {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+886') ? cleaned.slice(4) :
                 cleaned.startsWith('886') ? cleaned.slice(3) :
                 cleaned.startsWith('00886') ? cleaned.slice(5) : cleaned;
  
  // 转换 9 开头为 09 开头
  const normalized = number.startsWith('9') ? '0' + number : number;
  
  if (!TW_MOBILE_REGEX.test(normalized)) {
    return {
      isValid: false,
      region: 'TW',
      type: 'mobile',
      error: '不符合台湾手机号格式 (09 开头，10 位)'
    };
  }
  
  return {
    isValid: true,
    region: 'TW',
    type: 'mobile'
  };
}

/**
 * 验证香港手机号
 * @param phone - 手机号
 * @returns 验证结果
 */
export function validateHKMobile(phone: string): PhoneValidationResult {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+852') ? cleaned.slice(4) :
                 cleaned.startsWith('852') ? cleaned.slice(3) :
                 cleaned.startsWith('00852') ? cleaned.slice(5) : cleaned;
  
  if (!HK_MOBILE_REGEX.test(number)) {
    return {
      isValid: false,
      region: 'HK',
      type: 'mobile',
      error: '不符合香港手机号格式 (8 位，5/6/7/9 开头)'
    };
  }
  
  return {
    isValid: true,
    region: 'HK',
    type: 'mobile'
  };
}

/**
 * 验证澳门手机号
 * @param phone - 手机号
 * @returns 验证结果
 */
export function validateMOMobile(phone: string): PhoneValidationResult {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+853') ? cleaned.slice(4) :
                 cleaned.startsWith('853') ? cleaned.slice(3) :
                 cleaned.startsWith('00853') ? cleaned.slice(5) : cleaned;
  
  if (!MO_MOBILE_REGEX.test(number)) {
    return {
      isValid: false,
      region: 'MO',
      type: 'mobile',
      error: '不符合澳门手机号格式 (8 位，6 开头)'
    };
  }
  
  return {
    isValid: true,
    region: 'MO',
    type: 'mobile'
  };
}

/**
 * 验证国际手机号
 * @param phone - 手机号
 * @returns 验证结果
 */
export function validateIntlMobile(phone: string): PhoneValidationResult {
  const cleaned = cleanPhone(phone);
  
  if (!INTL_MOBILE_REGEX.test(cleaned)) {
    return {
      isValid: false,
      region: 'INTL',
      type: 'mobile',
      error: '不符合国际手机号格式'
    };
  }
  
  return {
    isValid: true,
    region: 'INTL',
    type: 'mobile'
  };
}

/**
 * 综合验证手机号 (自动识别地区)
 * @param phone - 手机号
 * @returns 验证结果
 */
export function validatePhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: '输入不能为空'
    };
  }
  
  const cleaned = cleanPhone(phone);
  
  // 尝试各地区验证
  const validators = [
    validateCNMobile,
    validateTWMobile,
    validateHKMobile,
    validateMOMobile,
    validateIntlMobile
  ];
  
  for (const validator of validators) {
    const result = validator(phone);
    if (result.isValid) {
      return result;
    }
  }
  
  return {
    isValid: false,
    type: 'unknown',
    error: '无法识别的手机号格式'
  };
}

// ==================== 归属地查询 ====================

/**
 * 查询中国大陆手机号归属地
 * @param phone - 手机号
 * @returns 归属地信息
 */
export function queryPhoneLocation(phone: string): PhoneLocationInfo {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+86') ? cleaned.slice(3) :
                 cleaned.startsWith('86') ? cleaned.slice(2) :
                 cleaned.startsWith('0086') ? cleaned.slice(4) : cleaned;
  
  // 验证是否为中国手机号
  if (!CN_MOBILE_REGEX.test(number)) {
    return { unknown: true };
  }
  
  // 提取前 7 位 (前 4 位号段 + 前 3 位地区编码)
  const prefix7 = number.slice(0, 7);
  const prefix4 = number.slice(0, 4);
  const prefix3 = number.slice(0, 3);
  
  // 查询归属地
  let location = CN_PHONE_AREAS[prefix7] || CN_PHONE_AREAS[prefix4];
  
  // 提取运营商
  const carrierPrefix = number.slice(0, 3);
  const carrier = CARRIER_MAP[carrierPrefix] || '未知运营商';
  
  if (!location) {
    return {
      province: '未知',
      city: '未知',
      carrier: carrier,
      prefix: prefix3,
      unknown: false
    };
  }
  
  // 解析省份和城市
  if (location === '虚拟') {
    return {
      province: '未知',
      city: '未知',
      carrier: '虚拟运营商',
      prefix: prefix3,
      unknown: false
    };
  }
  
  return {
    province: location,
    city: location,
    carrier: carrier,
    prefix: prefix3,
    unknown: false
  };
}

/**
 * 获取运营商信息
 * @param phone - 手机号
 * @returns 运营商名称
 */
export function getCarrier(phone: string): string {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+') ? cleaned.replace(/^\+?86/, '') : cleaned;
  
  if (!CN_MOBILE_REGEX.test(number)) {
    return '未知运营商';
  }
  
  const prefix3 = number.slice(0, 3);
  return CARRIER_MAP[prefix3] || '未知运营商';
}

// ==================== 格式化输出 ====================

/**
 * 格式化中国大陆手机号
 * @param phone - 手机号
 * @param options - 格式化选项
 * @returns 格式化后的手机号
 */
export function formatPhone(phone: string, options: FormatOptions = {}): string {
  const {
    separator = ' ',
    template,
    withCountryCode = false,
    countryCode = '+86'
  } = options;
  
  const cleaned = cleanPhone(phone);
  let number = cleaned.startsWith('+86') ? cleaned.slice(3) :
               cleaned.startsWith('86') ? cleaned.slice(2) :
               cleaned.startsWith('0086') ? cleaned.slice(4) : cleaned;
  
  // 如果不是 11 位，尝试直接使用
  if (number.length !== 11 && CN_MOBILE_REGEX.test(number)) {
    // 已经是合法格式
  } else if (number.length !== 11) {
    // 非标准长度，直接返回
    return withCountryCode ? `${countryCode}${number}` : number;
  }
  
  // 应用模板
  if (template) {
    const digits = number.split('');
    let result = template;
    let digitIndex = 0;
    
    for (let i = 0; i < result.length && digitIndex < digits.length; i++) {
      if (result[i] === 'X' || result[i] === 'x') {
        result = result.substring(0, i) + digits[digitIndex] + result.substring(i + 1);
        digitIndex++;
      }
    }
    
    return withCountryCode ? `${countryCode}${separator}${result}` : result;
  }
  
  // 默认格式：XXX XXXX XXXX
  const formatted = `${number.slice(0, 3)}${separator}${number.slice(3, 7)}${separator}${number.slice(7)}`;
  
  return withCountryCode ? `${countryCode}${separator}${formatted}` : formatted;
}

/**
 * 批量格式化手机号
 * @param phones - 手机号数组
 * @param options - 格式化选项
 * @returns 格式化后的手机号数组
 */
export function formatPhones(phones: string[], options: FormatOptions = {}): string[] {
  return phones.map(phone => formatPhone(phone, options));
}

/**
 * 标准化手机号 (移除所有分隔符，保留国家代码)
 * @param phone - 手机号
 * @returns 标准化手机号
 */
export function normalizePhone(phone: string): string {
  const cleaned = cleanPhone(phone);
  
  // 保留 + 号
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\D/g, '');
  }
  
  return cleaned.replace(/\D/g, '');
}

/**
 * 脱敏手机号
 * @param phone - 手机号
 * @param maskChar - 掩码字符，默认 '*'
 * @param showLast - 显示最后几位，默认 4
 * @returns 脱敏后的手机号
 */
export function maskPhone(phone: string, maskChar = '*', showLast = 4): string {
  const cleaned = cleanPhone(phone);
  const hasCountryCode = cleaned.startsWith('+');
  
  let number = cleaned.replace(/\D/g, '');
  if (number.startsWith('86') && number.length > 11) {
    number = number.slice(2);
  }
  
  if (number.length <= showLast) {
    return number;
  }
  
  const maskedLength = number.length - showLast;
  const masked = maskChar.repeat(maskedLength) + number.slice(-showLast);
  
  return hasCountryCode ? `+86${masked}` : masked;
}

// ==================== 工具函数 ====================

/**
 * 提取手机号中的所有数字
 * @param phone - 手机号
 * @returns 数字字符串
 */
export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * 判断是否为虚拟运营商号段
 * @param phone - 手机号
 * @returns 是否为虚拟运营商
 */
export function isVirtualCarrier(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+86') ? cleaned.slice(3) :
                 cleaned.startsWith('86') ? cleaned.slice(2) : cleaned;
  
  if (!CN_MOBILE_REGEX.test(number)) {
    return false;
  }
  
  const prefix3 = number.slice(0, 3);
  const carrier = CARRIER_MAP[prefix3];
  
  return carrier === '虚拟运营商';
}

/**
 * 获取号段信息
 * @param phone - 手机号
 * @returns 号段信息
 */
export function getPrefixInfo(phone: string): { prefix: string; carrier: string } | null {
  const cleaned = cleanPhone(phone);
  const number = cleaned.startsWith('+86') ? cleaned.slice(3) :
                 cleaned.startsWith('86') ? cleaned.slice(2) : cleaned;
  
  if (!CN_MOBILE_REGEX.test(number)) {
    return null;
  }
  
  const prefix3 = number.slice(0, 3);
  const carrier = CARRIER_MAP[prefix3] || '未知';
  
  return { prefix: prefix3, carrier };
}

// ==================== 导出 ====================

export default {
  // 验证
  validatePhone,
  validateCNMobile,
  validateTWMobile,
  validateHKMobile,
  validateMOMobile,
  validateIntlMobile,
  
  // 归属地
  queryPhoneLocation,
  getCarrier,
  
  // 格式化
  formatPhone,
  formatPhones,
  normalizePhone,
  maskPhone,
  cleanPhone,
  
  // 工具
  extractDigits,
  isVirtualCarrier,
  getPrefixInfo,
  
  // 常量
  CN_MOBILE_REGEX,
  TW_MOBILE_REGEX,
  HK_MOBILE_REGEX,
  MO_MOBILE_REGEX,
  INTL_MOBILE_REGEX,
};

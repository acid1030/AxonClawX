/**
 * 身份证验证解析工具
 * 
 * 功能:
 * 1. 身份证号验证
 * 2. 信息提取 (生日/性别/地区)
 * 3. 校验码计算
 */

// 地区码表 (部分示例，实际应包含所有地区码)
const AREA_CODES: Record<string, string> = {
  '110000': '北京市',
  '120000': '天津市',
  '130000': '河北省',
  '140000': '山西省',
  '150000': '内蒙古自治区',
  '210000': '辽宁省',
  '220000': '吉林省',
  '230000': '黑龙江省',
  '310000': '上海市',
  '320000': '江苏省',
  '330000': '浙江省',
  '340000': '安徽省',
  '350000': '福建省',
  '360000': '江西省',
  '370000': '山东省',
  '410000': '河南省',
  '420000': '湖北省',
  '430000': '湖南省',
  '440000': '广东省',
  '450000': '广西壮族自治区',
  '460000': '海南省',
  '500000': '重庆市',
  '510000': '四川省',
  '520000': '贵州省',
  '530000': '云南省',
  '540000': '西藏自治区',
  '610000': '陕西省',
  '620000': '甘肃省',
  '630000': '青海省',
  '640000': '宁夏回族自治区',
  '650000': '新疆维吾尔自治区',
};

// 校验码权重
const WEIGHT_FACTORS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

export interface IDCardInfo {
  isValid: boolean;
  areaCode?: string;
  areaName?: string;
  birthday?: string;
  gender?: '男' | '女';
  age?: number;
  checkDigit?: string;
  error?: string;
}

/**
 * 验证身份证号格式
 */
export function validateIDCard(idCard: string): boolean {
  // 基本格式验证 (15 位或 18 位)
  if (!/^\d{15}(\d{2}[0-9Xx])?$/.test(idCard)) {
    return false;
  }

  // 如果是 18 位，验证校验码
  if (idCard.length === 18) {
    return calculateCheckDigit(idCard.slice(0, 17)) === idCard[17].toUpperCase();
  }

  return true;
}

/**
 * 计算校验码
 */
export function calculateCheckDigit(body: string): string {
  if (body.length !== 17 || !/^\d+$/.test(body)) {
    throw new Error('身份证前 17 位必须是数字');
  }

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(body[i]) * WEIGHT_FACTORS[i];
  }

  const mod = sum % 11;
  return CHECK_CODES[mod];
}

/**
 * 提取身份证信息
 */
export function extractIDCardInfo(idCard: string): IDCardInfo {
  const result: IDCardInfo = { isValid: false };

  // 清理输入
  idCard = idCard.trim().toUpperCase();

  // 验证
  if (!validateIDCard(idCard)) {
    result.error = '身份证号格式错误或校验码不正确';
    return result;
  }

  result.isValid = true;

  // 处理 15 位身份证 (转换为 18 位)
  if (idCard.length === 15) {
    idCard = convert15To18(idCard);
  }

  // 提取地区码
  const areaCode = idCard.slice(0, 6);
  result.areaCode = areaCode;
  result.areaName = AREA_CODES[areaCode] || '未知地区';

  // 提取生日
  const birthday = idCard.slice(6, 14);
  result.birthday = `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6, 8)}`;

  // 提取性别
  const genderCode = parseInt(idCard.slice(14, 17));
  result.gender = genderCode % 2 === 0 ? '女' : '男';

  // 计算年龄
  const birthYear = parseInt(birthday.slice(0, 4));
  const currentYear = new Date().getFullYear();
  result.age = currentYear - birthYear;

  // 校验码
  result.checkDigit = idCard[17];

  return result;
}

/**
 * 将 15 位身份证号转换为 18 位
 */
export function convert15To18(idCard15: string): string {
  if (idCard15.length !== 15) {
    throw new Error('必须是 15 位身份证号');
  }

  // 在年份前加 19
  const body = idCard15.slice(0, 6) + '19' + idCard15.slice(6, 11);
  const checkDigit = calculateCheckDigit(body);
  
  return body + checkDigit;
}

/**
 * 生成完整的 18 位身份证号 (用于测试)
 */
export function generateIDCard(areaCode: string, birthday: string, gender: '男' | '女'): string {
  if (!/^\d{6}$/.test(areaCode)) {
    throw new Error('地区码必须是 6 位数字');
  }

  if (!/^\d{8}$/.test(birthday)) {
    throw new Error('生日必须是 8 位数字 (YYYYMMDD)');
  }

  // 生成顺序码 (第 15-17 位)
  let sequenceCode = Math.floor(Math.random() * 900) + 100;
  if (gender === '女') {
    sequenceCode = sequenceCode % 2 === 0 ? sequenceCode : sequenceCode + 1;
  } else {
    sequenceCode = sequenceCode % 2 === 0 ? sequenceCode + 1 : sequenceCode;
  }

  const sequenceStr = sequenceCode.toString().padStart(3, '0');
  const body = areaCode + birthday + sequenceStr;
  const checkDigit = calculateCheckDigit(body);

  return body + checkDigit;
}

// ============ 使用示例 ============

/**
 * 使用示例 1: 验证身份证号
 */
export function example1_validate() {
  const idCard = '11010519491231002X';
  const isValid = validateIDCard(idCard);
  console.log(`身份证号 ${idCard} 是否有效：${isValid}`);
}

/**
 * 使用示例 2: 提取身份证信息
 */
export function example2_extract() {
  const idCard = '11010519491231002X';
  const info = extractIDCardInfo(idCard);
  
  if (info.isValid) {
    console.log('=== 身份证信息 ===');
    console.log(`地区：${info.areaName} (${info.areaCode})`);
    console.log(`生日：${info.birthday}`);
    console.log(`性别：${info.gender}`);
    console.log(`年龄：${info.age}岁`);
    console.log(`校验码：${info.checkDigit}`);
  } else {
    console.log(`验证失败：${info.error}`);
  }
}

/**
 * 使用示例 3: 计算校验码
 */
export function example3_checkDigit() {
  const body = '11010519491231002';
  const checkDigit = calculateCheckDigit(body);
  console.log(`前 17 位：${body}`);
  console.log(`校验码：${checkDigit}`);
  console.log(`完整身份证号：${body}${checkDigit}`);
}

/**
 * 使用示例 4: 15 位转 18 位
 */
export function example4_convert() {
  const idCard15 = '110105491231002';
  const idCard18 = convert15To18(idCard15);
  console.log(`15 位：${idCard15}`);
  console.log(`18 位：${idCard18}`);
}

/**
 * 使用示例 5: 生成测试身份证号
 */
export function example5_generate() {
  const idCard = generateIDCard('110105', '19900101', '男');
  console.log(`生成的身份证号：${idCard}`);
  
  // 验证生成的身份证号
  const info = extractIDCardInfo(idCard);
  if (info.isValid) {
    console.log(`验证通过 - 性别：${info.gender}, 生日：${info.birthday}`);
  }
}

// 导出技能类
export class IDCardUtilsSkill {
  /**
   * 验证身份证号
   */
  static validate(idCard: string): boolean {
    return validateIDCard(idCard);
  }

  /**
   * 提取身份证信息
   */
  static extract(idCard: string): IDCardInfo {
    return extractIDCardInfo(idCard);
  }

  /**
   * 计算校验码
   */
  static calculateCheckDigit(body: string): string {
    return calculateCheckDigit(body);
  }

  /**
   * 15 位转 18 位
   */
  static convert15To18(idCard15: string): string {
    return convert15To18(idCard15);
  }

  /**
   * 生成测试身份证号
   */
  static generate(areaCode: string, birthday: string, gender: '男' | '女'): string {
    return generateIDCard(areaCode, birthday, gender);
  }
}

// 默认导出
export default IDCardUtilsSkill;

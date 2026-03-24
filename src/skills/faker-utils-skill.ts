/**
 * Faker 数据生成工具技能 - Faker Utils Skill
 * 
 * 功能:
 * 1. 人名/地址生成
 * 2. 公司/产品数据
 * 3. 时间/金融数据
 * 
 * @author Axon (NOVA)
 * @version 1.0.0
 * @module skills/faker-utils
 */

import * as crypto from 'crypto';

// ============== 类型定义 ==============

/** 性别类型 */
export type Gender = 'male' | 'female' | 'neutral';

/** 地址组成部分 */
export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  full: string;
}

/** 个人信息 */
export interface Person {
  firstName: string;
  lastName: string;
  fullName: string;
  gender: Gender;
  email: string;
  phone: string;
  address: Address;
  birthDate: Date;
  age: number;
}

/** 公司信息 */
export interface Company {
  name: string;
  industry: string;
  catchPhrase: string;
  bs: string;
  email: string;
  website: string;
  phone: string;
  address: Address;
  employeeCount: number;
  foundedYear: number;
}

/** 产品信息 */
export interface Product {
  name: string;
  category: string;
  price: number;
  sku: string;
  description: string;
  stock: number;
  rating: number;
}

/** 金融交易 */
export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  date: Date;
  description: string;
  accountNumber: string;
}

/** 信用卡信息 */
export interface CreditCard {
  type: string;
  number: string;
  cvv: string;
  expiryDate: string;
  holderName: string;
}

// ============== 数据源 ==============

/** 中文姓氏 */
const CHINESE_SURNAMES = [
  '李', '王', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
  '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗',
  '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
  '彭', '曾', '萧', '田', '董', '袁', '潘', '于', '蒋', '蔡',
  '余', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈'
];

/** 中文男性名字 */
const CHINESE_MALE_NAMES = [
  '伟', '强', '磊', '洋', '勇', '军', '杰', '俊', '涛', '明',
  '超', '亮', '鹏', '辉', '健', '斌', '飞', '波', '刚', '平',
  '东', '峰', '毅', '航', '鑫', '博', '宇', '浩', '然', '泽'
];

/** 中文女性名字 */
const CHINESE_FEMALE_NAMES = [
  '芳', '娜', '敏', '静', '丽', '秀英', '美', '艳', '霞', '玲',
  '燕', '萍', '雪', '慧', '芬', '婷', '婕', '欣', '颖', '倩',
  '瑶', '怡', '悦', '晴', '雨', '琪', '琳', '璐', '晶', '红'
];

/** 英文名 - 男性 */
const ENGLISH_MALE_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Donald',
  'Mark', 'Paul', 'Steven', 'Andrew', 'Kenneth', 'Joshua', 'Kevin', 'Brian',
  'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob'
];

/** 英文名 - 女性 */
const ENGLISH_FEMALE_NAMES = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan',
  'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra',
  'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol',
  'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura'
];

/** 英文姓氏 */
const ENGLISH_SURNAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
];

/** 城市列表 */
const CITIES = [
  { city: '北京', state: '北京', country: '中国' },
  { city: '上海', state: '上海', country: '中国' },
  { city: '广州', state: '广东', country: '中国' },
  { city: '深圳', state: '广东', country: '中国' },
  { city: '成都', state: '四川', country: '中国' },
  { city: '杭州', state: '浙江', country: '中国' },
  { city: '武汉', state: '湖北', country: '中国' },
  { city: '西安', state: '陕西', country: '中国' },
  { city: '南京', state: '江苏', country: '中国' },
  { city: '重庆', state: '重庆', country: '中国' },
  { city: 'New York', state: 'NY', country: 'USA' },
  { city: 'Los Angeles', state: 'CA', country: 'USA' },
  { city: 'Chicago', state: 'IL', country: 'USA' },
  { city: 'Houston', state: 'TX', country: 'USA' },
  { city: 'Phoenix', state: 'AZ', country: 'USA' },
  { city: 'London', state: 'England', country: 'UK' },
  { city: 'Manchester', state: 'England', country: 'UK' },
  { city: 'Tokyo', state: 'Tokyo', country: 'Japan' },
  { city: 'Osaka', state: 'Osaka', country: 'Japan' },
  { city: 'Singapore', state: 'Singapore', country: 'Singapore' }
];

/** 街道名称 */
const STREET_NAMES = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Park Rd', 'Lake View',
  'Hill Side', 'River Rd', 'Sunset Blvd', 'Washington St', 'Broadway',
  'Market St', 'Spring St', 'Center St', 'School St', 'Union St',
  '和平路', '人民路', '中山路', '建设路', '解放路', '新华路', '胜利路', '光明路'
];

/** 行业列表 */
const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Retail',
  'Manufacturing', 'Entertainment', 'Telecommunications', 'Energy',
  'Transportation', 'Real Estate', 'Consulting', 'Media', 'Food & Beverage',
  'Automotive', 'Aerospace', 'Biotechnology', 'E-commerce', 'Gaming',
  '人工智能', '金融科技', '电子商务', '医疗健康', '教育培训'
];

/** 公司后缀 */
const COMPANY_SUFFIXES = [
  'Inc', 'LLC', 'Corp', 'Ltd', 'Group', 'Solutions', 'Technologies',
  'Systems', 'Services', 'Partners', 'Industries', 'Enterprises',
  '公司', '集团', '科技', '有限公司', '股份有限公司'
];

/** 产品类别 */
const PRODUCT_CATEGORIES = [
  'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports',
  'Toys', 'Food', 'Beauty', 'Automotive', 'Health',
  '电子产品', '服装', '图书', '家居', '运动', '食品', '美妆'
];

/** 产品形容词 */
const PRODUCT_ADJECTIVES = [
  'Premium', 'Professional', 'Ultra', 'Smart', 'Wireless', 'Portable',
  'Advanced', 'Classic', 'Modern', 'Eco-Friendly', 'Deluxe', 'Compact',
  '高端', '智能', '便携', '专业', '经典', '时尚', '环保'
];

/** 产品名词 */
const PRODUCT_NOUNS = [
  'Headphones', 'Keyboard', 'Monitor', 'Mouse', 'Speaker', 'Camera',
  'Tablet', 'Laptop', 'Phone', 'Watch', 'Charger', 'Cable',
  '耳机', '键盘', '显示器', '鼠标', '音箱', '相机', '平板', '手机', '手表'
];

/** 公司标语 */
const CATCH_PHRASES = [
  'Innovating the future', 'Your success is our mission', 'Quality first',
  'Building tomorrow today', 'Excellence in every detail', 'Empowering innovation',
  '创新引领未来', '品质成就卓越', '科技改变生活', '用心服务每一天'
];

/** 商业术语 */
const BS_PHRASES = [
  'leverage cutting-edge solutions', 'deliver scalable platforms',
  'enable enterprise architectures', 'optimize strategic initiatives',
  'revolutionize end-to-end systems', 'transform digital experiences',
  '整合核心资源', '打造生态闭环', '赋能业务增长', '实现价值最大化'
];

// ============== 工具函数 ==============

/**
 * 生成随机整数
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机选择数组元素
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 生成随机字符串
 */
function randomString(length: number, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 生成 UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

// ============== 人名生成 ==============

/**
 * 生成中文姓名
 * @param gender - 性别
 * @returns 中文姓名
 */
export function chineseName(gender?: Gender): string {
  const surname = randomChoice(CHINESE_SURNAMES);
  let givenName: string;
  
  if (gender === 'female') {
    givenName = randomChoice(CHINESE_FEMALE_NAMES);
  } else if (gender === 'male') {
    givenName = randomChoice(CHINESE_MALE_NAMES);
  } else {
    givenName = Math.random() > 0.5 
      ? randomChoice(CHINESE_MALE_NAMES) 
      : randomChoice(CHINESE_FEMALE_NAMES);
  }
  
  return surname + givenName;
}

/**
 * 生成英文姓名
 * @param gender - 性别
 * @returns 英文姓名
 */
export function englishName(gender?: Gender): string {
  let firstName: string;
  
  if (gender === 'female') {
    firstName = randomChoice(ENGLISH_FEMALE_NAMES);
  } else if (gender === 'male') {
    firstName = randomChoice(ENGLISH_MALE_NAMES);
  } else {
    firstName = Math.random() > 0.5
      ? randomChoice(ENGLISH_MALE_NAMES)
      : randomChoice(ENGLISH_FEMALE_NAMES);
  }
  
  const lastName = randomChoice(ENGLISH_SURNAMES);
  return `${firstName} ${lastName}`;
}

/**
 * 生成姓名 (自动选择中英文)
 * @param gender - 性别
 * @param locale - 语言环境 'zh' | 'en' | 'random'
 * @returns 姓名
 */
export function name(gender?: Gender, locale: 'zh' | 'en' | 'random' = 'random'): string {
  if (locale === 'zh') {
    return chineseName(gender);
  } else if (locale === 'en') {
    return englishName(gender);
  } else {
    return Math.random() > 0.5 ? chineseName(gender) : englishName(gender);
  }
}

/**
 * 生成姓氏
 * @param locale - 语言环境
 * @returns 姓氏
 */
export function surname(locale: 'zh' | 'en' | 'random' = 'random'): string {
  if (locale === 'zh') {
    return randomChoice(CHINESE_SURNAMES);
  } else if (locale === 'en') {
    return randomChoice(ENGLISH_SURNAMES);
  } else {
    return Math.random() > 0.5 
      ? randomChoice(CHINESE_SURNAMES) 
      : randomChoice(ENGLISH_SURNAMES);
  }
}

/**
 * 生成名字 (不含姓)
 * @param gender - 性别
 * @param locale - 语言环境
 * @returns 名字
 */
export function firstName(gender?: Gender, locale: 'zh' | 'en' | 'random' = 'random'): string {
  if (locale === 'zh') {
    if (gender === 'female') return randomChoice(CHINESE_FEMALE_NAMES);
    if (gender === 'male') return randomChoice(CHINESE_MALE_NAMES);
    return Math.random() > 0.5 
      ? randomChoice(CHINESE_MALE_NAMES) 
      : randomChoice(CHINESE_FEMALE_NAMES);
  } else {
    if (gender === 'female') return randomChoice(ENGLISH_FEMALE_NAMES);
    if (gender === 'male') return randomChoice(ENGLISH_MALE_NAMES);
    return Math.random() > 0.5
      ? randomChoice(ENGLISH_MALE_NAMES)
      : randomChoice(ENGLISH_FEMALE_NAMES);
  }
}

// ============== 地址生成 ==============

/**
 * 生成地址
 * @param locale - 语言环境
 * @returns Address 对象
 */
export function address(locale: 'zh' | 'en' | 'random' = 'random'): Address {
  const location = randomChoice(CITIES);
  const street = `${randomInt(1, 9999)} ${randomChoice(STREET_NAMES)}`;
  const zipCode = locale === 'zh' 
    ? `${randomInt(100000, 999999)}`
    : `${randomInt(10000, 99999)}`;
  
  const streetLocal = locale === 'zh' 
    ? `${randomChoice(['朝阳区', '海淀区', '西城区', '东城区', '越秀区', '天河区', '南山区', '浦东新区'])} ${street}`
    : street;
  
  return {
    street: streetLocal,
    city: location.city,
    state: location.state,
    zipCode,
    country: location.country,
    full: `${streetLocal}, ${location.city}, ${location.state} ${zipCode}, ${location.country}`
  };
}

/**
 * 生成城市
 * @returns 城市名
 */
export function city(): string {
  return randomChoice(CITIES).city;
}

/**
 * 生成国家
 * @returns 国家名
 */
export function country(): string {
  return randomChoice(CITIES).country;
}

/**
 * 生成邮政编码
 * @param locale - 语言环境
 * @returns 邮政编码
 */
export function zipCode(locale: 'zh' | 'en' = 'zh'): string {
  if (locale === 'zh') {
    return `${randomInt(100000, 999999)}`;
  } else {
    return `${randomInt(10000, 99999)}`;
  }
}

// ============== 联系方式生成 ==============

/**
 * 生成邮箱地址
 * @param name - 姓名 (可选)
 * @returns 邮箱地址
 */
export function email(name?: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', '163.com', 'qq.com', '126.com'];
  const userPart = name 
    ? name.toLowerCase().replace(/[^a-z0-9]/g, '.')
    : randomString(randomInt(6, 12), 'abcdefghijklmnopqrstuvwxyz0123456789._');
  
  return `${userPart}@${randomChoice(domains)}`;
}

/**
 * 生成电话号码
 * @param locale - 语言环境
 * @returns 电话号码
 */
export function phone(locale: 'zh' | 'en' | 'random' = 'random'): string {
  if (locale === 'zh' || (locale === 'random' && Math.random() > 0.5)) {
    // 中国手机号
    const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139', 
                      '150', '151', '152', '153', '155', '156', '157', '158', '159',
                      '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
    const prefix = randomChoice(prefixes);
    const suffix = randomString(8, '0123456789');
    return `${prefix}${suffix}`;
  } else {
    // 美国手机号
    const areaCode = randomInt(200, 999);
    const prefix = randomInt(200, 999);
    const line = randomInt(1000, 9999);
    return `(${areaCode}) ${prefix}-${line}`;
  }
}

// ============== 公司数据生成 ==============

/**
 * 生成公司名称
 * @returns 公司名称
 */
export function companyName(): string {
  const adjective = randomChoice(PRODUCT_ADJECTIVES);
  const noun = randomChoice(PRODUCT_NOUNS);
  const suffix = randomChoice(COMPANY_SUFFIXES);
  
  const patterns = [
    `${adjective} ${noun} ${suffix}`,
    `${noun} ${suffix}`,
    `${adjective} ${suffix}`,
    `${randomChoice(CITIES).city} ${suffix}`
  ];
  
  return randomChoice(patterns);
}

/**
 * 生成公司完整信息
 * @returns Company 对象
 */
export function company(): Company {
  const name = companyName();
  const foundedYear = randomInt(1980, 2024);
  
  return {
    name,
    industry: randomChoice(INDUSTRIES),
    catchPhrase: randomChoice(CATCH_PHRASES),
    bs: randomChoice(BS_PHRASES),
    email: email(name),
    website: `www.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    phone: phone('random'),
    address: address('random'),
    employeeCount: randomInt(10, 10000),
    foundedYear
  };
}

/**
 * 生成行业
 * @returns 行业名称
 */
export function industry(): string {
  return randomChoice(INDUSTRIES);
}

/**
 * 生成公司标语
 * @returns 标语
 */
export function catchPhrase(): string {
  return randomChoice(CATCH_PHRASES);
}

// ============== 产品数据生成 ==============

/**
 * 生成产品名称
 * @returns 产品名称
 */
export function productName(): string {
  const adjective = randomChoice(PRODUCT_ADJECTIVES);
  const noun = randomChoice(PRODUCT_NOUNS);
  const model = randomString(randomInt(2, 4), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  
  return `${adjective} ${noun} ${model}`;
}

/**
 * 生成产品完整信息
 * @returns Product 对象
 */
export function product(): Product {
  const price = parseFloat((randomInt(1000, 500000) / 100).toFixed(2));
  
  return {
    name: productName(),
    category: randomChoice(PRODUCT_CATEGORIES),
    price,
    sku: `SKU-${randomString(8, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')}`,
    description: `High-quality ${productName().toLowerCase()} designed for modern needs.`,
    stock: randomInt(0, 10000),
    rating: parseFloat((Math.random() * 2 + 3).toFixed(1)) // 3.0 - 5.0
  };
}

/**
 * 生成产品类别
 * @returns 类别名称
 */
export function productCategory(): string {
  return randomChoice(PRODUCT_CATEGORIES);
}

/**
 * 生成价格
 * @param min - 最小价格
 * @param max - 最大价格
 * @returns 价格 (保留 2 位小数)
 */
export function price(min: number = 100, max: number = 100000): number {
  return parseFloat((randomInt(min * 100, max * 100) / 100).toFixed(2));
}

// ============== 时间数据生成 ==============

/**
 * 生成随机日期
 * @param start - 开始日期 (默认 2000-01-01)
 * @param end - 结束日期 (默认今天)
 * @returns Date 对象
 */
export function date(start: Date = new Date(2000, 0, 1), end: Date = new Date()): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

/**
 * 生成过去的时间
 * @param days - 最大天数 (默认 365)
 * @returns Date 对象
 */
export function past(days: number = 365): Date {
  const now = new Date();
  const pastTime = now.getTime() - randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(pastTime);
}

/**
 * 生成未来的时间
 * @param days - 最大天数 (默认 365)
 * @returns Date 对象
 */
export function future(days: number = 365): Date {
  const now = new Date();
  const futureTime = now.getTime() + randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(futureTime);
}

/**
 * 生成最近的时间 (过去 30 天内)
 * @returns Date 对象
 */
export function recent(): Date {
  return past(30);
}

/**
 * 生成时间戳
 * @param start - 开始时间戳
 * @param end - 结束时间戳
 * @returns 时间戳 (毫秒)
 */
export function timestamp(start?: number, end?: number): number {
  if (start === undefined || end === undefined) {
    return date().getTime();
  }
  return randomInt(start, end);
}

// ============== 金融数据生成 ==============

/**
 * 生成信用卡信息
 * @returns CreditCard 对象
 */
export function creditCard(): CreditCard {
  const types = [
    { type: 'Visa', prefix: '4' },
    { type: 'Mastercard', prefix: '5' },
    { type: 'American Express', prefix: '34' },
    { type: 'Discover', prefix: '6' }
  ];
  
  const cardType = randomChoice(types);
  let number = cardType.prefix;
  
  while (number.length < 16) {
    number += randomInt(0, 9);
  }
  
  // American Express 是 15 位
  if (cardType.type === 'American Express') {
    number = number.slice(0, 15);
  }
  
  const cvv = randomString(3, '0123456789');
  const expiryMonth = String(randomInt(1, 12)).padStart(2, '0');
  const expiryYear = String(randomInt(new Date().getFullYear(), new Date().getFullYear() + 5)).slice(-2);
  
  return {
    type: cardType.type,
    number: number.replace(/(.{4})/g, '$1 ').trim(),
    cvv,
    expiryDate: `${expiryMonth}/${expiryYear}`,
    holderName: name('random', 'random')
  };
}

/**
 * 生成银行账户号码
 * @returns 账号
 */
export function accountNumber(): string {
  return `${randomInt(100000000, 9999999999)}`;
}

/**
 * 生成交易记录
 * @returns Transaction 对象
 */
export function transaction(): Transaction {
  const amount = parseFloat((randomInt(1000, 1000000) / 100).toFixed(2));
  const types: ('credit' | 'debit')[] = ['credit', 'debit'];
  
  return {
    id: generateUUID(),
    amount,
    currency: randomChoice(['USD', 'EUR', 'GBP', 'CNY', 'JPY']),
    type: randomChoice(types),
    date: past(365),
    description: `Payment for ${productName().toLowerCase()}`,
    accountNumber: accountNumber()
  };
}

/**
 * 生成货币金额
 * @param currency - 货币类型
 * @param min - 最小金额
 * @param max - 最大金额
 * @returns 金额对象
 */
export function amount(currency: string = 'USD', min: number = 0, max: number = 10000): {
  amount: number;
  currency: string;
  formatted: string;
} {
  const value = parseFloat((randomInt(min * 100, max * 100) / 100).toFixed(2));
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥'
  };
  const symbol = symbols[currency] || currency;
  
  return {
    amount: value,
    currency,
    formatted: `${symbol}${value.toLocaleString()}`
  };
}

// ============== 个人信息生成 ==============

/**
 * 生成完整个人信息
 * @param gender - 性别
 * @param locale - 语言环境
 * @returns Person 对象
 */
export function person(gender?: Gender, locale: 'zh' | 'en' | 'random' = 'random'): Person {
  const fullName = name(gender, locale);
  const birthDate = date(new Date(1970, 0, 1), new Date(2005, 11, 31));
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  return {
    firstName: fullName.split(' ')[0],
    lastName: fullName.split(' ').slice(1).join(' ') || fullName,
    fullName,
    gender: gender || (Math.random() > 0.5 ? 'male' : 'female'),
    email: email(fullName),
    phone: phone(locale),
    address: address(locale),
    birthDate,
    age
  };
}

// ============== 导出汇总 ==============

export const faker = {
  // 人名
  name,
  firstName,
  surname,
  chineseName,
  englishName,
  
  // 地址
  address,
  city,
  country,
  zipCode,
  
  // 联系方式
  email,
  phone,
  
  // 公司
  company,
  companyName,
  industry,
  catchPhrase,
  
  // 产品
  product,
  productName,
  productCategory,
  price,
  
  // 时间
  date,
  past,
  future,
  recent,
  timestamp,
  
  // 金融
  creditCard,
  accountNumber,
  transaction,
  amount,
  
  // 个人信息
  person,
  
  // 工具
  randomInt,
  randomChoice,
  randomString,
  uuid: generateUUID
};

export default faker;

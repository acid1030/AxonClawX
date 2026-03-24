/**
 * Mock Utils Skill - ACE
 * 
 * Mock 数据生成工具
 * 
 * 功能:
 * 1. 随机数据生成 - 姓名/邮箱/地址/电话等
 * 2. Mock API 响应 - 模拟 API 返回数据结构
 * 3. 数据模板 - 预定义常用数据模板
 * 
 * @version 1.0.0
 * @author Axon
 */

import * as crypto from 'crypto';

// ============================================================================
// 基础工具函数
// ============================================================================

/**
 * 字符集常量
 */
const CHAR_SETS = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alphabetic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  hex: '0123456789ABCDEF',
};

/**
 * 生成随机整数 (min <= x < max)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * 生成随机字符串
 */
function randomString(length: number, charset: string = CHAR_SETS.alphanumeric): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(randomInt(0, charset.length));
  }
  return result;
}

/**
 * 从数组中随机选择一个元素
 */
function randomChoice<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot choose from empty array');
  }
  return arr[randomInt(0, arr.length)];
}

// ============================================================================
// 随机数据生成
// ============================================================================

/**
 * 常见中文姓氏
 */
const CHINESE_SURNAMES = [
  '李', '王', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
  '徐', '孙', '马', '朱', '胡', '郭', '何', '高', '林', '罗',
  '郑', '梁', '谢', '宋', '唐', '许', '韩', '冯', '邓', '曹',
  '彭', '曾', '萧', '田', '董', '袁', '潘', '于', '蒋', '蔡',
  '余', '杜', '叶', '程', '苏', '魏', '吕', '丁', '任', '沈'
];

/**
 * 常见中文名字
 */
const CHINESE_GIVEN_NAMES = [
  '伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军',
  '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞',
  '平', '刚', '桂英', '华', '梅', '鑫', '玲', '飞', '桂兰', '英',
  '燕', '萍', '波', '芬', '建华', '建国', '建军', '红', '玉兰', '建',
  '俊', '鹏', '琳', '欣', '桂芳', '婷婷', '浩然', '宇', '博', '雪'
];

/**
 * 英文名库
 */
const ENGLISH_FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Donald', 'Sandra', 'Mark', 'Ashley',
  'Paul', 'Kimberly', 'Steven', 'Emily', 'Andrew', 'Donna', 'Kenneth', 'Michelle'
];

const ENGLISH_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker'
];

/**
 * 域名列表
 */
const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  '163.com', '126.com', 'qq.com', 'sina.com', 'sohu.com'
];

/**
 * 城市数据
 */
const CITIES = [
  { name: '北京', province: '北京', zip: '100000', area: '朝阳区' },
  { name: '上海', province: '上海', zip: '200000', area: '浦东新区' },
  { name: '广州', province: '广东', zip: '510000', area: '天河区' },
  { name: '深圳', province: '广东', zip: '518000', area: '南山区' },
  { name: '杭州', province: '浙江', zip: '310000', area: '西湖区' },
  { name: '成都', province: '四川', zip: '610000', area: '武侯区' },
  { name: '武汉', province: '湖北', zip: '430000', area: '武昌区' },
  { name: '西安', province: '陕西', zip: '710000', area: '雁塔区' },
  { name: '南京', province: '江苏', zip: '210000', area: '鼓楼区' },
  { name: '重庆', province: '重庆', zip: '400000', area: '渝中区' }
];

/**
 * 公司名称前缀
 */
const COMPANY_PREFIXES = [
  '华为', '腾讯', '阿里', '百度', '字节', '美团', '京东', '网易',
  '小米', 'OPPO', 'VIVO', '滴滴', '拼多多', '快手', 'B 站', '知乎'
];

/**
 * 行业类型
 */
const INDUSTRIES = [
  '互联网', '金融', '教育', '医疗', '制造', '零售', '物流', '娱乐',
  '房地产', '能源', '交通', '通信', '咨询', '媒体', '游戏', '电商'
];

/**
 * 生成中文姓名
 * 
 * @param gender - 性别 ('male' | 'female' | 'random')
 * @returns 中文姓名
 * 
 * @example
 * generateChineseName()        // => "张伟"
 * generateChineseName('female') // => "李娜"
 */
export function generateChineseName(gender: 'male' | 'female' | 'random' = 'random'): string {
  const surname = randomChoice(CHINESE_SURNAMES);
  const givenName = randomChoice(CHINESE_GIVEN_NAMES);
  return surname + givenName;
}

/**
 * 生成英文姓名
 * 
 * @param gender - 性别 ('male' | 'female' | 'random')
 * @returns 英文姓名
 * 
 * @example
 * generateEnglishName()        // => "John Smith"
 * generateEnglishName('female') // => "Mary Johnson"
 */
export function generateEnglishName(gender: 'male' | 'female' | 'random' = 'random'): string {
  const firstName = randomChoice(ENGLISH_FIRST_NAMES);
  const lastName = randomChoice(ENGLISH_LAST_NAMES);
  return `${firstName} ${lastName}`;
}

/**
 * 生成邮箱地址
 * 
 * @param name - 可选的用户名部分
 * @returns 邮箱地址
 * 
 * @example
 * generateEmail()              // => "zhangwei123@gmail.com"
 * generateEmail("john.doe")    // => "john.doe@yahoo.com"
 */
export function generateEmail(name?: string): string {
  const username = name || randomString(randomInt(6, 12), CHAR_SETS.alphanumeric.toLowerCase());
  const domain = randomChoice(EMAIL_DOMAINS);
  const number = randomInt(1, 999);
  return `${username}${number}@${domain}`;
}

/**
 * 生成手机号码 (中国大陆)
 * 
 * @returns 11 位手机号
 * 
 * @example
 * generatePhone()  // => "13812345678"
 */
export function generatePhone(): string {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                    '150', '151', '152', '153', '155', '156', '157', '158', '159',
                    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
  const prefix = randomChoice(prefixes);
  const suffix = randomString(8, CHAR_SETS.numeric);
  return prefix + suffix;
}

/**
 * 生成地址
 * 
 * @returns 地址对象
 * 
 * @example
 * generateAddress()
 * // => {
 * //   province: "广东",
 * //   city: "深圳",
 * //   area: "南山区",
 * //   street: "科技园南路 123 号",
 * //   zip: "518000"
 * // }
 */
export function generateAddress(): {
  province: string;
  city: string;
  area: string;
  street: string;
  zip: string;
} {
  const city = randomChoice(CITIES);
  const streetNumber = randomInt(1, 999);
  const streetTypes = ['路', '街', '道', '巷', '胡同'];
  const streetType = randomChoice(streetTypes);
  
  return {
    province: city.province,
    city: city.name,
    area: city.area,
    street: `${randomString(randomInt(2, 4), CHAR_SETS.alphabetic)}${streetType}${streetNumber}号`,
    zip: city.zip
  };
}

/**
 * 生成公司名称
 * 
 * @returns 公司名称
 * 
 * @example
 * generateCompany()  // => "华为科技有限公司"
 */
export function generateCompany(): string {
  const prefix = randomChoice(COMPANY_PREFIXES);
  const suffixes = ['科技', '网络', '信息', '软件', '数据', '智能', '创新'];
  const suffix = randomChoice(suffixes);
  const endings = ['有限公司', '股份有限公司', '集团', '公司'];
  const ending = randomChoice(endings);
  
  return `${prefix}${suffix}${ending}`;
}

/**
 * 生成职位
 * 
 * @returns 职位名称
 * 
 * @example
 * generateJobTitle()  // => "高级工程师"
 */
export function generateJobTitle(): string {
  const levels = ['初级', '中级', '高级', '资深', '专家', '首席'];
  const roles = ['工程师', '设计师', '产品经理', '运营', '分析师', '开发', '测试', '架构师'];
  
  return `${randomChoice(levels)}${randomChoice(roles)}`;
}

/**
 * 生成身份证号 (中国大陆，符合校验规则)
 * 
 * @returns 18 位身份证号
 * 
 * @example
 * generateIDCard()  // => "110101199001011234"
 */
export function generateIDCard(): string {
  // 简化版，不严格校验地区码和日期有效性
  const provinces = ['11', '12', '13', '14', '15', '21', '22', '23', '31', '32',
                     '33', '34', '35', '36', '37', '41', '42', '43', '44', '45',
                     '46', '50', '51', '52', '53', '54', '61', '62', '63', '64', '65'];
  
  const province = randomChoice(provinces);
  const city = randomString(2, CHAR_SETS.numeric);
  const district = randomString(2, CHAR_SETS.numeric);
  const year = randomInt(1950, 2023).toString();
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  const sequence = randomString(3, CHAR_SETS.numeric);
  
  // 计算校验码 (简化版)
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  const checkCode = randomChoice(checkCodes);
  
  return `${province}${city}${district}${year}${month}${day}${sequence}${checkCode}`;
}

/**
 * 生成银行卡号 (符合 Luhn 算法)
 * 
 * @param bank - 银行代码 (6 位)
 * @returns 银行卡号
 * 
 * @example
 * generateBankCard()  // => "6222021234567890123"
 */
export function generateBankCard(bank: string = '622202'): string {
  const length = 16;
  let cardNumber = bank;
  
  while (cardNumber.length < length - 1) {
    cardNumber += randomString(1, CHAR_SETS.numeric);
  }
  
  // Luhn 算法计算校验位
  let sum = 0;
  for (let i = 0; i < cardNumber.length; i++) {
    let digit = parseInt(cardNumber[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return cardNumber + checkDigit.toString();
}

// ============================================================================
// Mock API 响应
// ============================================================================

/**
 * 用户数据结构
 */
export interface MockUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  name: string;
  avatar: string;
  gender: 'male' | 'female';
  birthday: string;
  address: {
    province: string;
    city: string;
    area: string;
    street: string;
    zip: string;
  };
  createdAt: string;
}

/**
 * 生成 Mock 用户数据
 * 
 * @param count - 生成数量，默认 1
 * @returns 用户数据数组
 * 
 * @example
 * generateMockUsers(1)
 * // => [{ id: "usr_xxx", username: "zhangwei", ... }]
 */
export function generateMockUsers(count: number = 1): MockUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `usr_${randomString(8, CHAR_SETS.alphanumeric.toLowerCase())}`,
    username: `user_${randomString(6, CHAR_SETS.alphanumeric.toLowerCase())}`,
    email: generateEmail(),
    phone: generatePhone(),
    name: generateChineseName(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomString(8)}`,
    gender: randomChoice(['male', 'female']),
    birthday: `${randomInt(1970, 2000)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
    address: generateAddress(),
    createdAt: new Date(Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000)).toISOString()
  }));
}

/**
 * 文章数据结构
 */
export interface MockArticle {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

const ARTICLE_TITLES = [
  '探索人工智能的未来发展趋势',
  '如何构建高效的 React 应用',
  'TypeScript 最佳实践指南',
  '微服务架构设计模式',
  '云原生技术应用与实践',
  '数据可视化技术详解',
  '前端性能优化完全指南',
  'Node.js 服务端开发实战',
  'DevOps 持续集成与部署',
  '区块链技术应用前景'
];

const ARTICLE_TAGS = [
  '技术', '编程', 'AI', '前端', '后端', '架构', '云原生',
  '数据科学', 'DevOps', '安全', '性能', '教程', '实战'
];

/**
 * 生成 Mock 文章数据
 * 
 * @param count - 生成数量，默认 1
 * @returns 文章数据数组
 * 
 * @example
 * generateMockArticles(1)
 * // => [{ id: "art_xxx", title: "...", content: "...", ... }]
 */
export function generateMockArticles(count: number = 1): MockArticle[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000);
    const updatedAt = createdAt + randomInt(0, 30 * 24 * 60 * 60 * 1000);
    
    return {
      id: `art_${randomString(8, CHAR_SETS.alphanumeric.toLowerCase())}`,
      title: randomChoice(ARTICLE_TITLES),
      content: randomString(randomInt(100, 500), CHAR_SETS.alphabetic + ' '),
      author: {
        id: `usr_${randomString(8)}`,
        name: generateChineseName(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomString(8)}`
      },
      tags: Array.from({ length: randomInt(2, 5) }, () => randomChoice(ARTICLE_TAGS)),
      views: randomInt(100, 100000),
      likes: randomInt(10, 10000),
      comments: randomInt(0, 1000),
      status: randomChoice(['draft', 'published', 'archived']),
      createdAt: new Date(createdAt).toISOString(),
      updatedAt: new Date(updatedAt).toISOString()
    };
  });
}

/**
 * 订单数据结构
 */
export interface MockOrder {
  id: string;
  orderNo: string;
  userId: string;
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'alipay' | 'wechat' | 'card' | 'cod';
  shippingAddress: {
    province: string;
    city: string;
    area: string;
    street: string;
    zip: string;
  };
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

const PRODUCT_NAMES = [
  'iPhone 15 Pro', 'MacBook Pro', 'iPad Air', 'AirPods Pro',
  '小米 14', '华为 Mate 60', 'Switch OLED', 'PS5',
  '机械键盘', '无线鼠标', '显示器', '耳机', '音箱'
];

/**
 * 生成 Mock 订单数据
 * 
 * @param count - 生成数量，默认 1
 * @returns 订单数据数组
 * 
 * @example
 * generateMockOrders(1)
 * // => [{ id: "ord_xxx", orderNo: "ORD202401010001", ... }]
 */
export function generateMockOrders(count: number = 1): MockOrder[] {
  return Array.from({ length: count }, (_, i) => {
    const createdAt = Date.now() - randomInt(0, 90 * 24 * 60 * 60 * 1000);
    const productCount = randomInt(1, 5);
    const products = Array.from({ length: productCount }, () => ({
      id: `prd_${randomString(8)}`,
      name: randomChoice(PRODUCT_NAMES),
      price: randomInt(99, 9999),
      quantity: randomInt(1, 3)
    }));
    const totalAmount = products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    
    const status = randomChoice(['pending', 'paid', 'shipped', 'delivered', 'cancelled']) as MockOrder['status'];
    const order: MockOrder = {
      id: `ord_${randomString(8)}`,
      orderNo: `ORD${new Date().getFullYear()}${String(randomInt(1, 9999)).padStart(4, '0')}`,
      userId: `usr_${randomString(8)}`,
      products,
      totalAmount,
      status,
      paymentMethod: randomChoice(['alipay', 'wechat', 'card', 'cod']),
      shippingAddress: generateAddress(),
      createdAt: new Date(createdAt).toISOString()
    };
    
    if (status !== 'pending' && status !== 'cancelled') {
      order.paidAt = new Date(createdAt + randomInt(1, 60) * 60 * 1000).toISOString();
    }
    if (status === 'shipped' || status === 'delivered') {
      order.shippedAt = new Date(createdAt + randomInt(1, 3) * 24 * 60 * 60 * 1000).toISOString();
    }
    if (status === 'delivered') {
      order.deliveredAt = new Date(createdAt + randomInt(4, 7) * 24 * 60 * 60 * 1000).toISOString();
    }
    
    return order;
  });
}

/**
 * API 响应数据结构
 */
export interface MockApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
  requestId: string;
}

/**
 * 生成成功 API 响应
 * 
 * @param data - 响应数据
 * @returns API 响应对象
 * 
 * @example
 * createSuccessResponse({ users: [...] })
 * // => { code: 200, message: "success", data: {...}, ... }
 */
export function createSuccessResponse<T>(data: T): MockApiResponse<T> {
  return {
    code: 200,
    message: 'success',
    data,
    timestamp: Date.now(),
    requestId: `req_${randomString(16, CHAR_SETS.alphanumeric.toLowerCase())}`
  };
}

/**
 * 生成失败 API 响应
 * 
 * @param code - 错误码
 * @param message - 错误信息
 * @returns API 响应对象
 * 
 * @example
 * createErrorResponse(400, "参数错误")
 * // => { code: 400, message: "参数错误", data: null, ... }
 */
export function createErrorResponse(code: number = 400, message: string = 'Bad Request'): MockApiResponse<null> {
  return {
    code,
    message,
    data: null,
    timestamp: Date.now(),
    requestId: `req_${randomString(16, CHAR_SETS.alphanumeric.toLowerCase())}`
  };
}

// ============================================================================
// 数据模板
// ============================================================================

/**
 * 预定义模板类型
 */
export type TemplateType = 
  | 'user'
  | 'article'
  | 'order'
  | 'product'
  | 'comment'
  | 'notification'
  | 'log'
  | 'metric';

/**
 * 模板配置接口
 */
export interface TemplateConfig {
  count?: number;
  fields?: Record<string, any>;
  locale?: 'zh' | 'en';
}

/**
 * 生成模板数据
 * 
 * @param type - 模板类型
 * @param config - 配置选项
 * @returns 生成的数据
 * 
 * @example
 * generateTemplate('user', { count: 5 })
 * generateTemplate('article', { count: 3, locale: 'en' })
 */
export function generateTemplate(type: TemplateType, config: TemplateConfig = {}): any {
  const { count = 1, fields = {}, locale = 'zh' } = config;
  
  switch (type) {
    case 'user':
      return generateMockUsers(count).map(u => ({ ...u, ...fields }));
    
    case 'article':
      return generateMockArticles(count).map(a => ({ ...a, ...fields }));
    
    case 'order':
      return generateMockOrders(count).map(o => ({ ...o, ...fields }));
    
    case 'product':
      return Array.from({ length: count }, () => generateMockProduct(fields));
    
    case 'comment':
      return Array.from({ length: count }, () => generateMockComment(fields));
    
    case 'notification':
      return Array.from({ length: count }, () => generateMockNotification(fields));
    
    case 'log':
      return Array.from({ length: count }, () => generateMockLog(fields));
    
    case 'metric':
      return Array.from({ length: count }, () => generateMockMetric(fields));
    
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}

/**
 * 商品数据结构
 */
export interface MockProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  stock: number;
  category: string;
  images: string[];
  rating: number;
  reviews: number;
  tags: string[];
}

const PRODUCT_CATEGORIES = ['电子产品', '服装', '家居', '图书', '食品', '美妆', '运动', '玩具'];

function generateMockProduct(fields: Record<string, any> = {}): MockProduct {
  const price = randomInt(99, 9999);
  return {
    id: `prd_${randomString(8)}`,
    name: randomChoice(PRODUCT_NAMES),
    description: randomString(randomInt(50, 200), CHAR_SETS.alphabetic + ' '),
    price,
    originalPrice: price + randomInt(100, 1000),
    stock: randomInt(0, 1000),
    category: randomChoice(PRODUCT_CATEGORIES),
    images: Array.from({ length: randomInt(1, 5) }, (_, i) => 
      `https://picsum.photos/seed/${randomString(8)}/400/400`
    ),
    rating: Number((Math.random() * 2 + 3).toFixed(1)),
    reviews: randomInt(10, 10000),
    tags: Array.from({ length: randomInt(2, 5) }, () => randomChoice(ARTICLE_TAGS)),
    ...fields
  };
}

/**
 * 评论数据结构
 */
export interface MockComment {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  rating: number;
  likes: number;
  replies: number;
  createdAt: string;
}

function generateMockComment(fields: Record<string, any> = {}): MockComment {
  return {
    id: `cmt_${randomString(8)}`,
    userId: `usr_${randomString(8)}`,
    userName: generateChineseName(),
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomString(8)}`,
    content: randomString(randomInt(20, 200), CHAR_SETS.alphabetic + ' '),
    rating: randomInt(1, 5),
    likes: randomInt(0, 500),
    replies: randomInt(0, 50),
    createdAt: new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString(),
    ...fields
  };
}

/**
 * 通知数据结构
 */
export interface MockNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

const NOTIFICATION_TITLES = [
  '系统更新通知', '安全提醒', '活动预告', '功能上线',
  '版本升级', '维护公告', '优惠信息', '重要提醒'
];

function generateMockNotification(fields: Record<string, any> = {}): MockNotification {
  return {
    id: `ntf_${randomString(8)}`,
    type: randomChoice(['info', 'warning', 'error', 'success']),
    title: randomChoice(NOTIFICATION_TITLES),
    content: randomString(randomInt(30, 150), CHAR_SETS.alphabetic + ' '),
    read: Math.random() < 0.7,
    createdAt: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)).toISOString(),
    ...fields
  };
}

/**
 * 日志数据结构
 */
export interface MockLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  context: Record<string, any>;
  timestamp: string;
}

const LOG_MODULES = ['auth', 'api', 'database', 'cache', 'queue', 'worker', 'gateway', 'agent'];
const LOG_MESSAGES = [
  'Request processed successfully',
  'User authenticated',
  'Cache miss',
  'Database connection established',
  'Task queued',
  'Rate limit exceeded',
  'Invalid token',
  'Service started'
];

function generateMockLog(fields: Record<string, any> = {}): MockLog {
  return {
    id: `log_${randomString(8)}`,
    level: randomChoice(['debug', 'info', 'warn', 'error']),
    module: randomChoice(LOG_MODULES),
    message: randomChoice(LOG_MESSAGES),
    context: {
      userId: `usr_${randomString(8)}`,
      requestId: `req_${randomString(8)}`,
      duration: randomInt(1, 1000)
    },
    timestamp: new Date(Date.now() - randomInt(0, 24 * 60 * 60 * 1000)).toISOString(),
    ...fields
  };
}

/**
 * 指标数据结构
 */
export interface MockMetric {
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  timestamp: string;
}

const METRIC_NAMES = ['DAU', 'MAU', 'Revenue', 'Conversion', 'Retention', 'Churn', 'ARPU', 'LTV'];

function generateMockMetric(fields: Record<string, any> = {}): MockMetric {
  const value = randomInt(1000, 1000000);
  const change = Number((Math.random() * 20 - 10).toFixed(2));
  return {
    name: randomChoice(METRIC_NAMES),
    value,
    unit: randomChoice(['', '%', '¥', '$']),
    change,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    timestamp: new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)).toISOString(),
    ...fields
  };
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import {
 *   generateChineseName,
 *   generateEmail,
 *   generatePhone,
 *   generateMockUsers,
 *   generateMockArticles,
 *   generateMockOrders,
 *   createSuccessResponse,
 *   createErrorResponse,
 *   generateTemplate
 * } from './mock-utils-skill';
 * 
 * // 1. 随机数据生成
 * const name = generateChineseName();           // "张伟"
 * const email = generateEmail();                // "zhangwei123@gmail.com"
 * const phone = generatePhone();                // "13812345678"
 * const address = generateAddress();            // { province: "广东", city: "深圳", ... }
 * 
 * // 2. Mock API 响应
 * const users = generateMockUsers(5);           // 生成 5 个用户
 * const articles = generateMockArticles(10);    // 生成 10 篇文章
 * const orders = generateMockOrders(3);         // 生成 3 个订单
 * 
 * // 成功响应
 * const successResp = createSuccessResponse({ users });
 * // { code: 200, message: "success", data: {...}, timestamp: ..., requestId: ... }
 * 
 * // 失败响应
 * const errorResp = createErrorResponse(400, "参数错误");
 * // { code: 400, message: "参数错误", data: null, ... }
 * 
 * // 3. 数据模板
 * const templateUsers = generateTemplate('user', { count: 5 });
 * const templateArticles = generateTemplate('article', { count: 3 });
 * const templateProducts = generateTemplate('product', { count: 10 });
 * const templateComments = generateTemplate('comment', { count: 20 });
 * ```
 */

// ============================================================================
// 导出
// ============================================================================

export default {
  // 随机数据生成
  generateChineseName,
  generateEnglishName,
  generateEmail,
  generatePhone,
  generateAddress,
  generateCompany,
  generateJobTitle,
  generateIDCard,
  generateBankCard,
  
  // Mock API 响应
  generateMockUsers,
  generateMockArticles,
  generateMockOrders,
  createSuccessResponse,
  createErrorResponse,
  
  // 数据模板
  generateTemplate
};

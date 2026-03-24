# Random Utils Skill 使用示例

## 导入方式

```typescript
// 命名导入
import { randomInt, uuidv4, shuffle, randomChoice } from '@/skills/random-utils-skill';

// 或整体导入
import RandomUtils from '@/skills/random-utils-skill';
// 或
import { RandomUtils } from '@/skills/random-utils-skill';
```

---

## 1. 随机数生成

### 基础随机数

```typescript
import { randomInt, randomFloat, randomBoolean, randomNormal } from '@/skills/random-utils-skill';

// 生成 1-100 的随机整数
const num = randomInt(1, 100); // 例如：42

// 生成 0-1 的随机浮点数
const float = randomFloat(); // 例如：0.732

// 生成指定范围的浮点数
const floatRange = randomFloat(5.5, 10.8); // 例如：7.234

// 随机布尔值
const bool = randomBoolean(); // true 或 false

// 正态分布随机数 (均值 0, 标准差 1)
const normal = randomNormal(); // 例如：-0.523

// 自定义正态分布 (均值 100, 标准差 15)
const iq = randomNormal(100, 15); // 例如：112.3
```

### 加密安全随机数

```typescript
import { secureRandomInt } from '@/skills/random-utils-skill';

// 生成加密安全的随机整数 (适用于抽奖、令牌等)
const secureNum = secureRandomInt(1, 1000000);
```

---

## 2. 随机字符串生成

### 基础字符串

```typescript
import { randomString, randomAlphanumeric, randomHex } from '@/skills/random-utils-skill';

// 生成 16 位随机字符串 (字母数字)
const str = randomString(16); // 例如："aB3dE7fG9hJ2kL5m"

// 自定义字符集
const custom = randomString(10, 'AEIOU'); // 例如："OUIAEAOUIE"

// 字母数字混合
const alnum = randomAlphanumeric(12); // 例如："xK9mP2nQ5vL8"

// 十六进制字符串
const hex = randomHex(8); // 例如："A3F5C2E1"
```

### 密码生成

```typescript
import { randomPassword, randomReadableCode } from '@/skills/random-utils-skill';

// 生成默认密码 (16 位，包含大小写字母和数字)
const password = randomPassword(); // 例如："aK9mP2nQ5vL8xJ3w"

// 自定义密码选项
const strongPassword = randomPassword(20, {
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true, // 包含特殊字符
}); // 例如："aK9@mP2#nQ5$vL8%xJ3w"

// 仅字母密码
const lettersOnly = randomPassword(12, {
  uppercase: true,
  lowercase: true,
  numbers: false,
  symbols: false,
});

// 易读随机码 (排除易混淆字符如 0/O, 1/l/I)
const code = randomReadableCode(8); // 例如："K7M9P2N5"
```

### 加密安全字符串

```typescript
import { secureRandomString } from '@/skills/random-utils-skill';

// 生成加密安全的随机字符串 (适用于 API Key、Token)
const apiKey = secureRandomString(32); // 例如："xK9mP2nQ5vL8xJ3wA7bC4dE6fG9hI2jK"
```

---

## 3. UUID 生成

```typescript
import { uuidv4, secureUuidv4, uuidv1, nanoId, shortId } from '@/skills/random-utils-skill';

// UUID v4 (标准随机版本)
const uuid = uuidv4(); // 例如："550e8400-e29b-41d4-a716-446655440000"

// 加密安全的 UUID v4
const secureUuid = secureUuidv4(); // 例如："7c9e6679-7425-40de-944b-e07fc1f90ae7"

// UUID v1 (基于时间戳)
const timeUuid = uuidv1(); // 例如："67b5c8e4-0000-1000-8000-0123456789ab"

// NanoID (紧凑唯一 ID，适合数据库主键)
const nano = nanoId(); // 例如："V1StGXR8_Z5jdHi6B-myT"
const nanoShort = nanoId(10); // 例如："aO5mN8kL2P"

// 短 ID (适合 URL 分享)
const short = shortId(); // 例如："aB3dE7fG"
const shortCustom = shortId(6); // 例如："xK9mP2"
```

---

## 4. 随机选择

### 从数组中选择

```typescript
import { randomChoice, randomChoices, randomChoicesWithReplacement } from '@/skills/random-utils-skill';

const colors = ['red', 'green', 'blue', 'yellow', 'purple'];

// 随机选择一个元素
const color = randomChoice(colors); // 例如："blue"

// 随机选择多个元素 (不重复)
const selected = randomChoices(colors, 3); // 例如：["green", "purple", "red"]

// 随机选择多个元素 (可重复)
const withReplacement = randomChoicesWithReplacement(colors, 5); 
// 例如：["blue", "blue", "red", "green", "blue"]
```

### 从对象中选择

```typescript
import { randomEntry } from '@/skills/random-utils-skill';

const users = {
  alice: { age: 25, city: 'NYC' },
  bob: { age: 30, city: 'LA' },
  charlie: { age: 35, city: 'SF' },
};

// 随机选择一个键值对
const [key, value] = randomEntry(users)!;
// 例如：["bob", { age: 30, city: 'LA' }]
```

### 加权随机选择

```typescript
import { weightedChoice } from '@/skills/random-utils-skill';

// 抽奖场景：不同奖品有不同中奖概率
const prizes = ['一等奖', '二等奖', '三等奖', '谢谢参与'];
const weights = [1, 5, 20, 74]; // 权重总和 100

const prize = weightedChoice(prizes, weights);
// 一等奖概率 1%, 二等奖 5%, 三等奖 20%, 谢谢参与 74%
```

---

## 5. 洗牌算法

```typescript
import { shuffle, secureShuffle, shuffleInPlace, partialShuffle } from '@/skills/random-utils-skill';

const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// 洗牌 (返回新数组)
const shuffled = shuffle(cards);
// 例如：["7", "K", "3", "A", "9", "Q", "5", "J", "2", "8", "4", "10", "6"]

// 加密安全洗牌 (适用于赌博、抽奖等)
const secureShuffled = secureShuffle(cards);

// 原地洗牌 (修改原数组)
shuffleInPlace(cards);
// cards 现在已被打乱

// 部分洗牌 (只洗前 5 张牌)
const partial = partialShuffle(cards, 5);
```

---

## 6. 随机采样

```typescript
import { sample } from '@/skills/random-utils-skill';

const population = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 随机采样 3 个元素
const sampled = sample(population, 3); // 例如：[7, 2, 9]
```

---

## 7. 实用工具

### 随机颜色

```typescript
import { randomColor, randomColorRgb } from '@/skills/random-utils-skill';

// HEX 格式
const hexColor = randomColor(); // 例如："#FF5733"

// RGB 格式
const rgbColor = randomColorRgb(); // 例如：{ r: 255, g: 87, b: 51 }
```

### 随机日期

```typescript
import { randomDate } from '@/skills/random-utils-skill';

// 生成 1970-01-01 到今天的随机日期
const date1 = randomDate();

// 生成指定范围的随机日期
const start = new Date(2020, 0, 1); // 2020-01-01
const end = new Date(2024, 11, 31); // 2024-12-31
const date2 = randomDate(start, end);
```

### 随机网络信息

```typescript
import { randomIpAddress, randomPort } from '@/skills/random-utils-skill';

// 随机 IP 地址
const ip = randomIpAddress(); // 例如："192.168.45.123"

// 随机端口号 (1024-65535)
const port = randomPort(); // 例如：8432
```

---

## 8. 实际应用场景

### 场景 1: 生成邀请码

```typescript
import { randomReadableCode } from '@/skills/random-utils-skill';

function generateInviteCode(): string {
  // 生成 8 位易读邀请码
  return randomReadableCode(8);
}

// 使用
const inviteCode = generateInviteCode(); // 例如："K7M9P2N5"
```

### 场景 2: 抽奖系统

```typescript
import { secureRandomInt, weightedChoice } from '@/skills/random-utils-skill';

function lotteryDraw(participants: string[]): string {
  // 加密安全随机选择中奖者
  const winnerIndex = secureRandomInt(0, participants.length - 1);
  return participants[winnerIndex];
}

function prizeDraw(): string {
  const prizes = ['特等奖', '一等奖', '二等奖', '三等奖', '参与奖'];
  const weights = [1, 5, 10, 30, 54]; // 概率分布
  return weightedChoice(prizes, weights)!;
}
```

### 场景 3: 测试数据生成

```typescript
import { randomInt, randomString, randomDate, randomEmail } from '@/skills/random-utils-skill';

interface User {
  id: string;
  name: string;
  age: number;
  email: string;
  createdAt: Date;
}

function generateTestUser(): User {
  return {
    id: uuidv4(),
    name: randomString(10),
    age: randomInt(18, 65),
    email: `${randomString(8)}@example.com`,
    createdAt: randomDate(new Date(2020, 0, 1), new Date()),
  };
}

// 生成 100 条测试数据
const testUsers: User[] = Array.from({ length: 100 }, () => generateTestUser());
```

### 场景 4: 随机分组

```typescript
import { shuffle, chunk } from '@/skills/random-utils-skill';

function randomGroup<T>(items: T[], groupSize: number): T[][] {
  return chunk(shuffle(items), groupSize);
}

// 将 30 人随机分成 6 组，每组 5 人
const students = Array.from({ length: 30 }, (_, i) => `Student${i + 1}`);
const groups = randomGroup(students, 5);
```

### 场景 5: API Token 生成

```typescript
import { secureUuidv4, secureRandomString } from '@/skills/random-utils-skill';

function generateApiToken(userId: string): string {
  const uuid = secureUuidv4();
  const timestamp = Date.now().toString(36);
  const random = secureRandomString(16);
  return `${userId}_${timestamp}_${uuid}_${random}`;
}

// 使用
const token = generateApiToken('user_123');
// 例如："user_123_m5k8j2h1_550e8400-e29b-41d4-a716-446655440000_xK9mP2nQ5vL8xJ3w"
```

---

## 完整导入示例

```typescript
import {
  // 随机数
  randomInt,
  randomFloat,
  randomBoolean,
  randomNormal,
  secureRandomInt,
  
  // 随机字符串
  randomString,
  secureRandomString,
  randomAlphanumeric,
  randomHex,
  randomPassword,
  randomReadableCode,
  
  // UUID
  uuidv4,
  secureUuidv4,
  uuidv1,
  nanoId,
  shortId,
  
  // 随机选择
  randomChoice,
  randomChoices,
  weightedChoice,
  
  // 洗牌
  shuffle,
  secureShuffle,
  
  // 工具
  randomColor,
  randomDate,
  randomIpAddress,
  randomPort,
} from '@/skills/random-utils-skill';

// 或使用命名空间
import RandomUtils from '@/skills/random-utils-skill';

const num = RandomUtils.int(1, 100);
const uuid = RandomUtils.uuidv4();
const shuffled = RandomUtils.shuffle([1, 2, 3, 4, 5]);
```

---

## 注意事项

1. **加密安全**: 对于敏感场景 (密码、Token、抽奖),请使用 `secure*` 系列函数
2. **性能**: `shuffle` 会创建新数组，如需原地操作使用 `shuffleInPlace`
3. **范围**: `randomInt` 包含 min 和 max 边界值
4. **空数组**: `randomChoice` 在空数组时返回 `undefined`
5. **权重**: `weightedChoice` 要求权重数组与元素数组长度一致

---

**生成时间:** 2026-03-13  
**版本:** 1.0.0

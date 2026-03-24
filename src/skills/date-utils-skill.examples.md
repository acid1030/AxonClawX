# 日期工具技能 - 使用示例

**技能文件:** `src/skills/date-utils-skill.ts`  
**创建时间:** 2026-03-13  
**作者:** KAEL

---

## 📦 快速开始

### 基础导入

```typescript
import {
  formatDate,
  parseDate,
  addDays,
  addMonths,
  addYears,
  diffInDays,
  getRelativeTime,
  isToday,
  isLeapYear
} from './src/skills/date-utils-skill';
```

---

## 1️⃣ 日期格式化

### 基础格式化

```typescript
const now = new Date();

// 默认格式 (YYYY-MM-DD)
formatDate(now); 
// 输出：'2026-03-13'

// 完整时间
formatDate(now, { pattern: 'YYYY-MM-DD HH:mm:ss' });
// 输出：'2026-03-13 19:33:45'

// 仅时间
formatDate(now, { pattern: 'HH:mm:ss' });
// 输出：'19:33:45'

// 仅日期（斜杠分隔）
formatDate(now, { pattern: 'YYYY/MM/DD' });
// 输出：'2026/03/13'
```

### 多语言支持

```typescript
// 中文星期
formatDate(new Date(), { pattern: 'dddd', locale: 'zh-CN' });
// 输出：'星期五'

// 英文星期
formatDate(new Date(), { pattern: 'dddd', locale: 'en-US' });
// 输出：'Friday'

// 中文月份
formatDate(new Date(), { pattern: 'MMMM YYYY', locale: 'zh-CN' });
// 输出：'三月 2026'

// 英文月份
formatDate(new Date(), { pattern: 'MMMM YYYY', locale: 'en-US' });
// 输出：'March 2026'

// 日文星期
formatDate(new Date(), { pattern: 'ddd', locale: 'ja-JP' });
// 输出：'金'

// 韩文星期
formatDate(new Date(), { pattern: 'ddd', locale: 'ko-KR' });
// 输出：'금'
```

### 时间戳格式化

```typescript
// 毫秒时间戳
formatDate(1710360825000, { pattern: 'YYYY-MM-DD' });
// 输出：'2024-03-13'

// 秒时间戳（自动识别）
formatDate(1710360825, { pattern: 'YYYY-MM-DD HH:mm:ss' });
// 输出：'2024-03-13 19:33:45'
```

### 可用格式模式

```typescript
type DateFormatPattern = 
  | 'YYYY-MM-DD'           // 2026-03-13
  | 'YYYY/MM/DD'           // 2026/03/13
  | 'DD/MM/YYYY'           // 13/03/2026
  | 'MM/DD/YYYY'           // 03/13/2026
  | 'YYYY-MM-DD HH:mm:ss'  // 2026-03-13 19:33:45
  | 'YYYY/MM/DD HH:mm:ss'  // 2026/03/13 19:33:45
  | 'DD/MM/YYYY HH:mm:ss'  // 13/03/2026 19:33:45
  | 'HH:mm:ss'             // 19:33:45
  | 'HH:mm'                // 19:33
  | 'YYYY-MM'              // 2026-03
  | 'YYYY'                 // 2026
  | 'MM-DD'                // 03-13
  | 'MM/DD'                // 03/13
  | 'dddd'                 // 星期五
  | 'ddd'                  // 周五
  | 'MMMM YYYY'            // 三月 2026
  | 'custom';              // 自定义
```

---

## 2️⃣ 日期解析

```typescript
// 标准格式
parseDate('2026-03-13');
// 返回：Date(2026-03-13)

// 斜杠分隔
parseDate('2026/03/13', 'YYYY/MM/DD');
// 返回：Date(2026-03-13)

// 日月年格式
parseDate('13/03/2026', 'DD/MM/YYYY');
// 返回：Date(2026-03-13)

// 美标格式
parseDate('03/13/2026', 'MM/DD/YYYY');
// 返回：Date(2026-03-13)

// 包含时间
parseDate('2026-03-13 19:33:45', 'YYYY-MM-DD HH:mm:ss');
// 返回：Date(2026-03-13 19:33:45)

// 仅年月
parseDate('2026-03', 'YYYY-MM');
// 返回：Date(2026-03-01)

// 仅时间（使用当前日期）
parseDate('19:33:45', 'HH:mm:ss');
// 返回：Date(今天 19:33:45)
```

---

## 3️⃣ 日期计算

### 添加天数

```typescript
const now = new Date('2026-03-13');

// 7 天后
addDays(now, 7);
// 返回：Date(2026-03-20)

// 3 天前
addDays(now, -3);
// 返回：Date(2026-03-10)

// 周末计算（假设今天是周三）
addDays(now, 5); // 下周一
```

### 添加周

```typescript
// 1 周后
addWeeks(now, 1);
// 返回：Date(2026-03-20)

// 4 周后（1 个月）
addWeeks(now, 4);
// 返回：Date(2026-04-10)

// 2 周前
addWeeks(now, -2);
// 返回：Date(2026-02-27)
```

### 添加月

```typescript
// 自动处理月末边界
const jan31 = new Date('2026-01-31');

addMonths(jan31, 1);
// 返回：Date(2026-02-28)  // 2 月没有 31 日，自动调整为月末

addMonths(jan31, 2);
// 返回：Date(2026-03-31)

// 跨年计算
addMonths(new Date('2026-11-15'), 3);
// 返回：Date(2027-02-15)
```

### 添加年

```typescript
// 普通年份
addYears(new Date('2026-03-13'), 1);
// 返回：Date(2027-03-13)

// 闰年处理
addYears(new Date('2024-02-29'), 1);
// 返回：Date(2025-02-28)  // 2025 不是闰年，自动调整

addYears(new Date('2024-02-29'), 4);
// 返回：Date(2028-02-29)  // 2028 是闰年
```

### 添加时分秒

```typescript
const now = new Date('2026-03-13 10:00:00');

// 添加小时
addHours(now, 3);
// 返回：Date(2026-03-13 13:00:00)

// 添加分钟
addMinutes(now, 90);
// 返回：Date(2026-03-13 11:30:00)

// 添加秒
addSeconds(now, 120);
// 返回：Date(2026-03-13 10:02:00)
```

---

## 4️⃣ 日期差异计算

### 天数差异

```typescript
const date1 = new Date('2026-03-20');
const date2 = new Date('2026-03-13');

diffInDays(date1, date2);
// 输出：7

// 负数表示 date1 在 date2 之前
diffInDays(date2, date1);
// 输出：-7
```

### 小时差异

```typescript
const morning = new Date('2026-03-13 09:00:00');
const evening = new Date('2026-03-13 18:30:00');

diffInHours(evening, morning);
// 输出：9  // 向下取整

diffInMinutes(evening, morning);
// 输出：570
```

### 月差异

```typescript
const date1 = new Date('2026-05-13');
const date2 = new Date('2026-03-13');

diffInMonths(date1, date2);
// 输出：2

// 跨年计算
diffInMonths(new Date('2027-03-13'), new Date('2026-03-13'));
// 输出：12
```

### 年差异

```typescript
diffInYears(new Date('2030-01-01'), new Date('2026-01-01'));
// 输出：4
```

---

## 5️⃣ 相对时间

### 基础用法

```typescript
const now = new Date();

// 过去时间
getRelativeTime(addMinutes(now, -5));
// 输出：'5 分钟前'

getRelativeTime(addHours(now, -2));
// 输出：'2 小时前'

getRelativeTime(addDays(now, -3));
// 输出：'3 天前'

// 未来时间
getRelativeTime(addDays(now, 1));
// 输出：'1 天后'

getRelativeTime(addWeeks(now, 2));
// 输出：'2 周后'
```

### 精确模式

```typescript
// 非精确模式（默认）
getRelativeTime(addMinutes(now, -65), { precise: false });
// 输出：'1 小时前'

// 精确模式
getRelativeTime(addMinutes(now, -65), { precise: true });
// 输出：'1 小时前'  // 仍显示小时，但会显示更详细信息
```

### 多语言支持

```typescript
// 中文
getRelativeTime(addHours(now, -3), { locale: 'zh-CN' });
// 输出：'3 小时前'

// 英文
getRelativeTime(addHours(now, -3), { locale: 'en-US' });
// 输出：'3 hours ago'

getRelativeTime(addDays(now, 5), { locale: 'en-US' });
// 输出：'in 5 days'

// 自定义前后缀
getRelativeTime(addDays(now, 3), {
  locale: 'zh-CN',
  futurePrefix: '预计 ',
  pastSuffix: ' 之前'
});
// 输出：'预计 3 天后'
```

### 智能显示

```typescript
// 刚刚（1 分钟内）
getRelativeTime(addSeconds(now, -30));
// 输出：'刚刚'

// 分钟级
getRelativeTime(addMinutes(now, -15));
// 输出：'15 分钟前'

// 小时级
getRelativeTime(addHours(now, -5));
// 输出：'5 小时前'

// 天级
getRelativeTime(addDays(now, -10));
// 输出：'10 天前'

// 周级
getRelativeTime(addWeeks(now, -3));
// 输出：'3 周前'

// 月级
getRelativeTime(addMonths(now, -6));
// 输出：'6 个月前'

// 年级
getRelativeTime(addYears(now, -2));
// 输出：'2 年前'
```

---

## 6️⃣ 特殊判断

### 今天/昨天/明天

```typescript
const today = new Date();
const yesterday = addDays(today, -1);
const tomorrow = addDays(today, 1);

isToday(today);
// 输出：true

isYesterday(yesterday);
// 输出：true

isTomorrow(tomorrow);
// 输出：true

// 错误示例
isToday(yesterday);
// 输出：false
```

### 闰年判断

```typescript
isLeapYear(2024);
// 输出：true  // 闰年

isLeapYear(2023);
// 输出：false

isLeapYear(2000);
// 输出：true  // 能被 400 整除

isLeapYear(1900);
// 输出：false  // 能被 100 整除但不能被 400 整除
```

### 获取天数

```typescript
// 月份天数
getDaysInMonth(2026, 2);  // 2 月
// 输出：28

getDaysInMonth(2024, 2);  // 闰年 2 月
// 输出：29

getDaysInMonth(2026, 1);  // 1 月
// 输出：31

// 年份天数
getDaysInYear(2026);
// 输出：365

getDaysInYear(2024);
// 输出：366
```

---

## 7️⃣ 时间戳工具

### 获取当前时间戳

```typescript
// 毫秒时间戳
now();
// 输出：1710360825000

// 秒时间戳
nowInSeconds();
// 输出：1710360825
```

### 时间戳转换

```typescript
// 毫秒时间戳 → 日期
formatDate(1710360825000, { pattern: 'YYYY-MM-DD HH:mm:ss' });
// 输出：'2024-03-13 19:33:45'

// 秒时间戳 → 日期（自动识别）
formatDate(1710360825, { pattern: 'YYYY-MM-DD HH:mm:ss' });
// 输出：'2024-03-13 19:33:45'
```

---

## 🎯 实际应用场景

### 场景 1: 任务到期提醒

```typescript
function getTaskDeadlineMessage(deadline: Date): string {
  const daysLeft = diffInDays(deadline, new Date());
  
  if (daysLeft < 0) {
    return `⚠️ 已逾期 ${Math.abs(daysLeft)} 天`;
  } else if (daysLeft === 0) {
    return '🔴 今天到期';
  } else if (daysLeft <= 3) {
    return `🟠 ${daysLeft} 天后到期`;
  } else if (daysLeft <= 7) {
    return `🟡 ${daysLeft} 天后到期`;
  } else {
    return `🟢 还有 ${daysLeft} 天`;
  }
}

// 使用
const deadline = addDays(new Date(), 5);
console.log(getTaskDeadlineMessage(deadline));
// 输出：'🟡 5 天后到期'
```

### 场景 2: 用户注册时间显示

```typescript
function formatRegistrationTime(registerDate: Date): string {
  const now = new Date();
  const diff = diffInMonths(now, registerDate);
  
  if (diff < 1) {
    return `新用户 (${getRelativeTime(registerDate)})`;
  } else if (diff < 12) {
    return `${diff}个月用户`;
  } else {
    const years = diffInYears(now, registerDate);
    return `${years}年老用户`;
  }
}

// 使用
formatRegistrationTime(addMonths(new Date(), -6));
// 输出：'新用户 (6 个月前)'

formatRegistrationTime(addYears(new Date(), -3));
// 输出：'3 年老用户'
```

### 场景 3: 生日提醒

```typescript
function getNextBirthday(birthDate: Date): Date {
  const now = new Date();
  let nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  
  // 如果今年生日已过，计算明年的
  if (diffInDays(nextBirthday, now) < 0) {
    nextBirthday = addYears(nextBirthday, 1);
  }
  
  return nextBirthday;
}

function getBirthdayCountdown(birthDate: Date): string {
  const nextBirthday = getNextBirthday(birthDate);
  const daysLeft = diffInDays(nextBirthday, new Date());
  
  if (daysLeft === 0) {
    return '🎂 生日快乐！';
  } else {
    return `🎁 距离生日还有 ${daysLeft} 天`;
  }
}

// 使用
const birthday = new Date('1990-03-20');
console.log(getBirthdayCountdown(birthday));
// 输出：'🎁 距离生日还有 7 天' (假设今天是 3 月 13 日)
```

### 场景 4: 日志时间格式化

```typescript
function formatLogTime(timestamp: number): string {
  const logDate = new Date(timestamp);
  
  if (isToday(logDate)) {
    return `今天 ${formatDate(logDate, { pattern: 'HH:mm' })}`;
  } else if (isYesterday(logDate)) {
    return `昨天 ${formatDate(logDate, { pattern: 'HH:mm' })}`;
  } else {
    return formatDate(logDate, { pattern: 'MM-DD HH:mm' });
  }
}

// 使用
formatLogTime(Date.now() - 2 * 60 * 60 * 1000);  // 2 小时前
// 输出：'今天 17:33'

formatLogTime(Date.now() - 24 * 60 * 60 * 1000);  // 24 小时前
// 输出：'昨天 19:33'

formatLogTime(Date.now() - 7 * 24 * 60 * 60 * 1000);  // 7 天前
// 输出：'03-06 19:33'
```

### 场景 5: 项目进度计算

```typescript
function getProjectProgress(startDate: Date, endDate: Date): {
  percentage: number;
  daysElapsed: number;
  daysRemaining: number;
  status: string;
} {
  const now = new Date();
  const totalDays = diffInDays(endDate, startDate);
  const elapsedDays = diffInDays(now, startDate);
  const remainingDays = diffInDays(endDate, now);
  
  let percentage: number;
  if (totalDays <= 0) {
    percentage = 100;
  } else if (elapsedDays < 0) {
    percentage = 0;
  } else if (elapsedDays > totalDays) {
    percentage = 100;
  } else {
    percentage = Math.round((elapsedDays / totalDays) * 100);
  }
  
  let status: string;
  if (percentage >= 100) {
    status = remainingDays < 0 ? '已逾期' : '已完成';
  } else if (percentage >= 75) {
    status = '收尾阶段';
  } else if (percentage >= 50) {
    status = '进行中';
  } else if (percentage >= 25) {
    status = '起步阶段';
  } else {
    status = '刚开始';
  }
  
  return {
    percentage,
    daysElapsed: Math.max(0, elapsedDays),
    daysRemaining: Math.max(0, remainingDays),
    status
  };
}

// 使用
const start = new Date('2026-01-01');
const end = new Date('2026-06-30');
const progress = getProjectProgress(start, end);
console.log(progress);
// 输出：{ percentage: 40, daysElapsed: 72, daysRemaining: 108, status: '起步阶段' }
```

---

## ⚠️ 注意事项

### 1. 时区处理

当前实现使用本地时区。如需处理特定时区：

```typescript
// 建议使用标准库如 dayjs 或 date-fns-tz
// 或者手动处理时区偏移

function formatDateInTimezone(date: Date, timezone: string): string {
  return date.toLocaleString('zh-CN', { timeZone: timezone });
}

formatDateInTimezone(new Date(), 'Asia/Shanghai');
// 输出：'2026/3/13 19:33:45'
```

### 2. 边界情况

```typescript
// 月末日期加减月
const jan31 = new Date('2026-01-31');
addMonths(jan31, 1);
// 自动调整为 2026-02-28（2 月没有 31 日）

// 闰年 2 月 29 日
const leapDay = new Date('2024-02-29');
addYears(leapDay, 1);
// 自动调整为 2025-02-28
```

### 3. 性能考虑

```typescript
// ✅ 推荐：批量操作时复用 Date 对象
const baseDate = new Date();
const dates = [];
for (let i = 0; i < 100; i++) {
  dates.push(addDays(baseDate, i));
}

// ❌ 不推荐：频繁创建新 Date 对象
const dates = [];
for (let i = 0; i < 100; i++) {
  dates.push(addDays(new Date(), i));
}
```

---

## 📝 测试代码

```typescript
// 运行内置示例
require('./src/skills/date-utils-skill.ts');

// 或使用 ts-node
npx ts-node src/skills/date-utils-skill.ts
```

---

## 📚 相关资源

- **Moment.js**: https://momentjs.com/
- **date-fns**: https://date-fns.org/
- **dayjs**: https://day.js.org/
- **Luxon**: https://moment.github.io/luxon/

---

**最后更新:** 2026-03-13  
**维护者:** KAEL

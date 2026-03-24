# 日期工具技能 - KAEL

**文件路径:** `src/skills/date-utils-skill.ts`  
**创建时间:** 2026-03-13  
**版本:** 1.0.0

---

## 📋 功能概览

### 1. 日期格式化
- ✅ 支持多种预定义格式 (YYYY-MM-DD, YYYY/MM/DD 等)
- ✅ 多语言支持 (中文、英文、日文、韩文)
- ✅ 星期和月份名称本地化
- ✅ 时间戳自动识别 (毫秒/秒)

### 2. 日期计算
- ✅ 添加/减少天数、周、月、年
- ✅ 添加/减少小时、分钟、秒
- ✅ 自动处理月末边界 (如 1 月 31 日 + 1 月 = 2 月 28 日)
- ✅ 闰年处理 (2 月 29 日自动调整)

### 3. 日期差异
- ✅ 计算天数、小时、分钟差异
- ✅ 计算月份、年份差异
- ✅ 支持跨年计算

### 4. 相对时间
- ✅ 智能相对时间描述 ("5 分钟前", "2 小时前", "3 天前")
- ✅ 多语言支持
- ✅ 未来时间支持 ("1 天后", "2 周后")
- ✅ 自定义前后缀

### 5. 特殊判断
- ✅ 判断是否今天/昨天/明天
- ✅ 闰年判断
- ✅ 获取月份/年份天数
- ✅ 时间戳获取

---

## 🚀 快速开始

```typescript
import {
  formatDate,
  addDays,
  getRelativeTime,
  diffInDays
} from './src/skills/date-utils-skill';

// 格式化日期
formatDate(new Date()); 
// '2026-03-13'

// 日期计算
addDays(new Date(), 7);
// 7 天后的日期

// 相对时间
getRelativeTime(new Date(Date.now() - 5 * 60 * 1000));
// '5 分钟前'

// 日期差异
diffInDays(new Date('2026-03-20'), new Date('2026-03-13'));
// 7
```

---

## 📚 API 文档

### 格式化函数

#### `formatDate(date, options?)`
格式化日期为字符串

```typescript
formatDate(new Date(), { 
  pattern: 'YYYY-MM-DD HH:mm:ss',
  locale: 'zh-CN'
});
```

**参数:**
- `date`: Date | number | string - 日期对象、时间戳或日期字符串
- `options.pattern`: 格式化模式 (默认：'YYYY-MM-DD')
- `options.locale`: 语言环境 (默认：'zh-CN')

**可用模式:**
- `YYYY-MM-DD` - 2026-03-13
- `YYYY-MM-DD HH:mm:ss` - 2026-03-13 19:33:45
- `dddd` - 星期五
- `MMMM YYYY` - 三月 2026
- 等等...

---

### 计算函数

#### `addDays(date, amount)`
添加天数

```typescript
addDays(new Date('2026-03-13'), 7);
// Date(2026-03-20)
```

#### `addWeeks(date, amount)`
添加周数

```typescript
addWeeks(new Date('2026-03-13'), 2);
// Date(2026-03-27)
```

#### `addMonths(date, amount)`
添加月数 (自动处理月末边界)

```typescript
addMonths(new Date('2026-01-31'), 1);
// Date(2026-02-28)
```

#### `addYears(date, amount)`
添加年数 (自动处理闰年)

```typescript
addYears(new Date('2024-02-29'), 1);
// Date(2025-02-28)
```

#### `addHours(date, amount)` / `addMinutes()` / `addSeconds()`
添加时/分/秒

---

### 差异函数

#### `diffInDays(date1, date2)`
计算天数差异 (date1 - date2)

```typescript
diffInDays(new Date('2026-03-20'), new Date('2026-03-13'));
// 7
```

#### `diffInHours(date1, date2)`
计算小时差异

#### `diffInMinutes(date1, date2)`
计算分钟差异

#### `diffInMonths(date1, date2)`
计算月份差异

#### `diffInYears(date1, date2)`
计算年份差异

---

### 相对时间函数

#### `getRelativeTime(date, options?)`
获取相对时间描述

```typescript
getRelativeTime(new Date(Date.now() - 5 * 60 * 1000));
// '5 分钟前'

getRelativeTime(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), {
  locale: 'en-US'
});
// 'in 1 day'
```

**参数:**
- `date`: 日期
- `options.locale`: 语言环境
- `options.precise`: 是否精确显示
- `options.futurePrefix`: 未来时间前缀
- `options.pastSuffix`: 过去时间后缀

---

### 解析函数

#### `parseDate(dateString, format?)`
解析日期字符串

```typescript
parseDate('2026-03-13', 'YYYY-MM-DD');
// Date(2026-03-13)

parseDate('13/03/2026', 'DD/MM/YYYY');
// Date(2026-03-13)
```

---

### 判断函数

#### `isToday(date)`
判断是否是今天

#### `isYesterday(date)`
判断是否是昨天

#### `isTomorrow(date)`
判断是否是明天

#### `isLeapYear(year)`
判断是否是闰年

---

### 工具函数

#### `getDaysInMonth(year, month)`
获取指定月份的天数

```typescript
getDaysInMonth(2026, 2);
// 28
```

#### `getDaysInYear(year)`
获取指定年份的天数

```typescript
getDaysInYear(2026);
// 365
```

#### `now()`
获取当前时间戳 (毫秒)

#### `nowInSeconds()`
获取当前时间戳 (秒)

---

## 📖 使用示例

详细使用示例请查看：
- **示例文档:** `src/skills/date-utils-skill.examples.md`
- **运行示例:** `npx ts-node src/skills/date-utils-skill.ts`

---

## ⚡ 运行测试

```bash
# 运行内置示例
npx ts-node src/skills/date-utils-skill.ts

# 或查看示例文档
cat src/skills/date-utils-skill.examples.md
```

---

## 🎯 实际应用场景

### 1. 任务到期提醒
```typescript
const daysLeft = diffInDays(deadline, new Date());
if (daysLeft <= 3) {
  console.log(`⚠️ 任务即将到期 (${getRelativeTime(deadline)})`);
}
```

### 2. 用户注册时间显示
```typescript
function formatRegisterTime(date: Date) {
  if (isToday(date)) return '今天注册';
  return getRelativeTime(date);
}
```

### 3. 日志时间格式化
```typescript
function formatLogTime(timestamp: number) {
  if (isToday(timestamp)) {
    return formatDate(timestamp, { pattern: 'HH:mm' });
  }
  return formatDate(timestamp, { pattern: 'MM-DD HH:mm' });
}
```

### 4. 项目进度计算
```typescript
const totalDays = diffInDays(endDate, startDate);
const elapsedDays = diffInDays(new Date(), startDate);
const percentage = Math.round((elapsedDays / totalDays) * 100);
```

---

## 📝 注意事项

1. **时区处理**: 当前使用本地时区，如需特定时区请使用 `toLocaleString` 的 `timeZone` 选项
2. **月末边界**: `addMonths` 会自动处理月末边界 (如 1 月 31 日 + 1 月 → 2 月 28 日)
3. **闰年处理**: `addYears` 会自动处理闰年 2 月 29 日的情况
4. **时间戳**: 自动识别毫秒 (13 位) 和秒 (10 位) 时间戳

---

## 🔗 相关资源

- **示例文档**: `src/skills/date-utils-skill.examples.md`
- **Moment.js**: https://momentjs.com/
- **date-fns**: https://date-fns.org/
- **dayjs**: https://day.js.org/

---

**维护者:** KAEL  
**最后更新:** 2026-03-13

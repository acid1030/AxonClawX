# 货币工具使用示例 - KAEL

## 导入方式

```typescript
import {
  formatCurrency,
  formatCNY,
  formatUSD,
  formatEUR,
  exchangeCurrency,
  batchExchange,
  getExchangeRate,
  amountToUppercase,
  validateAmount,
  EXCHANGE_RATES,
} from './src/skills/currency-utils-skill';
```

---

## 1. 货币格式化

### 基础用法

```typescript
// 默认人民币格式化
formatCurrency(1234567.89)
// 输出: "¥1,234,567.89"

// 负数格式化
formatCurrency(-1234.56)
// 输出: "-¥1,234.56"

// 使用快速格式化函数
formatCNY(8888.99)
// 输出: "¥8,888.99"

formatUSD(1234.56)
// 输出: "$1,234.56"

formatEUR(999.99)
// 输出: "€999,99"
```

### 自定义选项

```typescript
// 自定义货币符号
formatCurrency(5000, { symbol: 'HK$', locale: 'zh-HK' })
// 输出: "HK$5,000.00"

// 显示货币代码
formatCurrency(10000, { symbol: '$', code: 'USD', showCode: true })
// 输出: "$10,000.00 USD"

// 负数用括号表示 (会计格式)
formatCurrency(-5678.90, { negativeInParentheses: true })
// 输出: "(¥5,678.90)"

// 自定义小数位数
formatCurrency(1000, { decimals: 0 })
// 输出: "¥1,000"

formatCurrency(1000.123456, { decimals: 4 })
// 输出: "¥1,000.1235"

// 不同区域格式
formatCurrency(1234567.89, { locale: 'en-US', symbol: '$' })
// 输出: "$1,234,567.89"

formatCurrency(1234567.89, { locale: 'de-DE', symbol: '€' })
// 输出: "€1.234.567,89"
```

---

## 2. 汇率转换

### 基础转换

```typescript
// 人民币转美元 (默认)
exchangeCurrency(1000, { from: 'CNY', to: 'USD' })
// 输出: 138.12 (基于汇率 7.24)

// 美元转欧元
exchangeCurrency(100, { from: 'USD', to: 'EUR' })
// 输出: 92.00

// 美元转日元
exchangeCurrency(100, { from: 'USD', to: 'JPY' })
// 输出: 15025.00

// 人民币转港币
exchangeCurrency(10000, { from: 'CNY', to: 'HKD' })
// 输出: 10798.34
```

### 详细结果模式

```typescript
// 获取详细转换信息
const result = exchangeCurrency(10000, {
  from: 'CNY',
  to: 'USD',
  verbose: true,
})

console.log(result)
// 输出:
// {
//   originalAmount: 10000,
//   convertedAmount: 1381.22,
//   fromCurrency: 'CNY',
//   toCurrency: 'USD',
//   rate: 0.138122,
//   formatted: '1381.22 USD'
// }
```

### 批量转换

```typescript
// 一次性转换到多种货币
const rates = batchExchange(10000, 'CNY', ['USD', 'EUR', 'GBP', 'JPY', 'HKD'])

console.log(rates)
// 输出:
// {
//   USD: 1381.22,
//   EUR: 1270.72,
//   GBP: 1091.16,
//   JPY: 207534.56,
//   HKD: 10798.34
// }
```

### 获取汇率

```typescript
// 获取 CNY 对 USD 的汇率
const rate = getExchangeRate('CNY', 'USD')
console.log(rate)
// 输出: 0.138122

// 获取 USD 对 JPY 的汇率
const rate2 = getExchangeRate('USD', 'JPY')
console.log(rate2)
// 输出: 150.25

// 获取 EUR 对 GBP 的汇率
const rate3 = getExchangeRate('EUR', 'GBP')
console.log(rate3)
// 输出: 0.858696
```

### 自定义汇率表

```typescript
// 使用自定义汇率 (例如实时获取的汇率)
const customRates = {
  USD: 1.0,
  CNY: 7.20,  // 自定义汇率
  EUR: 0.90,
}

exchangeCurrency(1000, {
  from: 'CNY',
  to: 'USD',
  rates: customRates,
})
// 输出: 138.89 (使用 7.20 的汇率)
```

---

## 3. 大写金额

### 基础用法

```typescript
// 整数金额
amountToUppercase(1234)
// 输出: "壹仟贰佰叁拾肆元整"

// 带小数金额
amountToUppercase(1234.56)
// 输出: "壹仟贰佰叁拾肆元伍角陆分"

// 万元金额
amountToUppercase(10000)
// 输出: "壹万元整"

// 亿元金额
amountToUppercase(100000000)
// 输出: "壹亿元整"
```

### 复杂金额

```typescript
// 含零的金额
amountToUppercase(1001)
// 输出: "壹仟零壹元整"

amountToUppercase(10101)
// 输出: "壹万零壹佰零壹元整"

// 只有角分
amountToUppercase(0.50)
// 输出: "伍角整"

amountToUppercase(0.05)
// 输出: "零元伍分"

// 复杂金额
amountToUppercase(123456789.12)
// 输出: "壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元壹角贰分"
```

### 自定义选项

```typescript
// 添加"人民币"前缀
amountToUppercase(1234.56, { withPrefix: true })
// 输出: "人民币壹仟贰佰叁拾肆元伍角陆分"

// 不添加"整"后缀
amountToUppercase(1000, { withSuffix: false })
// 输出: "壹仟元"

// 不显示角分
amountToUppercase(1234.56, { showDecimals: false })
// 输出: "壹仟贰佰叁拾肆元整"

// 美元大写
amountToUppercase(1234.56, { currency: 'USD' })
// 输出: "壹仟贰佰叁拾肆美元伍角陆分"

// 欧元大写
amountToUppercase(999.99, { currency: 'EUR', withPrefix: true })
// 输出: "欧元玖佰玖拾玖欧元玖角玖分"
```

### 实际应用场景

```typescript
// 发票金额大写
const invoiceAmount = 88888.88
const invoiceUppercase = amountToUppercase(invoiceAmount, {
  withPrefix: true,
  withSuffix: true,
})
console.log(invoiceUppercase)
// 输出: "人民币捌万捌仟捌佰捌拾捌元捌角捌分"

// 合同金额
const contractAmount = 1000000
const contractUppercase = amountToUppercase(contractAmount, {
  withPrefix: true,
})
console.log(contractUppercase)
// 输出: "人民币壹佰万元整"
```

---

## 4. 金额验证

```typescript
// 基础验证
validateAmount(100.50)
// 输出: { valid: true, normalized: 100.5 }

// 验证负数 (不允许)
validateAmount(-100)
// 输出: { valid: false, error: "金额不能为负数" }

// 验证负数 (允许)
validateAmount(-100, { allowNegative: true })
// 输出: { valid: true, normalized: -100 }

// 范围验证
validateAmount(1000001, { max: 1000000 })
// 输出: { valid: false, error: "金额不能大于 1000000" }

validateAmount(50, { min: 100 })
// 输出: { valid: false, error: "金额不能小于 100" }

// 整数验证
validateAmount(100.50, { allowDecimals: false })
// 输出: { valid: false, error: "金额不能包含小数" }

// 完整验证
validateAmount(500, {
  min: 100,
  max: 1000,
  allowDecimals: true,
  allowNegative: false,
})
// 输出: { valid: true, normalized: 500 }
```

---

## 5. 综合示例

### 电商订单处理

```typescript
// 订单金额处理
const orderAmount = 1234.56

// 1. 格式化显示
const displayPrice = formatCNY(orderAmount)
console.log(`订单金额：${displayPrice}`)
// 输出: "订单金额：¥1,234.56"

// 2. 转换为美元 (国际用户)
const usdPrice = exchangeCurrency(orderAmount, {
  from: 'CNY',
  to: 'USD',
  verbose: true,
}) as ExchangeResult
console.log(`USD Price: ${usdPrice.formatted}`)
// 输出: "USD Price: 170.52 USD"

// 3. 生成发票大写金额
const invoiceAmount = amountToUppercase(orderAmount, {
  withPrefix: true,
})
console.log(`大写金额：${invoiceAmount}`)
// 输出: "大写金额：人民币壹仟贰佰叁拾肆元伍角陆分"

// 4. 验证金额有效性
const validation = validateAmount(orderAmount, {
  min: 0,
  max: 1000000,
})
if (!validation.valid) {
  console.error(`金额验证失败：${validation.error}`)
}
```

### 财务报表生成

```typescript
// 批量格式化财务数据
const financialData = [
  { item: '营业收入', amount: 12345678.90 },
  { item: '营业成本', amount: -8765432.10 },
  { item: '净利润', amount: 3580246.80 },
]

for (const data of financialData) {
  const formatted = formatCurrency(data.amount, {
    negativeInParentheses: data.amount < 0,
    showCode: true,
    code: 'CNY',
  })
  console.log(`${data.item}: ${formatted}`)
}

// 输出:
// 营业收入: ¥12,345,678.90 CNY
// 营业成本: (¥8,765,432.10) CNY
// 净利润: ¥3,580,246.80 CNY
```

### 跨境支付

```typescript
// 跨境汇款
const transferAmount = 50000 // CNY

// 1. 验证金额
const validation = validateAmount(transferAmount, {
  min: 1000,
  max: 500000,
})
if (!validation.valid) {
  throw new Error(validation.error)
}

// 2. 批量查询汇率
const rates = batchExchange(transferAmount, 'CNY', [
  'USD',
  'EUR',
  'GBP',
  'JPY',
])
console.log('汇率查询结果:', rates)

// 3. 执行转换 (假设汇往美国)
const usdAmount = exchangeCurrency(transferAmount, {
  from: 'CNY',
  to: 'USD',
  decimals: 2,
})
console.log(`汇款金额：${formatUSD(usdAmount)}`)

// 4. 生成中文大写凭证
const voucherAmount = amountToUppercase(transferAmount, {
  withPrefix: true,
})
console.log(`大写凭证：${voucherAmount}`)
```

---

## 6. 支持货币列表

内置支持以下货币的汇率转换：

| 货币代码 | 货币名称 | 符号 |
|---------|---------|------|
| USD | 美元 | $ |
| CNY | 人民币 | ¥ |
| EUR | 欧元 | € |
| GBP | 英镑 | £ |
| JPY | 日元 | ¥ |
| HKD | 港币 | HK$ |
| KRW | 韩元 | ₩ |
| SGD | 新加坡元 | S$ |
| AUD | 澳元 | A$ |
| CAD | 加拿大元 | C$ |
| CHF | 瑞士法郎 | CHF |
| INR | 印度卢比 | ₹ |
| RUB | 俄罗斯卢布 | ₽ |
| BRL | 巴西雷亚尔 | R$ |
| MXN | 墨西哥比索 | $ |
| ZAR | 南非兰特 | R |
| TRY | 土耳其里拉 | ₺ |
| SEK | 瑞典克朗 | kr |
| NOK | 挪威克朗 | kr |
| DKK | 丹麦克朗 | kr |
| PLN | 波兰兹罗提 | zł |
| THB | 泰铢 | ฿ |
| MYR | 马来西亚林吉特 | RM |
| IDR | 印度尼西亚盾 | Rp |
| PHP | 菲律宾比索 | ₱ |
| VND | 越南盾 | ₫ |
| NZD | 新西兰元 | NZ$ |
| AED | 阿联酋迪拉姆 | د.إ |
| SAR | 沙特里亚尔 | ﷼ |
| ILS | 以色列新谢克尔 | ₪ |

---

## 注意事项

1. **汇率更新**: 内置汇率为静态数据，实际生产环境应从 API 获取实时汇率
2. **精度处理**: 所有金额计算已处理浮点数精度问题
3. **大写规范**: 中文大写遵循财务票据标准规范
4. **区域设置**: 使用 `Intl.NumberFormat` 确保符合各区域格式习惯
5. **错误处理**: 所有函数都包含输入验证和错误抛出

---

**版本**: 1.0.0  
**作者**: KAEL  
**创建时间**: 2026-03-13

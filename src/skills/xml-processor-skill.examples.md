# XML 处理技能使用示例

**技能文件:** `src/skills/xml-processor-skill.ts`  
**版本:** 1.0.0  
**作者:** Axon

---

## 📦 安装依赖

```bash
npm install xmldom xpath
# 或
yarn add xmldom xpath
# 或
pnpm add xmldom xpath
```

---

## 🚀 快速开始

### 1. XML 解析为 JSON

```typescript
import { xmlToJson, XMLParser } from './xml-processor-skill';

// ============== 方法一：便捷函数 ==============
const xml = `
  <user id="123">
    <name>Axon</name>
    <age>25</age>
    <email>axon@example.com</email>
    <roles>
      <role>admin</role>
      <role>developer</role>
    </roles>
  </user>
`;

const jsonData = xmlToJson(xml);
console.log(jsonData);
// 输出:
// {
//   user: {
//     '@attrs': { id: 123 },
//     name: 'Axon',
//     age: 25,
//     email: 'axon@example.com',
//     roles: {
//       role: ['admin', 'developer']
//     }
//   }
// }

// ============== 方法二：使用类 (可配置) ==============
const parser = new XMLParser({
  attrPrefix: '@',           // 属性前缀
  textKey: '#text',          // 文本节点键名
  ignoreEmptyText: true,     // 忽略空文本节点
  attrsKey: '@attrs'         // 属性集合键名
});

const result = parser.parse(xml);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### 2. JSON 转 XML

```typescript
import { jsonToXml, XMLGenerator } from './xml-processor-skill';

// ============== 方法一：便捷函数 ==============
const data = {
  user: {
    '@attrs': { id: 123 },
    name: 'Axon',
    age: 25,
    email: 'axon@example.com',
    roles: {
      role: ['admin', 'developer']
    }
  }
};

const xmlString = jsonToXml(data, 'root', {
  indent: '  ',        // 缩进
  xmlDecl: true,       // 包含 XML 声明
  attrPrefix: '@',
  textKey: '#text',
  attrsKey: '@attrs'
});

console.log(xmlString);
// 输出:
// <?xml version="1.0" encoding="UTF-8"?>
// <root>
//   <user id="123">
//     <name>Axon</name>
//     <age>25</age>
//     <email>axon@example.com</email>
//     <roles>
//       <role>admin</role>
//       <role>developer</role>
//     </roles>
//   </user>
// </root>

// ============== 方法二：使用类 ==============
const generator = new XMLGenerator({
  indent: '    ',      // 4 空格缩进
  xmlDecl: false,      // 不包含 XML 声明
  attrPrefix: '@',
  textKey: '#text',
  attrsKey: '@attrs'
});

const result = generator.generate(data, 'catalog');
if (result.success) {
  console.log(result.xml);
} else {
  console.error(result.error);
}
```

### 3. XPath 查询

```typescript
import { xpathQuery, xpathQueryOne, XPathQuery } from './xml-processor-skill';

const xml = `
  <library>
    <book category="fiction">
      <title>The Great Gatsby</title>
      <author>F. Scott Fitzgerald</author>
      <year>1925</year>
      <price>10.99</price>
    </book>
    <book category="non-fiction">
      <title>Sapiens</title>
      <author>Yuval Noah Harari</author>
      <year>2011</year>
      <price>18.99</price>
    </book>
    <book category="fiction">
      <title>1984</title>
      <author>George Orwell</author>
      <year>1949</year>
      <price>12.99</price>
    </book>
  </library>
`;

// ============== 方法一：便捷函数 ==============

// 查询所有书籍
const allBooks = xpathQuery(xml, '//book');
console.log(allBooks); // 返回所有 book 节点

// 查询特定类别的书籍
const fictionBooks = xpathQuery(xml, '//book[@category="fiction"]');
console.log(fictionBooks); // 返回 fiction 类别的书籍

// 查询所有书名
const titles = xpathQuery(xml, '//book/title/text()');
console.log(titles); // ['The Great Gatsby', 'Sapiens', '1984']

// 查询第一本书
const firstBook = xpathQueryOne(xml, '//book[1]');
console.log(firstBook);

// 查询价格大于 15 的书籍
const expensiveBooks = xpathQuery(xml, '//book[price>15]');
console.log(expensiveBooks); // 返回 Sapiens

// ============== 方法二：使用类 ==============
const query = new XPathQuery(xml);

// 执行查询
const result = query.query('//book[year>1950]');
if (result.success) {
  console.log(result.nodes); // 返回 1950 年后的书籍
} else {
  console.error(result.error);
}

// 查询单个节点
const book = query.queryOne('//book[title="1984"]');
console.log(book);
```

---

## 🎯 实际应用场景

### 场景 1: 解析 RSS Feed

```typescript
import { xmlToJson, xpathQuery } from './xml-processor-skill';

const rssFeed = `
  <?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Tech News</title>
      <link>https://technews.example.com</link>
      <item>
        <title>AI Breakthrough in 2024</title>
        <link>https://technews.example.com/ai-2024</link>
        <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Quantum Computing Progress</title>
        <link>https://technews.example.com/quantum</link>
        <pubDate>Tue, 02 Jan 2024 00:00:00 GMT</pubDate>
      </item>
    </channel>
  </rss>
`;

// 解析为 JSON
const rssData = xmlToJson(rssFeed);
console.log(rssData.rss.channel.title); // "Tech News"

// 使用 XPath 提取所有文章标题
const titles = xpathQuery(rssFeed, '//item/title/text()');
console.log(titles); // ['AI Breakthrough in 2024', 'Quantum Computing Progress']
```

### 场景 2: 生成 SOAP 请求

```typescript
import { jsonToXml } from './xml-processor-skill';

const soapRequest = {
  'soap:Envelope': {
    '@attrs': {
      'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope',
      'xmlns:m': 'http://www.example.com/stock'
    },
    'soap:Header': {},
    'soap:Body': {
      'm:GetStockPrice': {
        'm:StockName': 'AAPL'
      }
    }
  }
};

const xml = jsonToXml(soapRequest, '', {
  xmlDecl: true,
  indent: '  '
});

console.log(xml);
// 输出符合 SOAP 规范的 XML 请求
```

### 场景 3: 配置文件转换

```typescript
import { xmlToJson, jsonToXml } from './xml-processor-skill';
import * as fs from 'fs';

// 读取 XML 配置文件
const xmlConfig = fs.readFileSync('config.xml', 'utf-8');

// 转换为 JSON 便于操作
const config = xmlToJson(xmlConfig);

// 修改配置
config.database.host = 'new-host.example.com';
config.database.port = 5432;

// 写回 XML
const newXml = jsonToXml(config, 'configuration');
fs.writeFileSync('config.updated.xml', newXml);
```

### 场景 4: 数据验证与提取

```typescript
import { XPathQuery } from './xml-processor-skill';

const invoice = `
  <invoice id="INV-2024-001">
    <customer>
      <name>Acme Corp</name>
      <taxId>123456789</taxId>
    </customer>
    <items>
      <item>
        <description>Widget A</description>
        <quantity>10</quantity>
        <unitPrice>25.00</unitPrice>
      </item>
      <item>
        <description>Widget B</description>
        <quantity>5</quantity>
        <unitPrice>35.00</unitPrice>
      </item>
    </items>
    <total>425.00</total>
  </invoice>
`;

const query = new XPathQuery(invoice);

// 验证发票 ID
const invoiceId = query.queryOne('/invoice/@id');
console.log('Invoice ID:', invoiceId); // INV-2024-001

// 提取所有商品描述
const descriptions = query.query('//item/description/text()');
console.log('Items:', descriptions); // ['Widget A', 'Widget B']

// 计算总金额 (XPath 表达式)
const totalNode = query.queryOne('/invoice/total/text()');
console.log('Total:', totalNode); // 425.00
```

---

## ⚙️ 高级配置

### 自定义解析选项

```typescript
import { XMLParser } from './xml-processor-skill';

// 处理带命名空间的 XML
const xmlWithNamespace = `
  <root xmlns:ns="http://example.com/ns">
    <ns:item id="1">Value 1</ns:item>
    <ns:item id="2">Value 2</ns:item>
  </root>
`;

const parser = new XMLParser({
  attrPrefix: '_',      // 自定义属性前缀
  textKey: '$text',     // 自定义文本键
  ignoreEmptyText: false, // 保留空文本
  attrsKey: '$attrs'    // 自定义属性集合键
});

const result = parser.parse(xmlWithNamespace);
console.log(result);
```

### 处理复杂嵌套结构

```typescript
import { xmlToJson, jsonToXml } from './xml-processor-skill';

const complexXml = `
  <organization>
    <department name="Engineering">
      <team name="Backend">
        <developer id="1">
          <name>Axon</name>
          <skills>
            <skill>TypeScript</skill>
            <skill>Node.js</skill>
            <skill>Rust</skill>
          </skills>
        </developer>
      </team>
    </department>
  </organization>
`;

// 解析
const org = xmlToJson(complexXml);

// 访问嵌套数据
console.log(org.organization.department.team.developer.name); // Axon
console.log(org.organization.department.team.developer.skills.skill); 
// ['TypeScript', 'Node.js', 'Rust']

// 修改后重新生成
org.organization.department.team.developer.skills.skill.push('Python');
const newXml = jsonToXml(org);
```

---

## 🐛 错误处理

```typescript
import { XMLParser, XMLGenerator, XPathQuery } from './xml-processor-skill';

// XML 解析错误处理
const parser = new XMLParser();
const invalidXml = '<root><unclosed>';

const result = parser.parse(invalidXml);
if (!result.success) {
  console.error('解析失败:', result.error);
  // 处理错误...
}

// XML 生成错误处理
const generator = new XMLGenerator();
const circularData: any = {};
circularData.self = circularData; // 循环引用

const genResult = generator.generate(circularData);
if (!genResult.success) {
  console.error('生成失败:', genResult.error);
}

// XPath 查询错误处理
const query = new XPathQuery('<root><item>test</item></root>');
const queryResult = query.query('invalid[xpath');
if (!queryResult.success) {
  console.error('查询失败:', queryResult.error);
}
```

---

## 📊 API 参考

### XMLParser

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `parse(xmlString)` | `xmlString: string` | `XMLParseResult` | 解析 XML 为 JSON |

### XMLGenerator

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `generate(data, rootName)` | `data: any`, `rootName?: string` | `XMLGenerateResult` | 从 JSON 生成 XML |

### XPathQuery

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `query(xpath)` | `xpath: string` | `XPathQueryResult` | 执行 XPath 查询 |
| `queryOne(xpath)` | `xpath: string` | `any` | 查询单个节点 |

### 便捷函数

| 函数 | 描述 |
|------|------|
| `xmlToJson(xml, config?)` | XML 转 JSON |
| `jsonToXml(data, rootName?, config?)` | JSON 转 XML |
| `xpathQuery(xml, xpath)` | XPath 查询 |
| `xpathQueryOne(xml, xpath)` | XPath 查询单个节点 |

---

## 🎓 最佳实践

1. **始终检查 success 标志** - 解析/生成/查询都可能失败
2. **使用便捷函数处理简单场景** - 类提供更细粒度的控制
3. **注意 XML 命名空间** - 命名会影响解析结果
4. **处理大文件时分块** - 避免内存溢出
5. **验证输入数据** - 防止 XXE 等安全漏洞

---

**创建时间:** 2026-03-13  
**最后更新:** 2026-03-13  
**维护者:** Axon

# XML Parser Skill - 使用示例

## 快速开始

```typescript
import { parseXml, xpathQuery, generateXml, extractValue, objectToXml } from './xml-parser-skill';
```

---

## 1. XML 解析示例

### 基础解析

```typescript
const xml = `
  <?xml version="1.0" encoding="UTF-8"?>
  <library>
    <book id="1" category="fiction">
      <title>The Great Gatsby</title>
      <author>F. Scott Fitzgerald</author>
      <year>1925</year>
    </book>
    <book id="2" category="non-fiction">
      <title>A Brief History of Time</title>
      <author>Stephen Hawking</author>
      <year>1988</year>
    </book>
  </library>
`;

const parsed = parseXml(xml);
console.log(parsed);
// {
//   tagName: 'library',
//   children: [
//     { tagName: 'book', attributes: { id: '1', category: 'fiction' }, ... },
//     { tagName: 'book', attributes: { id: '2', category: 'non-fiction' }, ... }
//   ]
// }
```

### 解析选项

```typescript
// 保留空白文本节点
const parsed = parseXml(xml, { preserveWhitespace: true });

// 不解析属性
const parsed = parseXml(xml, { parseAttributes: false });
```

---

## 2. XPath 查询示例

### 基础查询

```typescript
const xml = `
  <root>
    <item id="1">First</item>
    <item id="2">Second</item>
    <item id="3">Third</item>
  </root>
`;

const root = parseXml(xml);

// 查询所有 item 节点
const result = xpathQuery(root, '//item');
console.log(result.values); // ['First', 'Second', 'Third']

// 查询特定 id 的 item
const result = xpathQuery(root, '//item[@id="2"]');
console.log(result.values); // ['Second']
```

### 属性选择器

```typescript
// 查询具有特定属性的节点
const result = xpathQuery(root, '//item[@category="fiction"]');

// 查询具有任意 id 属性的节点
const result = xpathQuery(root, '//item[@id]');
```

### 路径查询

```typescript
// 绝对路径
const result = xpathQuery(root, '/library/book/title');

// 相对路径
const result = xpathQuery(root, 'book/author');

// 通配符
const result = xpathQuery(root, '//*'); // 所有元素
const result = xpathQuery(root, '/library/*'); // library 的直接子元素
```

### 文本内容查询

```typescript
const result = xpathQuery(root, "//book[title='The Great Gatsby']");
console.log(result.values);
```

---

## 3. XML 生成示例

### 基础生成

```typescript
import { createXmlNode, generateXml } from './xml-parser-skill';

const book = createXmlNode(
  'book',
  { id: '1', category: 'fiction' },
  [
    createXmlNode('title', {}, [], 'The Great Gatsby'),
    createXmlNode('author', {}, [], 'F. Scott Fitzgerald'),
    createXmlNode('year', {}, [], '1925')
  ]
);

const xml = generateXml(book, { pretty: true, indent: 2 });
console.log(xml);
// <?xml version="1.0" encoding="UTF-8"?>
// <book id="1" category="fiction">
//   <title>The Great Gatsby</title>
//   <author>F. Scott Fitzgerald</author>
//   <year>1925</year>
// </book>
```

### 生成选项

```typescript
// 不添加 XML 声明
const xml = generateXml(node, { xmlDeclaration: false });

// 自定义缩进
const xml = generateXml(node, { indent: 4, pretty: true });

// 单行输出
const xml = generateXml(node, { pretty: false });
```

---

## 4. 便捷函数示例

### 提取单个值

```typescript
const xml = `
  <user>
    <name>John Doe</name>
    <email>john@example.com</email>
  </user>
`;

const name = extractValue(xml, '/user/name');
console.log(name); // 'John Doe'

const email = extractValue(xml, '//email');
console.log(email); // 'john@example.com'
```

### 提取所有值

```typescript
const xml = `
  <items>
    <item>Apple</item>
    <item>Banana</item>
    <item>Orange</item>
  </items>
`;

const allItems = extractAllValues(xml, '//item');
console.log(allItems); // ['Apple', 'Banana', 'Orange']
```

### 对象转 XML

```typescript
const user = {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
  address: {
    street: '123 Main St',
    city: 'New York',
    zip: '10001'
  }
};

const xml = objectToXml(user, 'user');
console.log(xml);
// <?xml version="1.0" encoding="UTF-8"?>
// <user>
//   <name>John Doe</name>
//   <age>30</age>
//   <email>john@example.com</email>
//   <address>
//     <street>123 Main St</street>
//     <city>New York</city>
//     <zip>10001</zip>
//   </address>
// </user>
```

---

## 5. 实际应用场景

### 场景 1: 解析 RSS Feed

```typescript
const rssXml = `
  <?xml version="1.0"?>
  <rss version="2.0">
    <channel>
      <title>My Blog</title>
      <item>
        <title>Post 1</title>
        <link>https://example.com/post1</link>
      </item>
      <item>
        <title>Post 2</title>
        <link>https://example.com/post2</link>
      </item>
    </channel>
  </rss>
`;

// 提取所有文章标题
const titles = extractAllValues(rssXml, '//item/title');

// 提取所有文章链接
const links = extractAllValues(rssXml, '//item/link');
```

### 场景 2: 解析 SOAP 响应

```typescript
const soapXml = `
  <?xml version="1.0"?>
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <GetUserResponse>
        <UserId>12345</UserId>
        <UserName>John Doe</UserName>
        <Email>john@example.com</Email>
      </GetUserResponse>
    </soap:Body>
  </soap:Envelope>
`;

const userId = extractValue(soapXml, '//UserId');
const userName = extractValue(soapXml, '//UserName');
const email = extractValue(soapXml, '//Email');
```

### 场景 3: 配置文件处理

```typescript
const configXml = `
  <?xml version="1.0"?>
  <configuration>
    <database>
      <host>localhost</host>
      <port>5432</port>
      <name>mydb</name>
    </database>
    <cache>
      <enabled>true</enabled>
      <ttl>3600</ttl>
    </cache>
  </configuration>
`;

const dbHost = extractValue(configXml, '//database/host');
const dbPort = extractValue(configXml, '//database/port');
const cacheEnabled = extractValue(configXml, '//cache/enabled');
```

### 场景 4: 生成 API 请求

```typescript
const soapRequest = {
  Envelope: {
    '@xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
    Body: {
      GetUserRequest: {
        UserId: '12345',
        IncludeDetails: 'true'
      }
    }
  }
};

// 注意：需要扩展 objectToXml 以支持命名空间属性
const xml = objectToXml(soapRequest, 'soap:Envelope');
```

---

## 6. 错误处理

```typescript
try {
  const invalidXml = '<root><unclosed>';
  const parsed = parseXml(invalidXml);
} catch (error) {
  console.error('XML 解析失败:', error.message);
}

// 处理空结果
const result = xpathQuery(root, '//nonexistent');
if (result.values.length === 0) {
  console.log('未找到匹配的节点');
}
```

---

## 7. 性能提示

```typescript
// ✅ 推荐：直接提取值
const value = extractValue(xml, '//target');

// ❌ 避免：完整解析后再查询
const root = parseXml(xml);
const result = xpathQuery(root, '//target');
const value = result.values[0];

// ✅ 推荐：缓存解析结果
const root = parseXml(largeXml);
const values1 = xpathQuery(root, '//path1');
const values2 = xpathQuery(root, '//path2');
const values3 = xpathQuery(root, '//path3');
```

---

## API 参考

### parseXml(xmlString, options?)
- **参数:**
  - `xmlString` (string): XML 字符串
  - `options` (XmlParseOptions): 解析选项
- **返回:** XmlNode

### xpathQuery(root, xpath)
- **参数:**
  - `root` (XmlNode): XML 根节点
  - `xpath` (string): XPath 表达式
- **返回:** XPathResult { nodes: XmlNode[], values: string[] }

### generateXml(node, options?)
- **参数:**
  - `node` (XmlNode): XML 节点
  - `options` (XmlGenerateOptions): 生成选项
- **返回:** string

### extractValue(xmlString, xpath)
- **参数:**
  - `xmlString` (string): XML 字符串
  - `xpath` (string): XPath 表达式
- **返回:** string | null

### extractAllValues(xmlString, xpath)
- **参数:**
  - `xmlString` (string): XML 字符串
  - `xpath` (string): XPath 表达式
- **返回:** string[]

### createXmlNode(tagName, attributes?, children?, text?)
- **参数:**
  - `tagName` (string): 标签名
  - `attributes` (Record<string, string>): 属性
  - `children` (XmlNode[]): 子节点
  - `text` (string): 文本内容
- **返回:** XmlNode

### objectToXml(obj, rootTagName?)
- **参数:**
  - `obj` (Record<string, any>): JavaScript 对象
  - `rootTagName` (string): 根标签名
- **返回:** string

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** ACE (Subagent)

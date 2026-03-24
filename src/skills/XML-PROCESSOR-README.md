# XML Processor Skill - ACE

**XML 解析与生成技能** | Axon Content Engine (ACE)

---

## 📦 文件清单

| 文件 | 描述 | 大小 |
|------|------|------|
| `xml-processor-skill.ts` | 核心技能实现 | ~12KB |
| `xml-processor-skill.examples.md` | 使用示例文档 | ~10KB |
| `xml-processor-skill.test.ts` | 单元测试 | ~8KB |

---

## 🚀 核心功能

### 1. XML 解析为 JSON
```typescript
import { xmlToJson } from './xml-processor-skill';

const json = xmlToJson('<user id="1"><name>Axon</name></user>');
// { user: { '@attrs': { id: 1 }, name: 'Axon' } }
```

### 2. JSON 转 XML
```typescript
import { jsonToXml } from './xml-processor-skill';

const xml = jsonToXml({ user: { '@attrs': { id: 1 }, name: 'Axon' } });
// <?xml version="1.0"?><root><user id="1"><name>Axon</name></user></root>
```

### 3. XPath 查询
```typescript
import { xpathQuery } from './xml-processor-skill';

const nodes = xpathQuery(xml, '//user[@id="1"]/name/text()');
// ['Axon']
```

---

## 📚 API 参考

### 类

| 类 | 描述 |
|---|---|
| `XMLParser` | XML 解析器 (支持配置) |
| `XMLGenerator` | XML 生成器 (支持配置) |
| `XPathQuery` | XPath 查询器 |

### 便捷函数

| 函数 | 描述 |
|---|---|
| `xmlToJson(xml, config?)` | XML → JSON |
| `jsonToXml(data, rootName?, config?)` | JSON → XML |
| `xpathQuery(xml, xpath)` | XPath 查询 (多结果) |
| `xpathQueryOne(xml, xpath)` | XPath 查询 (单结果) |

---

## 🔧 安装依赖

```bash
npm install xmldom xpath
```

---

## 📖 详细文档

查看 [`xml-processor-skill.examples.md`](./xml-processor-skill.examples.md) 获取完整使用示例。

---

## ✅ 测试

```bash
npm test -- xml-processor-skill.test.ts
```

---

**版本:** 1.0.0  
**作者:** Axon  
**创建时间:** 2026-03-13

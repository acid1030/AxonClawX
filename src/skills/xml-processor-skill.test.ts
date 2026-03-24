/**
 * XML 处理技能测试
 */

import {
  xmlToJson,
  jsonToXml,
  xpathQuery,
  xpathQueryOne,
  XMLParser,
  XMLGenerator,
  XPathQuery
} from './xml-processor-skill';

describe('XMLProcessor Skill', () => {
  describe('XML 解析为 JSON', () => {
    it('应该解析简单 XML', () => {
      const xml = '<user><name>Axon</name><age>25</age></user>';
      const result = xmlToJson(xml);
      
      expect(result.user.name).toBe('Axon');
      expect(result.user.age).toBe(25);
    });

    it('应该解析带属性的 XML', () => {
      const xml = '<user id="123" active="true"><name>Axon</name></user>';
      const result = xmlToJson(xml);
      
      expect(result.user['@attrs'].id).toBe(123);
      expect(result.user['@attrs'].active).toBe(true);
      expect(result.user.name).toBe('Axon');
    });

    it('应该解析嵌套 XML', () => {
      const xml = `
        <library>
          <book>
            <title>1984</title>
            <author>George Orwell</author>
          </book>
        </library>
      `;
      const result = xmlToJson(xml);
      
      expect(result.library.book.title).toBe('1984');
      expect(result.library.book.author).toBe('George Orwell');
    });

    it('应该处理数组元素', () => {
      const xml = `
        <users>
          <user>Axon</user>
          <user>Kael</user>
          <user>Nova</user>
        </users>
      `;
      const result = xmlToJson(xml);
      
      expect(Array.isArray(result.users.user)).toBe(true);
      expect(result.users.user).toHaveLength(3);
      expect(result.users.user[0]).toBe('Axon');
    });

    it('应该处理解析错误', () => {
      const xml = '<root><unclosed>';
      const result = new XMLParser().parse(xml);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('JSON 转 XML', () => {
    it('应该生成简单 XML', () => {
      const data = {
        user: {
          name: 'Axon',
          age: 25
        }
      };
      const result = jsonToXml(data, 'root');
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<root>');
      expect(result).toContain('<user>');
      expect(result).toContain('<name>Axon</name>');
      expect(result).toContain('<age>25</age>');
    });

    it('应该生成带属性的 XML', () => {
      const data = {
        user: {
          '@attrs': { id: 123 },
          name: 'Axon'
        }
      };
      const result = jsonToXml(data, 'root');
      
      expect(result).toContain('<user id="123">');
      expect(result).toContain('<name>Axon</name>');
    });

    it('应该生成数组元素', () => {
      const data = {
        users: {
          user: ['Axon', 'Kael', 'Nova']
        }
      };
      const result = jsonToXml(data, 'root');
      
      expect(result).toContain('<user>Axon</user>');
      expect(result).toContain('<user>Kael</user>');
      expect(result).toContain('<user>Nova</user>');
    });

    it('应该正确转义特殊字符', () => {
      const data = {
        message: {
          text: 'Tom & Jerry <cats> "friends"'
        }
      };
      const result = jsonToXml(data, 'root');
      
      expect(result).toContain('Tom &amp; Jerry');
      expect(result).toContain('&lt;cats&gt;');
      expect(result).toContain('&quot;friends&quot;');
    });

    it('应该支持不包含 XML 声明', () => {
      const data = { root: { test: 'value' } };
      const result = jsonToXml(data, 'root', { xmlDecl: false });
      
      expect(result).not.toContain('<?xml');
      expect(result).toContain('<root>');
    });
  });

  describe('XPath 查询', () => {
    const xml = `
      <library>
        <book category="fiction">
          <title>1984</title>
          <author>George Orwell</author>
          <year>1949</year>
          <price>12.99</price>
        </book>
        <book category="non-fiction">
          <title>Sapiens</title>
          <author>Yuval Harari</author>
          <year>2011</year>
          <price>18.99</price>
        </book>
        <book category="fiction">
          <title>The Great Gatsby</title>
          <author>F. Fitzgerald</author>
          <year>1925</year>
          <price>10.99</price>
        </book>
      </library>
    `;

    it('应该查询所有节点', () => {
      const result = xpathQuery(xml, '//book');
      expect(result).toHaveLength(3);
    });

    it('应该按属性查询', () => {
      const result = xpathQuery(xml, '//book[@category="fiction"]');
      expect(result).toHaveLength(2);
    });

    it('应该查询文本节点', () => {
      const result = xpathQuery(xml, '//book/title/text()');
      expect(result).toHaveLength(3);
      expect(result).toContain('1984');
      expect(result).toContain('Sapiens');
    });

    it('应该查询单个节点', () => {
      const result = xpathQueryOne(xml, '//book[title="1984"]');
      expect(result).toBeDefined();
      expect(result.tagName).toBe('book');
    });

    it('应该使用条件表达式', () => {
      const result = xpathQuery(xml, '//book[price>15]');
      expect(result).toHaveLength(1);
      expect(result[0].textContent).toContain('Sapiens');
    });

    it('应该处理查询错误', () => {
      const query = new XPathQuery(xml);
      const result = query.query('invalid[xpath');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('完整流程测试', () => {
    it('应该支持 XML → JSON → XML 往返转换', () => {
      const originalXml = `
        <user id="123">
          <name>Axon</name>
          <age>25</age>
          <skills>
            <skill>TypeScript</skill>
            <skill>Rust</skill>
          </skills>
        </user>
      `;

      // XML → JSON
      const json = xmlToJson(originalXml);
      expect(json.user['@attrs'].id).toBe(123);
      expect(json.user.name).toBe('Axon');

      // JSON → XML
      const newXml = jsonToXml(json, 'user', { xmlDecl: false });
      
      // 验证新 XML 包含关键数据
      expect(newXml).toContain('id="123"');
      expect(newXml).toContain('<name>Axon</name>');
      expect(newXml).toContain('<skill>TypeScript</skill>');
    });

    it('应该支持 XPath 查询后再生成 XML', () => {
      const xml = `
        <catalog>
          <item id="1"><name>Item 1</name></item>
          <item id="2"><name>Item 2</name></item>
          <item id="3"><name>Item 3</name></item>
        </catalog>
      `;

      // 查询特定项
      const items = xpathQuery(xml, '//item[@id="2"]');
      expect(items).toHaveLength(1);

      // 转换为 JSON 并修改
      const json = { selected: items[0] };
      json.selected.name = 'Modified Item 2';

      // 生成新 XML
      const newXml = jsonToXml(json, 'result', { xmlDecl: false });
      expect(newXml).toContain('Modified Item 2');
    });
  });

  describe('自定义配置', () => {
    it('应该支持自定义属性前缀', () => {
      const xml = '<item id="123">Test</item>';
      const parser = new XMLParser({ attrPrefix: '_' });
      const result = parser.parse(xml);
      
      expect(result.item._.id).toBe(123);
    });

    it('应该支持自定义文本键', () => {
      const xml = '<item>Test Value</item>';
      const parser = new XMLParser({ textKey: '$text' });
      const result = parser.parse(xml);
      
      expect(result.item.$text).toBe('Test Value');
    });

    it('应该支持自定义缩进', () => {
      const data = { root: { child: 'value' } };
      const generator = new XMLGenerator({ indent: '    ', xmlDecl: false });
      const result = generator.generate(data);
      
      expect(result.xml).toContain('    <child>value</child>');
    });
  });
});

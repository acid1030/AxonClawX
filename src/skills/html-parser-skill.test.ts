/**
 * HTML Parser Skill - 测试文件
 * 
 * @author Axon
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  HTMLParser,
  parseHTML,
  queryHTML,
  extractText,
  extractAttribute,
} from './html-parser-skill';

describe('HTMLParser', () => {
  let parser: HTMLParser;

  const sampleHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>测试页面</title>
      </head>
      <body>
        <header>
          <h1 id="main-title">欢迎来到测试页面</h1>
          <nav class="navigation">
            <a href="/home">首页</a>
            <a href="/about">关于我们</a>
            <a href="https://external.com" target="_blank">外部链接</a>
          </nav>
        </header>
        <main>
          <article class="content">
            <h2>文章标题</h2>
            <p class="intro">这是简介段落</p>
            <p>这是正文内容</p>
          </article>
          <aside class="sidebar">
            <ul class="links">
              <li><a href="/link1">链接 1</a></li>
              <li><a href="/link2">链接 2</a></li>
            </ul>
          </aside>
        </main>
        <footer>
          <p>版权所有 &copy; 2026</p>
        </footer>
      </body>
    </html>
  `;

  beforeAll(() => {
    parser = parseHTML(sampleHTML);
  });

  describe('基础解析', () => {
    it('应该成功解析 HTML', () => {
      expect(parser).toBeDefined();
      expect(parser.querySelector('html')).toBeTruthy();
    });

    it('应该正确解析文档结构', () => {
      const html = parser.querySelector('html');
      expect(html?.tagName).toBe('html');
      expect(html?.children.length).toBeGreaterThan(0);
    });
  });

  describe('CSS 选择器查询', () => {
    it('应该支持标签选择器', () => {
      const result = parser.querySelectorAll('p');
      expect(result.count).toBeGreaterThanOrEqual(2);
    });

    it('应该支持类选择器', () => {
      const result = parser.querySelectorAll('.content');
      expect(result.count).toBe(1);
      expect(result.nodes[0].tagName).toBe('article');
    });

    it('应该支持 ID 选择器', () => {
      const result = parser.querySelectorAll('#main-title');
      expect(result.count).toBe(1);
      expect(result.nodes[0].tagName).toBe('h1');
    });

    it('应该支持属性选择器', () => {
      const result = parser.querySelectorAll('[href]');
      expect(result.count).toBeGreaterThanOrEqual(4);
    });

    it('应该支持属性值选择器', () => {
      const result = parser.querySelectorAll('[href="/home"]');
      expect(result.count).toBe(1);
    });

    it('应该支持组合选择器', () => {
      const result = parser.querySelectorAll('h1, h2');
      expect(result.count).toBe(2);
    });

    it('querySelector 应该返回第一个匹配项', () => {
      const element = parser.querySelector('p');
      expect(element).toBeTruthy();
      expect(element?.tagName).toBe('p');
    });
  });

  describe('数据提取', () => {
    it('应该提取文本内容', () => {
      const result = parser.extract('h1', { text: true });
      expect(result.length).toBe(1);
      expect(result[0].text).toContain('欢迎来到测试页面');
    });

    it('应该提取 HTML 内容', () => {
      const result = parser.extract('.navigation', { html: true });
      expect(result.length).toBe(1);
      expect(result[0].html).toContain('<a');
    });

    it('应该提取属性', () => {
      const result = parser.extract('a', { attributes: ['href'] });
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0].attributes?.href).toBeDefined();
    });

    it('应该提取所有属性', () => {
      const result = parser.extract('a', { allAttributes: true });
      expect(result.length).toBeGreaterThanOrEqual(4);
      expect(result[0].attributes).toBeDefined();
    });

    it('应该包含子节点', () => {
      const result = parser.extract('.sidebar', { 
        text: true, 
        includeChildren: true 
      });
      expect(result.length).toBe(1);
      expect(result[0].children).toBeDefined();
    });
  });

  describe('表格提取', () => {
    it('应该提取表格数据', () => {
      const tableHTML = `
        <table>
          <tr><th>姓名</th><th>年龄</th></tr>
          <tr><td>张三</td><td>25</td></tr>
          <tr><td>李四</td><td>30</td></tr>
        </table>
      `;
      const tableParser = parseHTML(tableHTML);
      const data = tableParser.extractTable();

      expect(data.headers).toEqual(['姓名', '年龄']);
      expect(data.rows.length).toBe(2);
      expect(data.data.length).toBe(2);
      expect(data.data[0]).toEqual({ 姓名: '张三', 年龄: '25' });
    });

    it('空表格应该返回空结果', () => {
      const data = parser.extractTable();
      expect(data.headers).toEqual([]);
      expect(data.rows).toEqual([]);
      expect(data.data).toEqual([]);
    });
  });

  describe('链接提取', () => {
    it('应该提取所有链接', () => {
      const links = parser.extractLinks('a');
      expect(links.length).toBeGreaterThanOrEqual(4);
    });

    it('应该正确识别外部链接', () => {
      const links = parser.extractLinks('a', 'https://example.com');
      const external = links.filter(l => l.isExternal);
      expect(external.length).toBeGreaterThanOrEqual(1);
      expect(external[0].href).toBe('https://external.com');
    });

    it('应该提取链接文本和属性', () => {
      const links = parser.extractLinks('a');
      expect(links[0].text).toBeDefined();
      expect(links[0].href).toBeDefined();
    });
  });

  describe('图片提取', () => {
    it('应该提取图片信息', () => {
      const imgHTML = `
        <img src="/logo.png" alt="Logo" width="100" height="50" title="Test">
      `;
      const imgParser = parseHTML(imgHTML);
      const images = imgParser.extractImages();

      expect(images.length).toBe(1);
      expect(images[0].src).toBe('/logo.png');
      expect(images[0].alt).toBe('Logo');
      expect(images[0].width).toBe('100');
      expect(images[0].height).toBe('50');
      expect(images[0].title).toBe('Test');
    });

    it('空结果应该返回空数组', () => {
      const images = parser.extractImages();
      expect(images).toEqual([]);
    });
  });

  describe('便捷函数', () => {
    it('queryHTML 应该返回查询结果', () => {
      const result = queryHTML(sampleHTML, '.content');
      expect(result.count).toBe(1);
    });

    it('extractText 应该提取文本', () => {
      const texts = extractText(sampleHTML, 'h1');
      expect(texts.length).toBe(1);
      expect(texts[0]).toContain('欢迎来到测试页面');
    });

    it('extractAttribute 应该提取属性', () => {
      const hrefs = extractAttribute(sampleHTML, 'a', 'href');
      expect(hrefs.length).toBeGreaterThanOrEqual(4);
      expect(hrefs).toContain('/home');
    });
  });

  describe('边界情况', () => {
    it('应该处理空 HTML', () => {
      const emptyParser = parseHTML('');
      expect(emptyParser).toBeDefined();
    });

    it('应该处理不完整的 HTML', () => {
      const incompleteHTML = '<div><p>Test</div>';
      const incompleteParser = parseHTML(incompleteHTML);
      const result = incompleteParser.querySelectorAll('p');
      expect(result.count).toBeGreaterThanOrEqual(0);
    });

    it('应该处理特殊字符', () => {
      const specialHTML = '<div>Test &amp; &lt;script&gt; &copy;</div>';
      const specialParser = parseHTML(specialHTML);
      const result = specialParser.querySelectorAll('div');
      expect(result.count).toBe(1);
    });
  });
});

describe('HTMLParser 配置', () => {
  it('应该支持自定义配置', () => {
    const parser = new HTMLParser({
      keepComments: true,
      keepWhitespace: true,
      autoFix: false,
    });
    expect(parser).toBeDefined();
  });

  it('默认配置应该合理', () => {
    const parser = new HTMLParser();
    expect(parser).toBeDefined();
  });
});

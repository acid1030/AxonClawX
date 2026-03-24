/**
 * Template Lite 测试用例
 */

import { TemplateLite, template, createTemplate } from './template-lite-skill';

describe('TemplateLite', () => {
  describe('基本变量替换', () => {
    it('应该替换简单变量', () => {
      const result = TemplateLite.render('Hello, {{name}}!', { name: 'Alice' });
      expect(result).toBe('Hello, Alice!');
    });

    it('应该替换嵌套路径变量', () => {
      const context = { user: { profile: { name: 'Bob' } } };
      const result = TemplateLite.render('{{user.profile.name}}', context);
      expect(result).toBe('Bob');
    });

    it('应该处理多个变量', () => {
      const result = TemplateLite.render('{{greeting}}, {{name}}!', {
        greeting: 'Hello',
        name: 'Charlie'
      });
      expect(result).toBe('Hello, Charlie!');
    });

    it('未定义变量应该替换为空字符串', () => {
      const result = TemplateLite.render('Hello, {{name}}!', {});
      expect(result).toBe('Hello, !');
    });
  });

  describe('条件渲染', () => {
    it('应该渲染真值条件', () => {
      const result = TemplateLite.render('{{#if show}}Visible{{/if}}', { show: true });
      expect(result).toBe('Visible');
    });

    it('应该隐藏假值条件', () => {
      const result = TemplateLite.render('{{#if show}}Visible{{/if}}', { show: false });
      expect(result).toBe('');
    });

    it('应该处理否定条件', () => {
      const result = TemplateLite.render('{{#if !hidden}}Visible{{/if}}', { hidden: false });
      expect(result).toBe('Visible');
    });

    it('应该处理大于比较', () => {
      const result = TemplateLite.render('{{#if count > 5}}Big{{/if}}', { count: 10 });
      expect(result).toBe('Big');
    });

    it('应该处理等于比较', () => {
      const result = TemplateLite.render('{{#if status == "active"}}Active{{/if}}', { status: 'active' });
      expect(result).toBe('Active');
    });

    it('应该处理逻辑与', () => {
      const result = TemplateLite.render('{{#if a && b}}Both{{/if}}', { a: true, b: true });
      expect(result).toBe('Both');
    });

    it('应该处理逻辑或', () => {
      const result = TemplateLite.render('{{#if a || b}}Either{{/if}}', { a: false, b: true });
      expect(result).toBe('Either');
    });
  });

  describe('循环渲染', () => {
    it('应该渲染数组循环', () => {
      const result = TemplateLite.render('{{#each items}}[{{this}}]{{/each}}', {
        items: ['A', 'B', 'C']
      });
      expect(result).toBe('[A][B][C]');
    });

    it('应该提供索引', () => {
      const result = TemplateLite.render('{{#each items}}{{index}}{{/each}}', {
        items: ['A', 'B', 'C']
      });
      expect(result).toBe('012');
    });

    it('应该提供 first 标记', () => {
      const result = TemplateLite.render('{{#each items}}{{#if first}}F{{/if}}{{/each}}', {
        items: ['A', 'B', 'C']
      });
      expect(result).toBe('F');
    });

    it('应该提供 last 标记', () => {
      const result = TemplateLite.render('{{#each items}}{{#if last}}L{{/if}}{{/each}}', {
        items: ['A', 'B', 'C']
      });
      expect(result).toBe('L');
    });

    it('应该处理空数组', () => {
      const result = TemplateLite.render('{{#each items}}X{{/each}}', { items: [] });
      expect(result).toBe('');
    });

    it('应该处理非数组 (忽略)', () => {
      const result = TemplateLite.render('{{#each items}}X{{/each}}', { items: 'not-array' });
      expect(result).toBe('');
    });
  });

  describe('嵌套功能', () => {
    it('应该处理循环内的条件', () => {
      const result = TemplateLite.render(
        '{{#each items}}{{#if active}}Y{{/if}}{{/each}}',
        { items: [{ active: true }, { active: false }, { active: true }] }
      );
      expect(result).toBe('YY');
    });

    it('应该处理嵌套循环', () => {
      const result = TemplateLite.render(
        '{{#each outer}}({{#each inner}}{{this}}{{/each}}){{/each}}',
        { outer: [{ inner: [1, 2] }, { inner: [3, 4] }] }
      );
      expect(result).toBe('(12)(34)');
    });
  });

  describe('自定义配置', () => {
    it('应该使用自定义分隔符', () => {
      const engine = createTemplate({
        delimiterStart: '<%',
        delimiterEnd: '%>'
      });
      const result = engine.render('<% name %>', { name: 'Custom' });
      expect(result).toBe('Custom');
    });

    it('严格模式应该保留未定义变量', () => {
      const engine = createTemplate({ ignoreUndefined: false });
      const result = engine.render('{{name}}', {});
      expect(result).toBe('{{name}}');
    });
  });

  describe('快捷函数', () => {
    it('template 函数应该工作', () => {
      const result = template('Hello, {{name}}!', { name: 'Func' });
      expect(result).toBe('Hello, Func!');
    });

    it('createTemplate 应该返回实例', () => {
      const engine = createTemplate();
      expect(engine).toBeInstanceOf(TemplateLite);
    });
  });

  describe('边界情况', () => {
    it('应该处理空模板', () => {
      const result = TemplateLite.render('', { name: 'Test' });
      expect(result).toBe('');
    });

    it('应该处理空上下文', () => {
      const result = TemplateLite.render('Static text', {});
      expect(result).toBe('Static text');
    });

    it('应该处理 null 值', () => {
      const result = TemplateLite.render('{{name}}', { name: null });
      expect(result).toBe('');
    });

    it('应该处理数字 0', () => {
      const result = TemplateLite.render('{{count}}', { count: 0 });
      expect(result).toBe('0');
    });

    it('应该处理空字符串', () => {
      const result = TemplateLite.render('{{text}}', { text: '' });
      expect(result).toBe('');
    });
  });
});

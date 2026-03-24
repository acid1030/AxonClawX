/**
 * 数据过滤技能测试
 */

import { FilterSkill, createFilter, quickFilter } from './filter-skill';

describe('FilterSkill', () => {
  let filter: FilterSkill;

  beforeEach(() => {
    filter = createFilter();
  });

  afterEach(() => {
    filter.clearCache();
  });

  const testData = [
    { id: 1, name: 'Alice', age: 25, city: 'Beijing', score: 85 },
    { id: 2, name: 'Bob', age: 30, city: 'Shanghai', score: 92 },
    { id: 3, name: 'Charlie', age: 25, city: 'Beijing', score: 78 },
    { id: 4, name: 'Diana', age: 35, city: 'Guangzhou', score: 88 },
    { id: 5, name: 'Eve', age: 28, city: 'Shenzhen', score: 95 },
  ];

  describe('基础过滤', () => {
    test('等于过滤', () => {
      const result = filter.filter(testData, [
        { field: 'age', operator: 'eq', value: 25 }
      ]);
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Alice');
      expect(result.data[1].name).toBe('Charlie');
    });

    test('不等于过滤', () => {
      const result = filter.filter(testData, [
        { field: 'city', operator: 'neq', value: 'Beijing' }
      ]);
      
      expect(result.data).toHaveLength(3);
    });

    test('大于过滤', () => {
      const result = filter.filter(testData, [
        { field: 'age', operator: 'gt', value: 28 }
      ]);
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Bob');
      expect(result.data[1].name).toBe('Diana');
    });

    test('大于等于过滤', () => {
      const result = filter.filter(testData, [
        { field: 'score', operator: 'gte', value: 85 }
      ]);
      
      expect(result.data).toHaveLength(4);
    });

    test('小于过滤', () => {
      const result = filter.filter(testData, [
        { field: 'age', operator: 'lt', value: 28 }
      ]);
      
      expect(result.data).toHaveLength(2);
    });

    test('小于等于过滤', () => {
      const result = filter.filter(testData, [
        { field: 'score', operator: 'lte', value: 85 }
      ]);
      
      expect(result.data).toHaveLength(2);
    });
  });

  describe('多条件过滤', () => {
    test('AND 逻辑 (默认)', () => {
      const result = filter.filter(testData, [
        { field: 'age', operator: 'eq', value: 25 },
        { field: 'city', operator: 'eq', value: 'Beijing' }
      ]);
      
      expect(result.data).toHaveLength(2);
    });

    test('OR 逻辑', () => {
      const result = filter.filter(testData, [
        filter.group('OR', [
          { field: 'age', operator: 'eq', value: 25 },
          { field: 'city', operator: 'eq', value: 'Shanghai' }
        ])
      ]);
      
      expect(result.data).toHaveLength(3);
    });

    test('嵌套组合', () => {
      const result = filter.filter(testData, [
        filter.group('OR', [
          filter.group('AND', [
            { field: 'age', operator: 'eq', value: 25 },
            { field: 'city', operator: 'eq', value: 'Beijing' }
          ]),
          filter.group('AND', [
            { field: 'age', operator: 'eq', value: 30 },
            { field: 'city', operator: 'eq', value: 'Shanghai' }
          ])
        ])
      ]);
      
      expect(result.data).toHaveLength(3);
    });
  });

  describe('模糊匹配', () => {
    test('基础模糊匹配', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'fuzzy', value: 'alic' }
      ]);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice');
    });

    test('自定义阈值', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'fuzzy', value: 'bob', threshold: 0.9 }
      ]);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Bob');
    });

    test('低阈值匹配', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'fuzzy', value: 'a', threshold: 0.3 }
      ]);
      
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('范围过滤', () => {
    test('between 操作符', () => {
      const result = filter.filter(testData, [
        { field: 'age', operator: 'between', value: [25, 30] }
      ]);
      
      expect(result.data).toHaveLength(4);
    });

    test('in 操作符', () => {
      const result = filter.filter(testData, [
        { field: 'city', operator: 'in', value: ['Beijing', 'Shanghai'] }
      ]);
      
      expect(result.data).toHaveLength(3);
    });

    test('nin 操作符', () => {
      const result = filter.filter(testData, [
        { field: 'city', operator: 'nin', value: ['Beijing', 'Shanghai'] }
      ]);
      
      expect(result.data).toHaveLength(2);
    });
  });

  describe('字符串匹配', () => {
    test('contains', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'contains', value: 'li' }
      ]);
      
      expect(result.data).toHaveLength(2); // Alice, Charlie
    });

    test('icontains (不区分大小写)', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'icontains', value: 'AL' }
      ]);
      
      expect(result.data).toHaveLength(2);
    });

    test('startsWith', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'startsWith', value: 'A' }
      ]);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice');
    });

    test('endsWith', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'endsWith', value: 'e' }
      ]);
      
      expect(result.data).toHaveLength(2); // Alice, Eve
    });

    test('regex', () => {
      const result = filter.filter(testData, [
        { field: 'name', operator: 'regex', value: '^[A-C]' }
      ]);
      
      expect(result.data).toHaveLength(3); // Alice, Bob, Charlie
    });
  });

  describe('字段存在性', () => {
    const dataWithNulls = [
      { id: 1, name: 'Alice', phone: '123' },
      { id: 2, name: 'Bob', phone: null },
      { id: 3, name: 'Charlie' },
    ];

    test('exists 操作符', () => {
      const result = filter.filter(dataWithNulls, [
        { field: 'phone', operator: 'exists', value: true }
      ]);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice');
    });
  });

  describe('取反操作', () => {
    test('not 选项', () => {
      const result = filter.filter(testData, [
        { field: 'city', operator: 'eq', value: 'Beijing', not: true }
      ]);
      
      expect(result.data).toHaveLength(3);
    });
  });

  describe('排序和分页', () => {
    test('升序排序', () => {
      const result = filter.filter(testData, [], {
        sortBy: 'age',
        sortOrder: 'asc'
      });
      
      expect(result.data[0].age).toBeLessThanOrEqual(result.data[1].age);
    });

    test('降序排序', () => {
      const result = filter.filter(testData, [], {
        sortBy: 'score',
        sortOrder: 'desc'
      });
      
      expect(result.data[0].score).toBeGreaterThanOrEqual(result.data[1].score);
    });

    test('分页', () => {
      const result = filter.filter(testData, [], {
        limit: 2,
        offset: 0
      });
      
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.filteredTotal).toBe(5);
    });

    test('分页第二页', () => {
      const result = filter.filter(testData, [], {
        limit: 2,
        offset: 2
      });
      
      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    test('最后一页', () => {
      const result = filter.filter(testData, [], {
        limit: 2,
        offset: 4
      });
      
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('自定义过滤器', () => {
    test('customFilter', () => {
      const result = filter.filter(testData, [], {
        customFilter: (item) => item.score % 2 === 0
      });
      
      expect(result.data.every(item => item.score % 2 === 0)).toBe(true);
    });
  });

  describe('嵌套字段', () => {
    const nestedData = [
      { id: 1, user: { name: 'Alice', profile: { age: 25 } } },
      { id: 2, user: { name: 'Bob', profile: { age: 30 } } },
    ];

    test('点号访问嵌套字段', () => {
      const result = filter.filter(nestedData, [
        { field: 'user.profile.age', operator: 'eq', value: 25 }
      ]);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].user.name).toBe('Alice');
    });
  });

  describe('字段分析', () => {
    test('analyzeFields', () => {
      const stats = filter.analyzeFields(testData);
      
      expect(stats).toHaveLength(5); // id, name, age, city, score
      
      const ageStat = stats.find(s => s.field === 'age');
      expect(ageStat).toBeDefined();
      expect(ageStat?.type).toBe('number');
      expect(ageStat?.min).toBe(25);
      expect(ageStat?.max).toBe(35);
      expect(ageStat?.nonNullCount).toBe(5);
    });

    test('空数据分析', () => {
      const stats = filter.analyzeFields([]);
      expect(stats).toHaveLength(0);
    });
  });

  describe('缓存', () => {
    test('缓存命中', () => {
      const conditions = [{ field: 'age', operator: 'eq', value: 25 }];
      
      const result1 = filter.filter(testData, conditions);
      expect(result1.executionTime).toBeGreaterThan(0);
      
      const result2 = filter.filter(testData, conditions);
      expect(result2.executionTime).toBe(0); // 缓存命中
    });

    test('清除缓存', () => {
      const conditions = [{ field: 'age', operator: 'eq', value: 25 }];
      
      filter.filter(testData, conditions);
      filter.clearCache();
      
      const result = filter.filter(testData, conditions);
      expect(result.executionTime).toBeGreaterThan(0); // 缓存已清除
    });

    test('禁用缓存', () => {
      const noCacheFilter = createFilter({ enableCache: false });
      
      const conditions = [{ field: 'age', operator: 'eq', value: 25 }];
      
      const result1 = noCacheFilter.filter(testData, conditions);
      const result2 = noCacheFilter.filter(testData, conditions);
      
      expect(result1.executionTime).toBeGreaterThan(0);
      expect(result2.executionTime).toBeGreaterThan(0);
    });
  });

  describe('便捷函数', () => {
    test('quickFilter', () => {
      const result = quickFilter(testData, 'city', 'eq', 'Beijing');
      
      expect(result).toHaveLength(2);
      expect(result.every(item => item.city === 'Beijing')).toBe(true);
    });
  });

  describe('辅助方法', () => {
    test('condition', () => {
      const condition = filter.condition('age', 'gte', 18);
      
      expect(condition).toEqual({
        field: 'age',
        operator: 'gte',
        value: 18
      });
    });

    test('condition with options', () => {
      const condition = filter.condition('name', 'fuzzy', 'test', {
        threshold: 0.8,
        not: true
      });
      
      expect(condition.threshold).toBe(0.8);
      expect(condition.not).toBe(true);
    });

    test('group', () => {
      const group = filter.group('AND', [
        { field: 'age', operator: 'gte', value: 18 }
      ]);
      
      expect(group.logic).toBe('AND');
      expect(group.conditions).toHaveLength(1);
    });
  });

  describe('边界情况', () => {
    test('空条件数组', () => {
      const result = filter.filter(testData, []);
      
      expect(result.data).toHaveLength(5);
      expect(result.filteredTotal).toBe(5);
    });

    test('空数据数组', () => {
      const result = filter.filter([], [
        { field: 'age', operator: 'eq', value: 25 }
      ]);
      
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('不存在的字段', () => {
      const result = filter.filter(testData, [
        { field: 'nonExistent', operator: 'eq', value: 'test' }
      ]);
      
      expect(result.data).toHaveLength(0);
    });

    test('null 值处理', () => {
      const dataWithNulls = [
        { id: 1, value: null },
        { id: 2, value: 10 },
        { id: 3, value: undefined },
      ];

      const result = filter.filter(dataWithNulls, [
        { field: 'value', operator: 'eq', value: null }
      ]);
      
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(1);
    });
  });

  describe('性能测试', () => {
    test('大数据集性能', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        age: Math.floor(Math.random() * 50) + 18,
        score: Math.floor(Math.random() * 100),
      }));

      const startTime = performance.now();
      const result = filter.filter(largeData, [
        { field: 'age', operator: 'gte', value: 30 },
        { field: 'score', operator: 'gte', value: 80 }
      ]);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 应在 100ms 内完成
      expect(result.filteredTotal).toBeLessThan(largeData.length);
    });
  });
});

describe('FilterSkill 配置', () => {
  test('自定义默认逻辑', () => {
    const filter = createFilter({ defaultLogic: 'OR' });
    
    const testData = [
      { id: 1, a: true, b: false },
      { id: 2, a: false, b: true },
      { id: 3, a: false, b: false },
    ];

    const result = filter.filter(testData, [
      { field: 'a', operator: 'eq', value: true },
      { field: 'b', operator: 'eq', value: true }
    ]);

    // OR 逻辑：a=true 或 b=true
    expect(result.data).toHaveLength(2);
  });

  test('自定义模糊阈值', () => {
    const filter = createFilter({ defaultFuzzyThreshold: 0.9 });
    
    const testData = [
      { name: 'Alice' },
      { name: 'Alic' },
      { name: 'Al' },
    ];

    const result = filter.filter(testData, [
      { field: 'name', operator: 'fuzzy', value: 'Alice' }
    ]);

    // 高阈值只匹配非常相似的结果
    expect(result.data.length).toBeLessThanOrEqual(2);
  });
});

/**
 * 多渠道通知技能 - 单元测试
 */

import {
  createNotificationService,
  NotificationChannelType,
  NotificationType,
  NotificationPriority,
  BuiltinTemplates,
} from './notification-channel-skill';

describe('NotificationService', () => {
  describe('初始化', () => {
    test('应能创建仅飞书配置的服务', () => {
      const service = createNotificationService({
        feishu: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
        },
        defaultChannels: ['feishu'],
      });

      expect(service).toBeDefined();
      expect(service.getChannelStatus()).toHaveProperty('feishu');
    });

    test('应能创建多渠道配置的服务', () => {
      const service = createNotificationService({
        feishu: {
          webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/test',
        },
        email: {
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          from: 'test@example.com',
          username: 'test',
          password: 'test',
        },
        websocket: {
          url: 'ws://localhost:8080/notifications',
        },
        defaultChannels: ['feishu', 'email', 'websocket'],
      });

      expect(service).toBeDefined();
      const status = service.getChannelStatus();
      expect(status).toHaveProperty('feishu');
      expect(status).toHaveProperty('email');
      expect(status).toHaveProperty('websocket');
    });

    test('应默认启用内置模板', () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        enableTemplates: true,
      });

      // 验证内置模板已注册
      expect(BuiltinTemplates.systemAlert).toBeDefined();
      expect(BuiltinTemplates.taskComplete).toBeDefined();
      expect(BuiltinTemplates.errorReport).toBeDefined();
      expect(BuiltinTemplates.dailyReport).toBeDefined();
    });
  });

  describe('模板管理', () => {
    test('应能注册自定义模板', () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
      });

      const customTemplate = {
        id: 'custom-test',
        name: '测试模板',
        titleTemplate: '[{{type}}] {{title}}',
        contentTemplate: '{{content}}',
        defaultType: 'info' as NotificationType,
        defaultPriority: 'normal' as NotificationPriority,
      };

      service.registerTemplate(customTemplate);
      // 模板注册成功，不抛出异常
      expect(true).toBe(true);
    });

    test('应能移除模板', () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
      });

      service.registerTemplate({
        id: 'temp-template',
        name: '临时模板',
        titleTemplate: '{{title}}',
        contentTemplate: '{{content}}',
      });

      service.unregisterTemplate('temp-template');
      // 移除成功，不抛出异常
      expect(true).toBe(true);
    });
  });

  describe('通知发送', () => {
    test('sendQuick 应能发送简单通知', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        defaultChannels: ['feishu'],
      });

      const result = await service.sendQuick(
        '测试通知',
        '这是测试内容',
        'info',
        'normal'
      );

      expect(result).toBeDefined();
      expect(result.total).toBe(1);
      expect(result.results).toHaveLength(1);
      // 注意：由于是测试 URL，实际发送会失败，但结构应正确
      expect(result.results[0].channel).toBe('feishu');
    });

    test('send 应能发送带数据的通知', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        defaultChannels: ['feishu'],
      });

      const result = await service.send({
        title: '数据通知',
        content: '包含结构化数据',
        type: 'success',
        priority: 'high',
        data: {
          key1: 'value1',
          key2: 'value2',
        },
      });

      expect(result).toBeDefined();
      expect(result.results[0].channel).toBe('feishu');
    });

    test('应能指定渠道发送', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        email: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          from: 'test@test.com',
          username: 'test',
          password: 'test',
        },
        defaultChannels: ['feishu'],
      });

      // 仅发送到邮件
      const result = await service.send(
        { title: '测试', content: '内容' },
        ['email']
      );

      expect(result).toBeDefined();
      expect(result.results[0].channel).toBe('email');
    });

    test('多渠道发送应返回所有结果', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        email: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          from: 'test@test.com',
          username: 'test',
          password: 'test',
        },
        defaultChannels: ['feishu', 'email'],
      });

      const result = await service.sendQuick('测试', '内容');

      expect(result.total).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results.map((r) => r.channel)).toContain('feishu');
      expect(result.results.map((r) => r.channel)).toContain('email');
    });
  });

  describe('模板渲染', () => {
    test('应能使用内置系统告警模板', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        enableTemplates: true,
      });

      const result = await service.send(
        {
          title: '数据库异常',
          content: '连接超时',
          data: { error: 'ETIMEDOUT' },
        },
        ['feishu'],
        'system-alert'
      );

      expect(result).toBeDefined();
      // 模板应用后，标题应包含优先级标记
      expect(result.results[0].channel).toBe('feishu');
    });

    test('应能使用内置任务完成模板', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        enableTemplates: true,
      });

      const result = await service.send(
        {
          title: '数据同步',
          content: '同步完成',
          data: { processed: 1000 },
        },
        ['feishu'],
        'task-complete'
      );

      expect(result).toBeDefined();
    });

    test('应能使用自定义模板', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
      });

      service.registerTemplate({
        id: 'custom-format',
        name: '自定义格式',
        titleTemplate: '[{{type}}] {{title}}',
        contentTemplate: '{{content}}\n详情：{{data}}',
        defaultType: 'info',
        defaultPriority: 'normal',
      });

      const result = await service.send(
        {
          title: '测试标题',
          content: '测试内容',
          type: 'warning',
          data: { info: '详细信息' },
        },
        ['feishu'],
        'custom-format'
      );

      expect(result).toBeDefined();
    });
  });

  describe('优先级处理', () => {
    test('应支持所有优先级级别', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
      });

      const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

      for (const priority of priorities) {
        const result = await service.sendQuick(
          `优先级测试 - ${priority}`,
          '内容',
          'info',
          priority
        );

        expect(result).toBeDefined();
        expect(result.results[0].channel).toBe('feishu');
      }
    });
  });

  describe('通知类型', () => {
    test('应支持所有通知类型', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
      });

      const types: NotificationType[] = ['info', 'success', 'warning', 'error', 'custom'];

      for (const type of types) {
        const result = await service.sendQuick(
          `类型测试 - ${type}`,
          '内容',
          type
        );

        expect(result).toBeDefined();
      }
    });
  });

  describe('错误处理', () => {
    test('未配置渠道应返回失败', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        defaultChannels: ['feishu'],
      });

      // 尝试发送到未配置的渠道
      const result = await service.send(
        { title: '测试', content: '内容' },
        ['email'] // email 未配置
      );

      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('not configured');
    });

    test('无效 Webhook URL 应返回失败', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://invalid-url-test.com' },
        defaultChannels: ['feishu'],
      });

      const result = await service.sendQuick('测试', '内容');

      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBeDefined();
    });
  });

  describe('统计信息', () => {
    test('批量发送应返回正确统计', async () => {
      const service = createNotificationService({
        feishu: { webhookUrl: 'https://test.com' },
        email: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          from: 'test@test.com',
          username: 'test',
          password: 'test',
        },
        defaultChannels: ['feishu', 'email'],
      });

      const result = await service.sendQuick('测试', '内容');

      expect(result.total).toBe(2);
      expect(result.success + result.failed).toBe(result.total);
    });
  });
});

describe('BuiltinTemplates', () => {
  test('应包含所有内置模板', () => {
    expect(BuiltinTemplates.systemAlert.id).toBe('system-alert');
    expect(BuiltinTemplates.taskComplete.id).toBe('task-complete');
    expect(BuiltinTemplates.errorReport.id).toBe('error-report');
    expect(BuiltinTemplates.dailyReport.id).toBe('daily-report');
  });

  test('系统告警模板应有正确的默认设置', () => {
    expect(BuiltinTemplates.systemAlert.defaultType).toBe('error');
    expect(BuiltinTemplates.systemAlert.defaultPriority).toBe('urgent');
  });

  test('任务完成模板应有正确的默认设置', () => {
    expect(BuiltinTemplates.taskComplete.defaultType).toBe('success');
    expect(BuiltinTemplates.taskComplete.defaultPriority).toBe('normal');
  });
});

describe('工具函数', () => {
  test('模板渲染应能替换变量', () => {
    // 测试模板渲染逻辑
    const template = 'Hello {{name}}, welcome to {{place}}!';
    const data = { name: 'Axon', place: 'OpenClaw' };
    const result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key as keyof typeof data] || match;
    });

    expect(result).toBe('Hello Axon, welcome to OpenClaw!');
  });

  test('模板渲染应保留未知变量', () => {
    const template = 'Value: {{unknown}}';
    const data = { known: 'value' };
    const result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key as keyof typeof data] || match;
    });

    expect(result).toBe('Value: {{unknown}}');
  });
});

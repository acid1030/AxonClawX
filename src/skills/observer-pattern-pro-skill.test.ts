/**
 * 观察者模式专业工具技能 - 测试用例
 * 
 * @author ACE
 * @version 1.0.0
 * @since 2026-03-13
 */

import {
  Observer,
  Subject,
  SubjectManager,
  createSubject,
  createObserver,
  getSubject,
  ObserverPatternExamples,
} from './observer-pattern-pro-skill';

describe('Observer Pattern Pro Skill', () => {
  beforeEach(() => {
    // 清空主题管理器
    SubjectManager.getInstance().clear();
  });

  describe('Observer', () => {
    it('should create observer with default values', () => {
      const observer = createObserver({
        name: 'Test Observer',
        onUpdate: () => {},
      });

      expect(observer.name).toBe('Test Observer');
      expect(observer.priority).toBe('normal');
      expect(observer.enabled).toBe(true);
      expect(observer.id).toMatch(/^obs_\d+_\w+$/);
    });

    it('should create observer with custom values', () => {
      const observer = createObserver({
        id: 'custom-id',
        name: 'Custom Observer',
        priority: 'high',
        enabled: false,
        onUpdate: () => {},
      });

      expect(observer.id).toBe('custom-id');
      expect(observer.name).toBe('Custom Observer');
      expect(observer.priority).toBe('high');
      expect(observer.enabled).toBe(false);
    });

    it('should call onUpdate when update is called', async () => {
      const mockUpdate = jest.fn();
      const observer = createObserver({
        name: 'Test',
        onUpdate: mockUpdate,
      });

      const testData = { value: 123 };
      await observer.update(testData, 'test-topic');

      expect(mockUpdate).toHaveBeenCalledWith(testData, 'test-topic');
    });

    it('should not call onUpdate when disabled', async () => {
      const mockUpdate = jest.fn();
      const observer = createObserver({
        name: 'Test',
        onUpdate: mockUpdate,
        enabled: false,
      });

      await observer.update({ value: 123 }, 'test-topic');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should call onError when update throws', async () => {
      const mockError = jest.fn();
      const observer = createObserver({
        name: 'Test',
        onUpdate: () => {
          throw new Error('Test error');
        },
        onError: mockError,
      });

      await expect(observer.update({}, 'test-topic')).rejects.toThrow('Test error');
      expect(mockError).toHaveBeenCalledWith(expect.any(Error), 'test-topic');
    });

    it('should enable/disable observer', () => {
      const observer = createObserver({
        name: 'Test',
        onUpdate: () => {},
        enabled: true,
      });

      expect(observer.enabled).toBe(true);
      observer.disable();
      expect(observer.enabled).toBe(false);
      observer.enable();
      expect(observer.enabled).toBe(true);
    });

    it('should update priority', () => {
      const observer = createObserver({
        name: 'Test',
        onUpdate: () => {},
        priority: 'normal',
      });

      expect(observer.priority).toBe('normal');
      observer.setPriority('critical');
      expect(observer.priority).toBe('critical');
    });
  });

  describe('Subject', () => {
    it('should create subject with default values', () => {
      const subject = createSubject({
        name: 'Test Subject',
      });

      expect(subject.name).toBe('Test Subject');
      expect(subject.observerCount).toBe(0);
      expect(subject.id).toMatch(/^sub_\d+_\w+$/);
    });

    it('should create subject with custom values', () => {
      const subject = createSubject({
        id: 'custom-id',
        name: 'Custom Subject',
        parentId: 'parent-id',
        enableHierarchy: true,
      });

      expect(subject.id).toBe('custom-id');
      expect(subject.name).toBe('Custom Subject');
      expect(subject.parentId).toBe('parent-id');
    });

    it('should attach observer', () => {
      const subject = createSubject({ name: 'Test' });
      const observer = createObserver({ name: 'Obs', onUpdate: () => {} });

      subject.attach(observer);

      expect(subject.observerCount).toBe(1);
      expect(subject.getObserver(observer.id)).toBe(observer);
    });

    it('should detach observer', () => {
      const subject = createSubject({ name: 'Test' });
      const observer = createObserver({ name: 'Obs', onUpdate: () => {} });

      subject.attach(observer);
      expect(subject.observerCount).toBe(1);

      const result = subject.detach(observer.id);

      expect(result).toBe(true);
      expect(subject.observerCount).toBe(0);
    });

    it('should return false when detaching non-existent observer', () => {
      const subject = createSubject({ name: 'Test' });
      const result = subject.detach('non-existent');
      expect(result).toBe(false);
    });

    it('should notify observers synchronously', async () => {
      const subject = createSubject({ name: 'Test' });
      const calls: string[] = [];

      subject.attach(
        createObserver({
          name: 'Obs1',
          priority: 'normal',
          onUpdate: () => calls.push('obs1'),
        })
      );
      subject.attach(
        createObserver({
          name: 'Obs2',
          priority: 'high',
          onUpdate: () => calls.push('obs2'),
        })
      );

      await subject.notify({ data: 'test' }, 'sync');

      // High priority should be called first
      expect(calls).toEqual(['obs2', 'obs1']);
    });

    it('should notify observers asynchronously', async () => {
      const subject = createSubject({ name: 'Test' });
      const calls: string[] = [];

      for (let i = 1; i <= 3; i++) {
        subject.attach(
          createObserver({
            name: `Obs${i}`,
            onUpdate: async () => {
              await new Promise((resolve) => setTimeout(resolve, 10));
              calls.push(`obs${i}`);
            },
          })
        );
      }

      await subject.notify({ data: 'test' }, 'async');

      expect(calls.length).toBe(3);
    });

    it('should handle observer errors gracefully', async () => {
      const subject = createSubject({ name: 'Test' });
      const successCalls: string[] = [];

      subject.attach(
        createObserver({
          name: 'Good',
          onUpdate: () => successCalls.push('good'),
        })
      );
      subject.attach(
        createObserver({
          name: 'Bad',
          onUpdate: () => {
            throw new Error('Bad observer');
          },
        })
      );
      subject.attach(
        createObserver({
          name: 'AlsoGood',
          onUpdate: () => successCalls.push('also-good'),
        })
      );

      const result = await subject.notify({ data: 'test' }, 'sync');

      expect(successCalls).toEqual(['good', 'also-good']);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors.length).toBe(1);
    });

    it('should clear all observers', () => {
      const subject = createSubject({ name: 'Test' });

      subject.attach(createObserver({ name: 'Obs1', onUpdate: () => {} }));
      subject.attach(createObserver({ name: 'Obs2', onUpdate: () => {} }));

      expect(subject.observerCount).toBe(2);

      subject.clearObservers();

      expect(subject.observerCount).toBe(0);
    });

    it('should get all observers', () => {
      const subject = createSubject({ name: 'Test' });

      const obs1 = createObserver({ name: 'Obs1', onUpdate: () => {} });
      const obs2 = createObserver({ name: 'Obs2', onUpdate: () => {} });

      subject.attach(obs1);
      subject.attach(obs2);

      const observers = subject.getObservers();

      expect(observers.length).toBe(2);
      expect(observers).toContain(obs1);
      expect(observers).toContain(obs2);
    });
  });

  describe('Subject Hierarchy', () => {
    it('should notify parent observers when child notifies', async () => {
      const parent = createSubject({
        id: 'parent',
        name: 'Parent',
        enableHierarchy: true,
      });
      const child = createSubject({
        id: 'child',
        name: 'Child',
        parentId: 'parent',
      });

      child.setParent(parent);

      const parentCalls: any[] = [];
      const childCalls: any[] = [];

      parent.attach(
        createObserver({
          name: 'ParentObs',
          onUpdate: (data) => parentCalls.push(data),
        })
      );
      child.attach(
        createObserver({
          name: 'ChildObs',
          onUpdate: (data) => childCalls.push(data),
        })
      );

      await child.notify({ value: 123 });

      expect(childCalls).toEqual([{ value: 123 }]);
      expect(parentCalls).toEqual([{ value: 123 }]);
    });
  });

  describe('SubjectManager', () => {
    it('should create and get subject', () => {
      const manager = SubjectManager.getInstance();

      const subject = manager.createSubject({ id: 'test', name: 'Test' });
      const retrieved = manager.getSubject('test');

      expect(retrieved).toBe(subject);
    });

    it('should get all subjects', () => {
      const manager = SubjectManager.getInstance();

      manager.createSubject({ id: 's1', name: 'Subject 1' });
      manager.createSubject({ id: 's2', name: 'Subject 2' });

      const all = manager.getAllSubjects();

      expect(all.length).toBe(2);
    });

    it('should delete subject', () => {
      const manager = SubjectManager.getInstance();

      manager.createSubject({ id: 'test', name: 'Test' });
      const result = manager.deleteSubject('test');

      expect(result).toBe(true);
      expect(manager.getSubject('test')).toBeUndefined();
    });

    it('should clear all subjects', () => {
      const manager = SubjectManager.getInstance();

      manager.createSubject({ id: 's1', name: 'Subject 1' });
      manager.createSubject({ id: 's2', name: 'Subject 2' });

      manager.clear();

      expect(manager.getAllSubjects().length).toBe(0);
    });
  });

  describe('Integration', () => {
    it('should work with complex scenario', async () => {
      // Create topic hierarchy
      const appTopic = createSubject({
        id: 'app',
        name: 'App Events',
        enableHierarchy: true,
      });
      const userTopic = createSubject({
        id: 'app.user',
        name: 'User Events',
        parentId: 'app',
      });

      userTopic.setParent(appTopic);

      const logs: string[] = [];

      // Global logger
      appTopic.attach(
        createObserver({
          name: 'Global Logger',
          priority: 'low',
          onUpdate: (data, topic) => {
            logs.push(`[GLOBAL] ${topic}: ${JSON.stringify(data)}`);
          },
        })
      );

      // User event handler
      userTopic.attach(
        createObserver({
          name: 'User Handler',
          priority: 'high',
          onUpdate: (data) => {
            logs.push(`[USER] ${data.action}`);
          },
        })
      );

      // Notify
      await userTopic.notify({ action: 'login', userId: 123 });

      expect(logs.length).toBe(2);
      expect(logs).toContain('[USER] login');
      expect(logs[0]).toMatch(/\[USER\] login/);
    });
  });

  describe('Examples', () => {
    it('should run basic example without errors', () => {
      expect(() => ObserverPatternExamples.basic()).not.toThrow();
    });

    it('should run async example without errors', async () => {
      await expect(ObserverPatternExamples.async()).resolves.not.toThrow();
    });

    it('should run hierarchy example without errors', () => {
      expect(() => ObserverPatternExamples.hierarchy()).not.toThrow();
    });

    it('should run priority example without errors', async () => {
      await expect(ObserverPatternExamples.priority()).resolves.not.toThrow();
    });

    it('should run error handling example without errors', async () => {
      await expect(ObserverPatternExamples.errorHandling()).resolves.not.toThrow();
    });
  });
});

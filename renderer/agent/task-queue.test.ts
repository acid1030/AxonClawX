/**
 * TaskQueue 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskQueue } from './task-queue';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue();
  });

  describe('enqueue', () => {
    it('should add a task to the queue', () => {
      const task = queue.enqueue({
        id: 'task-1',
        label: 'Test Task',
        priority: 'P1',
        status: 'pending',
      });

      expect(task.id).toBe('task-1');
      expect(task.label).toBe('Test Task');
      expect(task.status).toBe('pending');
      expect(task.createdAt).toBeDefined();
    });

    it('should auto-set createdAt timestamp', () => {
      const before = Date.now();
      const task = queue.enqueue({
        id: 'task-1',
        label: 'Test',
        priority: 'P0',
        status: 'pending',
      });
      const after = Date.now();

      expect(task.createdAt).toBeGreaterThanOrEqual(before);
      expect(task.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('dequeue', () => {
    it('should return null when queue is empty', () => {
      expect(queue.dequeue()).toBeNull();
    });

    it('should return highest priority task', () => {
      queue.enqueue({ id: '1', label: 'P2', priority: 'P2', status: 'pending' });
      queue.enqueue({ id: '2', label: 'P0', priority: 'P0', status: 'pending' });
      queue.enqueue({ id: '3', label: 'P1', priority: 'P1', status: 'pending' });

      const task = queue.dequeue();
      expect(task?.label).toBe('P0');
      expect(task?.status).toBe('running');
      expect(task?.startedAt).toBeDefined();
    });

    it('should respect FIFO within same priority', () => {
      queue.enqueue({ id: '1', label: 'First P0', priority: 'P0', status: 'pending' });
      queue.enqueue({ id: '2', label: 'Second P0', priority: 'P0', status: 'pending' });

      expect(queue.dequeue()?.label).toBe('First P0');
      expect(queue.dequeue()?.label).toBe('Second P0');
    });
  });

  describe('getStatus', () => {
    it('should return task by id', () => {
      queue.enqueue({ id: 'task-1', label: 'Test', priority: 'P1', status: 'pending' });

      const status = queue.getStatus('task-1');
      expect(status).toBeDefined();
      expect(status?.label).toBe('Test');
    });

    it('should return undefined for non-existent task', () => {
      expect(queue.getStatus('non-existent')).toBeUndefined();
    });
  });

  describe('list', () => {
    beforeEach(() => {
      queue.enqueue({ id: '1', label: 'P0 Task', priority: 'P0', status: 'pending', assignedTo: 'A' });
      queue.enqueue({ id: '2', label: 'P1 Task', priority: 'P1', status: 'running', assignedTo: 'B' });
      queue.enqueue({ id: '3', label: 'P2 Task', priority: 'P2', status: 'done', assignedTo: 'A' });
    });

    it('should return all tasks without filters', () => {
      const all = queue.list();
      expect(all.length).toBe(3);
    });

    it('should filter by status', () => {
      const pending = queue.list({ status: 'pending' });
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('1');
    });

    it('should filter by priority', () => {
      const p0 = queue.list({ priority: 'P0' });
      expect(p0.length).toBe(1);
      expect(p0[0].label).toBe('P0 Task');
    });

    it('should filter by assignedTo', () => {
      const aTasks = queue.list({ assignedTo: 'A' });
      expect(aTasks.length).toBe(2);
    });

    it('should filter by label substring', () => {
      const pTasks = queue.list({ label: 'P1' });
      expect(pTasks.length).toBe(1);
      expect(pTasks[0].label).toBe('P1 Task');
    });

    it('should sort by priority then createdAt', () => {
      const all = queue.list();
      expect(all[0].priority).toBe('P0');
      expect(all[1].priority).toBe('P1');
      expect(all[2].priority).toBe('P2');
    });
  });

  describe('updateStatus', () => {
    it('should update task status', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });

      const updated = queue.updateStatus('1', 'running');
      expect(updated?.status).toBe('running');

      const status = queue.getStatus('1');
      expect(status?.status).toBe('running');
    });

    it('should set completedAt when done', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });
      queue.updateStatus('1', 'done');

      const task = queue.getStatus('1');
      expect(task?.completedAt).toBeDefined();
    });

    it('should set error message', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });
      queue.updateStatus('1', 'failed', 'Something went wrong');

      const task = queue.getStatus('1');
      expect(task?.error).toBe('Something went wrong');
    });

    it('should return null for non-existent task', () => {
      expect(queue.updateStatus('non-existent', 'done')).toBeNull();
    });
  });

  describe('assign', () => {
    it('should assign task to worker', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });

      const assigned = queue.assign('1', 'worker-A');
      expect(assigned?.assignedTo).toBe('worker-A');
    });

    it('should return null for non-existent task', () => {
      expect(queue.assign('non-existent', 'worker-A')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a task', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });

      expect(queue.delete('1')).toBe(true);
      expect(queue.getStatus('1')).toBeUndefined();
    });

    it('should remove from pending queue', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });
      queue.delete('1');

      expect(queue.dequeue()).toBeNull();
    });

    it('should return false for non-existent task', () => {
      expect(queue.delete('non-existent')).toBe(false);
    });
  });

  describe('clearCompleted', () => {
    it('should remove done and failed tasks', () => {
      queue.enqueue({ id: '1', label: 'Done', priority: 'P1', status: 'pending' });
      queue.enqueue({ id: '2', label: 'Failed', priority: 'P1', status: 'pending' });
      queue.enqueue({ id: '3', label: 'Pending', priority: 'P1', status: 'pending' });

      queue.updateStatus('1', 'done');
      queue.updateStatus('2', 'failed');

      const count = queue.clearCompleted();
      expect(count).toBe(2);
      expect(queue.list().length).toBe(1);
      expect(queue.getStatus('3')).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      queue.enqueue({ id: '1', label: 'P0', priority: 'P0', status: 'pending' });
      queue.enqueue({ id: '2', label: 'P0', priority: 'P0', status: 'pending' });
      queue.enqueue({ id: '3', label: 'P1', priority: 'P1', status: 'running' });
      queue.enqueue({ id: '4', label: 'P2', priority: 'P2', status: 'done' });

      const stats = queue.getStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(2);
      expect(stats.running).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.failed).toBe(0);
      expect(stats.byPriority.P0).toBe(2);
      expect(stats.byPriority.P1).toBe(1);
      expect(stats.byPriority.P2).toBe(1);
    });
  });

  describe('requeue', () => {
    it('should requeue a failed task', () => {
      queue.enqueue({ id: '1', label: 'Test', priority: 'P1', status: 'pending' });
      const task = queue.dequeue();
      queue.updateStatus('1', 'failed', 'Error');

      const requeued = queue.requeue('1');
      expect(requeued?.status).toBe('pending');
      expect(requeued?.error).toBeUndefined();
      expect(requeued?.startedAt).toBeUndefined();
    });

    it('should return null for non-existent task', () => {
      expect(queue.requeue('non-existent')).toBeNull();
    });
  });

  describe('priority ordering', () => {
    it('should maintain P0 > P1 > P2 order', () => {
      const queue2 = new TaskQueue();
      
      queue2.enqueue({ id: '1', label: 'P2-1', priority: 'P2', status: 'pending' });
      queue2.enqueue({ id: '2', label: 'P0-1', priority: 'P0', status: 'pending' });
      queue2.enqueue({ id: '3', label: 'P1-1', priority: 'P1', status: 'pending' });
      queue2.enqueue({ id: '4', label: 'P0-2', priority: 'P0', status: 'pending' });
      queue2.enqueue({ id: '5', label: 'P2-2', priority: 'P2', status: 'pending' });

      const order: string[] = [];
      let task;
      while ((task = queue2.dequeue())) {
        order.push(task.label);
      }

      expect(order).toEqual(['P0-1', 'P0-2', 'P1-1', 'P2-1', 'P2-2']);
    });
  });
});

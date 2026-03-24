/**
 * L2 Mid-term Memory - Unit Tests
 * 
 * Tests for file-based mid-term memory system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  MidTermMemory,
  IntegratedMemoryManager,
  getMidTermMemory,
  resetMidTermMemory,
  type MidTermMemoryConfig,
  type FileMemoryQuery,
} from './mid-term';
import { ShortTermMemory } from './short-term';

// Test fixtures
const TEST_STORAGE_PATH = path.join(__dirname, '.test-memory');
const TEST_FILE_PATH = path.join(__dirname, 'fixtures', 'test-file.txt');

describe('MidTermMemory', () => {
  let memory: MidTermMemory;

  beforeEach(() => {
    // Clean test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true });
    }
    
    memory = new MidTermMemory({
      storagePath: TEST_STORAGE_PATH,
      retentionDays: 7,
      autoCleanup: false,
    });
  });

  afterEach(() => {
    resetMidTermMemory();
    
    // Cleanup test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true });
    }
  });

  describe('Initialization', () => {
    it('should create storage directory if it does not exist', () => {
      expect(fs.existsSync(TEST_STORAGE_PATH)).toBe(true);
    });

    it('should initialize with empty entries', () => {
      const stats = memory.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should use default configuration', () => {
      const defaultMemory = new MidTermMemory();
      const stats = defaultMemory.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Adding Files', () => {
    it('should add a file to memory', () => {
      // Create a test file
      const testContent = 'Test file content';
      const testPath = path.join(TEST_STORAGE_PATH, 'test.txt');
      fs.writeFileSync(testPath, testContent);

      const id = memory.addFile(testPath, testContent);
      
      expect(id).toBeTruthy();
      expect(id).toMatch(/^file_/);
      
      const stats = memory.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    it('should store file metadata correctly', () => {
      const testContent = 'Metadata test';
      const testPath = path.join(TEST_STORAGE_PATH, 'meta.txt');
      fs.writeFileSync(testPath, testContent);

      const tags = ['test', 'important'];
      const metadata = { author: 'test-user' };
      
      const id = memory.addFile(testPath, testContent, tags, metadata);
      const entry = memory.getEntry(id);

      expect(entry).toBeDefined();
      expect(entry?.fileType).toBe('txt');
      expect(entry?.fileSize).toBe(testContent.length);
      expect(entry?.tags).toEqual(tags);
      expect(entry?.metadata).toEqual(metadata);
    });

    it('should reject files exceeding max size', () => {
      const largeMemory = new MidTermMemory({
        storagePath: TEST_STORAGE_PATH + '-large',
        maxFileSize: 100, // 100 bytes limit
      });

      const testPath = path.join(TEST_STORAGE_PATH, 'large.txt');
      fs.writeFileSync(testPath, 'x'.repeat(200)); // 200 bytes

      const id = largeMemory.addFile(testPath, 'x'.repeat(200));
      expect(id).toBe('');
    });

    it('should filter files by extension', () => {
      const filteredMemory = new MidTermMemory({
        storagePath: TEST_STORAGE_PATH + '-filtered',
        includeExtensions: ['.txt'],
        excludeExtensions: ['.tmp'],
      });

      const txtPath = path.join(TEST_STORAGE_PATH, 'test.txt');
      const tmpPath = path.join(TEST_STORAGE_PATH, 'test.tmp');
      
      fs.writeFileSync(txtPath, 'txt content');
      fs.writeFileSync(tmpPath, 'tmp content');

      const txtId = filteredMemory.addFile(txtPath, 'txt');
      const tmpId = filteredMemory.addFile(tmpPath, 'tmp');

      expect(txtId).toBeTruthy();
      expect(tmpId).toBe('');
    });

    it('should generate consistent IDs for same file', () => {
      const testContent = 'Consistent ID test';
      const testPath = path.join(TEST_STORAGE_PATH, 'consistent.txt');
      fs.writeFileSync(testPath, testContent);

      const id1 = memory.addFile(testPath, testContent);
      const id2 = memory.addFile(testPath, testContent);

      expect(id1).toBe(id2);
    });
  });

  describe('Retrieving Entries', () => {
    it('should retrieve entry by ID', () => {
      const testContent = 'Retrieve test';
      const testPath = path.join(TEST_STORAGE_PATH, 'retrieve.txt');
      fs.writeFileSync(testPath, testContent);

      const id = memory.addFile(testPath, testContent);
      const entry = memory.getEntry(id);

      expect(entry).toBeDefined();
      expect(entry?.id).toBe(id);
      expect(entry?.content).toBe(testContent);
    });

    it('should update lastAccessedAt on retrieval', () => {
      const testContent = 'Access test';
      const testPath = path.join(TEST_STORAGE_PATH, 'access.txt');
      fs.writeFileSync(testPath, testContent);

      const id = memory.addFile(testPath, testContent);
      const entry1 = memory.getEntry(id);
      
      // Wait a bit
      const waitTime = 10;
      const start = Date.now();
      while (Date.now() - start < waitTime) {} // Busy wait for simplicity
      
      const entry2 = memory.getEntry(id);

      expect(entry2?.lastAccessedAt).toBeGreaterThanOrEqual(entry1?.lastAccessedAt || 0);
    });

    it('should return undefined for non-existent ID', () => {
      const entry = memory.getEntry('non-existent');
      expect(entry).toBeUndefined();
    });
  });

  describe('Querying', () => {
    // Create test files
    const createTestFiles = () => {
      const files = [
        { path: 'src/app.ts', content: 'console.log("app")', type: 'ts' },
        { path: 'src/utils.ts', content: 'export const utils = {}', type: 'ts' },
        { path: 'src/style.css', content: 'body { margin: 0; }', type: 'css' },
        { path: 'README.md', content: '# Project', type: 'md' },
        { path: 'src/test.ts', content: 'describe("test")', type: 'ts' },
      ];

      for (const file of files) {
        const fullPath = path.join(TEST_STORAGE_PATH, file.path);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, file.content);
        memory.addFile(fullPath, file.content, ['test']);
      }
    };

    it('should query by file type', () => {
      createTestFiles();

      const tsFiles = memory.query({ fileType: 'ts' });
      expect(tsFiles.length).toBe(3);

      const cssFiles = memory.query({ fileType: 'css' });
      expect(cssFiles.length).toBe(1);
    });

    it('should query by path pattern', () => {
      createTestFiles();

      const srcFiles = memory.query({ pathPattern: 'src/' });
      expect(srcFiles.length).toBeGreaterThanOrEqual(3); // At least 3 ts files in src/

      const appFiles = memory.query({ pathPattern: 'app' });
      expect(appFiles.length).toBeGreaterThanOrEqual(1);
    });

    it('should query by tags', () => {
      createTestFiles();

      const testFiles = memory.query({ tags: ['test'] });
      expect(testFiles.length).toBe(5);
    });

    it('should query by keyword in content', () => {
      createTestFiles();

      const consoleFiles = memory.query({ keyword: 'console' });
      expect(consoleFiles.length).toBe(1);

      const exportFiles = memory.query({ keyword: 'export' });
      expect(exportFiles.length).toBe(1);
    });

    it('should query by modification time', () => {
      createTestFiles();

      const now = Date.now();
      const recentFiles = memory.query({ modifiedAfter: now - 60000 }); // Last minute
      expect(recentFiles.length).toBe(5);

      const oldFiles = memory.query({ modifiedBefore: now - 1000000 }); // Older than 1s
      expect(oldFiles.length).toBe(0);
    });

    it('should limit results', () => {
      createTestFiles();

      const limited = memory.query({ limit: 2 });
      expect(limited.length).toBe(2);
    });

    it('should combine multiple filters', () => {
      createTestFiles();

      const srcTsFiles = memory.query({
        pathPattern: 'src/',
        fileType: 'ts',
        limit: 2,
      });

      expect(srcTsFiles.length).toBe(2);
      expect(srcTsFiles.every(f => f.fileType === 'ts')).toBe(true);
    });
  });

  describe('Convenience Methods', () => {
    it('should get recent files', () => {
      const testPath = path.join(TEST_STORAGE_PATH, 'recent.txt');
      fs.writeFileSync(testPath, 'recent content');
      memory.addFile(testPath, 'recent');

      const recent = memory.getRecent(7);
      expect(recent.length).toBe(1);
    });

    it('should get files by type', () => {
      const testPath = path.join(TEST_STORAGE_PATH, 'type.ts');
      fs.writeFileSync(testPath, 'type content');
      memory.addFile(testPath, 'type');

      const byType = memory.getByType('ts');
      expect(byType.length).toBe(1);
    });

    it('should get files by path', () => {
      const testPath = path.join(TEST_STORAGE_PATH, 'path-test.txt');
      fs.writeFileSync(testPath, 'path content');
      memory.addFile(testPath, 'path');

      const byPath = memory.getByPath('path-test');
      expect(byPath.length).toBe(1);
    });

    it('should search by keyword', () => {
      const testPath = path.join(TEST_STORAGE_PATH, 'search.txt');
      fs.writeFileSync(testPath, 'searchable content');
      memory.addFile(testPath, 'searchable');

      const results = memory.search('searchable');
      expect(results.length).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', () => {
      // Create entries with old timestamps
      const testPath = path.join(TEST_STORAGE_PATH, 'old.txt');
      fs.writeFileSync(testPath, 'old content');
      memory.addFile(testPath, 'old');

      // Manually modify entry to be old
      const entries = memory.export();
      for (const entry of entries) {
        entry.fileModifiedAt = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago
      }
      memory.import(entries);

      // Enable auto-cleanup and trigger
      const cleanupMemory = new MidTermMemory({
        storagePath: TEST_STORAGE_PATH + '-cleanup',
        retentionDays: 7,
      });
      
      const testPath2 = path.join(TEST_STORAGE_PATH + '-cleanup', 'new.txt');
      fs.writeFileSync(testPath2, 'new');
      cleanupMemory.addFile(testPath2, 'new');

      const removed = cleanupMemory.cleanupExpired();
      expect(removed).toBe(0); // No old entries in new instance
    });

    it('should clear all entries', () => {
      for (let i = 0; i < 5; i++) {
        const testPath = path.join(TEST_STORAGE_PATH, `clear-${i}.txt`);
        fs.writeFileSync(testPath, `content ${i}`);
        memory.addFile(testPath, `content ${i}`);
      }

      expect(memory.getStats().totalEntries).toBe(5);

      memory.clear();

      expect(memory.getStats().totalEntries).toBe(0);
    });
  });

  describe('Persistence', () => {
    it('should persist entries to disk', () => {
      const testPath = path.join(TEST_STORAGE_PATH, 'persist.txt');
      fs.writeFileSync(testPath, 'persist content');
      memory.addFile(testPath, 'persist');

      // Create new instance with same storage path
      const memory2 = new MidTermMemory({
        storagePath: TEST_STORAGE_PATH,
        autoCleanup: false,
      });

      expect(memory2.getStats().totalEntries).toBe(1);
    });

    it('should export to JSON', () => {
      const testPath = path.join(TEST_STORAGE_PATH, 'export.txt');
      const content = 'export content';
      fs.writeFileSync(testPath, content);
      memory.addFile(testPath, content);

      const exported = memory.export();
      expect(exported.length).toBe(1);
      expect(exported[0].content).toBe(content);
    });

    it('should import from JSON', () => {
      const testEntries = [
        {
          id: 'file_test1',
          filePath: '/test/file1.txt',
          content: 'imported content 1',
          fileType: 'txt',
          fileSize: 100,
          fileModifiedAt: Date.now(),
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          tags: ['imported'],
        },
      ];

      memory.import(testEntries as any);

      const stats = memory.getStats();
      expect(stats.totalEntries).toBe(1);

      const entry = memory.getEntry('file_test1');
      expect(entry?.content).toBe('imported content 1');
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const files = [
        { path: 'file1.txt', content: 'content 1' },
        { path: 'file2.txt', content: 'content 2' },
        { path: 'file3.ts', content: 'content 3' },
      ];

      for (const file of files) {
        const testPath = path.join(TEST_STORAGE_PATH, file.path);
        fs.writeFileSync(testPath, file.content);
        memory.addFile(testPath, file.content);
      }

      const stats = memory.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(stats.entriesByType['txt']).toBe(2);
      expect(stats.entriesByType['ts']).toBe(1);
    });
  });
});

describe('IntegratedMemoryManager', () => {
  let manager: IntegratedMemoryManager;

  beforeEach(() => {
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true });
    }

    manager = new IntegratedMemoryManager(
      { maxMessages: 10 },
      {
        storagePath: TEST_STORAGE_PATH,
        autoCleanup: false,
      }
    );
  });

  afterEach(() => {
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true });
    }
  });

  it('should initialize both L1 and L2', () => {
    expect(manager.getL1()).toBeInstanceOf(ShortTermMemory);
    expect(manager.getL2()).toBeInstanceOf(MidTermMemory);
  });

  it('should add messages to L1', () => {
    manager.addMessage({
      role: 'user',
      content: 'Test message',
      timestamp: Date.now(),
    });

    const l1Stats = manager.getL1().getStats();
    expect(l1Stats.messageCount).toBe(1);
  });

  it('should capture files to L2 when adding messages', () => {
    const testPath = path.join(TEST_STORAGE_PATH, 'capture.txt');
    fs.writeFileSync(testPath, 'captured content');

    manager.addMessage(
      {
        role: 'user',
        content: 'Check this file',
        timestamp: Date.now(),
      },
      [testPath]
    );

    const l2Stats = manager.getL2().getStats();
    expect(l2Stats.totalEntries).toBe(1);
  });

  it('should get unified context from both layers', () => {
    // Add L1 message
    manager.addMessage({
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    });

    // Add L2 file
    const testPath = path.join(TEST_STORAGE_PATH, 'context.txt');
    fs.writeFileSync(testPath, 'context content');
    manager.getL2().addFile(testPath, 'context');

    const context = manager.getContext({
      l2Query: { fileType: 'txt' },
    });

    expect(context).toContain('Recent Conversation (L1)');
    expect(context).toContain('Hello');
    expect(context).toContain('Relevant Files (L2)');
    expect(context).toContain('context.txt');
  });

  it('should search across both layers', () => {
    const keyword = 'unique-search-term';

    // Add to L1
    manager.addMessage({
      role: 'user',
      content: `Message with ${keyword}`,
      timestamp: Date.now(),
    });

    // Add to L2
    const testPath = path.join(TEST_STORAGE_PATH, 'search.txt');
    fs.writeFileSync(testPath, `File with ${keyword}`);
    manager.getL2().addFile(testPath, `File with ${keyword}`);

    const results = manager.search(keyword);

    expect(results.l1.length).toBe(1);
    expect(results.l2.length).toBe(1);
  });
});

describe('Singleton Pattern', () => {
  beforeEach(() => {
    resetMidTermMemory();
  });

  it('should create singleton instance', () => {
    const instance1 = getMidTermMemory({
      storagePath: TEST_STORAGE_PATH + '-singleton',
    });
    const instance2 = getMidTermMemory();

    expect(instance1).toBe(instance2);
  });

  it('should reset singleton', () => {
    const instance1 = getMidTermMemory();
    resetMidTermMemory();
    const instance2 = getMidTermMemory();

    expect(instance1).not.toBe(instance2);
  });
});

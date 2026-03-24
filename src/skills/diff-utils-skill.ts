/**
 * 文本差异比较工具技能
 * 
 * 功能:
 * 1. 文本 Diff 生成 (generateDiff)
 * 2. Patch 应用 (applyPatch)
 * 3. 合并冲突检测 (detectConflicts)
 * 
 * @module skills/diff-utils
 */

// ==================== 类型定义 ====================

/**
 * Diff 操作类型
 */
export type DiffOperationType = 'equal' | 'insert' | 'delete' | 'replace';

/**
 * 单个 Diff 操作
 */
export interface DiffOperation {
  /** 操作类型 */
  type: DiffOperationType;
  /** 起始行号 (1-indexed) */
  startLine: number;
  /** 结束行号 (1-indexed) */
  endLine: number;
  /** 原始文本 */
  oldText?: string[];
  /** 新文本 */
  newText?: string[];
}

/**
 * Diff 结果
 */
export interface DiffResult {
  /** 是否有差异 */
  hasChanges: boolean;
  /** 差异操作列表 */
  operations: DiffOperation[];
  /** 统计信息 */
  stats: {
    /** 添加的行数 */
    additions: number;
    /** 删除的行数 */
    deletions: number;
    /** 修改的行数 */
    changes: number;
  };
  /** Unified Diff 格式输出 */
  unifiedDiff: string;
}

/**
 * Patch 应用选项
 */
export interface PatchOptions {
  /** 是否严格模式 (失败时抛出错误)，默认 true */
  strict?: boolean;
  /** 是否反转 patch (应用反向更改)，默认 false */
  reverse?: boolean;
}

/**
 * Patch 应用结果
 */
export interface PatchResult {
  /** 是否成功 */
  success: boolean;
  /** 应用后的文本 */
  result?: string;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings: string[];
}

/**
 * 合并冲突
 */
export interface MergeConflict {
  /** 冲突起始行号 */
  startLine: number;
  /** 冲突结束行号 */
  endLine: number;
  /** 当前分支的更改 */
  current: string[];
  /** 传入分支的更改 */
  incoming: string[];
  /** 共同祖先 (如果有) */
  base?: string[];
}

/**
 * 合并结果
 */
export interface MergeResult {
  /** 是否成功 (无冲突) */
  success: boolean;
  /** 合并后的文本 */
  result?: string;
  /** 冲突列表 */
  conflicts: MergeConflict[];
  /** 统计信息 */
  stats: {
    /** 自动合并的行数 */
    autoMerged: number;
    /** 冲突数量 */
    conflictCount: number;
  };
}

/**
 * Diff 生成选项
 */
export interface DiffOptions {
  /** 是否忽略空白，默认 false */
  ignoreWhitespace?: boolean;
  /** 是否忽略大小写，默认 false */
  ignoreCase?: boolean;
  /** 上下文行数 (用于 unified diff)，默认 3 */
  contextLines?: number;
  /** 是否生成详细统计，默认 true */
  detailedStats?: boolean;
}

// ==================== 文本 Diff 生成 ====================

/**
 * 将文本分割为行
 */
function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

/**
 * 计算最长公共子序列 (LCS)
 */
function computeLCS(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  
  // 创建 LCS 矩阵
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp;
}

/**
 * 从 LCS 矩阵提取 Diff 操作
 */
function extractDiffOperations(
  oldLines: string[],
  newLines: string[],
  lcs: number[][]
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let i = oldLines.length;
  let j = newLines.length;
  
  const tempOps: Array<{ type: DiffOperationType; line: number; text: string }> = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      tempOps.push({ type: 'equal', line: i, text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      tempOps.push({ type: 'insert', line: i + 1, text: newLines[j - 1] });
      j--;
    } else {
      tempOps.push({ type: 'delete', line: i, text: oldLines[i - 1] });
      i--;
    }
  }
  
  // 反转并合并连续的操作
  tempOps.reverse();
  
  let currentOp: DiffOperation | null = null;
  
  for (const op of tempOps) {
    if (currentOp === null || currentOp.type !== op.type) {
      if (currentOp !== null) {
        operations.push(currentOp);
      }
      currentOp = {
        type: op.type,
        startLine: op.line,
        endLine: op.line,
        oldText: op.type === 'delete' ? [op.text] : undefined,
        newText: op.type === 'insert' ? [op.text] : undefined,
      };
    } else {
      currentOp.endLine = op.line;
      if (op.type === 'delete') {
        currentOp.oldText!.push(op.text);
      } else if (op.type === 'insert') {
        currentOp.newText!.push(op.text);
      }
    }
  }
  
  if (currentOp !== null) {
    operations.push(currentOp);
  }
  
  // 合并连续的 delete+insert 为 replace
  const mergedOps: DiffOperation[] = [];
  for (let idx = 0; idx < operations.length; idx++) {
    const op = operations[idx];
    if (op.type === 'delete' && idx + 1 < operations.length && operations[idx + 1].type === 'insert') {
      const nextOp = operations[idx + 1];
      if (op.endLine + 1 >= nextOp.startLine) {
        mergedOps.push({
          type: 'replace',
          startLine: op.startLine,
          endLine: op.endLine,
          oldText: op.oldText,
          newText: nextOp.newText,
        });
        idx++; // 跳过下一个操作
        continue;
      }
    }
    mergedOps.push(op);
  }
  
  return mergedOps;
}

/**
 * 生成 Unified Diff 格式
 */
function generateUnifiedDiff(
  oldText: string,
  newText: string,
  operations: DiffOperation[],
  contextLines: number = 3
): string {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  
  if (operations.length === 0) {
    return '';
  }
  
  const output: string[] = [];
  output.push('--- original');
  output.push('+++ modified');
  
  // 生成 hunks
  let lineOffset = 0;
  
  for (const op of operations) {
    const contextStart = Math.max(1, op.startLine - contextLines);
    const contextEnd = Math.min(oldLines.length, op.endLine + contextLines);
    
    // Hunk header
    const oldStart = contextStart;
    const oldCount = contextEnd - contextStart + 1;
    const newStart = contextStart + lineOffset;
    const newCount = oldCount + (op.newText?.length || 0) - (op.oldText?.length || 0);
    
    output.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`);
    
    // 输出上下文和更改
    for (let i = contextStart - 1; i < contextEnd; i++) {
      if (i < op.startLine - 1 || i >= op.endLine) {
        // 上下文行
        output.push(` ${oldLines[i]}`);
      } else if (op.type === 'delete' || op.type === 'replace') {
        // 删除的行
        if (op.oldText) {
          for (const line of op.oldText) {
            output.push(`-${line}`);
          }
        }
      }
      if (op.type === 'insert' || op.type === 'replace') {
        // 添加的行
        if (op.newText) {
          for (const line of op.newText) {
            output.push(`+${line}`);
          }
        }
      }
    }
    
    lineOffset += (op.newText?.length || 0) - (op.oldText?.length || 0);
  }
  
  return output.join('\n');
}

/**
 * 生成文本 Diff
 * 
 * @param oldText 原始文本
 * @param newText 新文本
 * @param options Diff 选项
 * @returns Diff 结果
 */
export function generateDiff(
  oldText: string,
  newText: string,
  options: DiffOptions = {}
): DiffResult {
  const {
    ignoreWhitespace = false,
    ignoreCase = false,
    contextLines = 3,
    detailedStats = true,
  } = options;
  
  // 预处理文本
  let oldLines = splitLines(oldText);
  let newLines = splitLines(newText);
  
  if (ignoreWhitespace) {
    oldLines = oldLines.map(line => line.trim());
    newLines = newLines.map(line => line.trim());
  }
  
  if (ignoreCase) {
    oldLines = oldLines.map(line => line.toLowerCase());
    newLines = newLines.map(line => line.toLowerCase());
  }
  
  // 计算 LCS
  const lcs = computeLCS(oldLines, newLines);
  
  // 提取 Diff 操作
  const operations = extractDiffOperations(oldLines, newLines, lcs);
  
  // 计算统计
  let additions = 0;
  let deletions = 0;
  let changes = 0;
  
  for (const op of operations) {
    if (op.type === 'insert') {
      additions += op.newText?.length || 0;
    } else if (op.type === 'delete') {
      deletions += op.oldText?.length || 0;
    } else if (op.type === 'replace') {
      changes += Math.max(op.oldText?.length || 0, op.newText?.length || 0);
    }
  }
  
  const hasChanges = operations.some(op => op.type !== 'equal');
  
  // 生成 Unified Diff
  const unifiedDiff = hasChanges 
    ? generateUnifiedDiff(oldText, newText, operations, contextLines)
    : '';
  
  return {
    hasChanges,
    operations,
    stats: {
      additions,
      deletions,
      changes,
    },
    unifiedDiff,
  };
}

// ==================== Patch 应用 ====================

/**
 * 解析 Unified Diff
 */
function parseUnifiedDiff(diff: string): Array<{
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: Array<{ type: 'context' | 'add' | 'delete'; content: string }>;
}> {
  const hunks: Array<{
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    lines: Array<{ type: 'context' | 'add' | 'delete'; content: string }>;
  }> = [];
  
  const lines = diff.split(/\r?\n/);
  let currentHunk: typeof hunks[0] | null = null;
  
  for (const line of lines) {
    if (line.startsWith('@@')) {
      // 解析 hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        if (currentHunk) {
          hunks.push(currentHunk);
        }
        currentHunk = {
          oldStart: parseInt(match[1]),
          oldCount: parseInt(match[2] || '1'),
          newStart: parseInt(match[3]),
          newCount: parseInt(match[4] || '1'),
          lines: [],
        };
      }
    } else if (currentHunk) {
      if (line.startsWith(' ')) {
        currentHunk.lines.push({ type: 'context', content: line.slice(1) });
      } else if (line.startsWith('+')) {
        currentHunk.lines.push({ type: 'add', content: line.slice(1) });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({ type: 'delete', content: line.slice(1) });
      }
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk);
  }
  
  return hunks;
}

/**
 * 应用 Patch 到文本
 * 
 * @param originalText 原始文本
 * @param patch Unified Diff 格式的 patch
 * @param options Patch 选项
 * @returns Patch 应用结果
 */
export function applyPatch(
  originalText: string,
  patch: string,
  options: PatchOptions = {}
): PatchResult {
  const { strict = true, reverse = false } = options;
  const warnings: string[] = [];
  
  if (!patch.trim()) {
    return {
      success: true,
      result: originalText,
      warnings,
    };
  }
  
  try {
    const hunks = parseUnifiedDiff(patch);
    const lines = splitLines(originalText);
    let lineOffset = 0;
    
    for (const hunk of hunks) {
      let oldPos = hunk.oldStart - 1 + lineOffset;
      let newPos = hunk.newStart - 1;
      
      if (reverse) {
        // 反转 patch: 交换添加和删除
        for (const hunkLine of hunk.lines) {
          if (hunkLine.type === 'add') {
            hunkLine.type = 'delete';
          } else if (hunkLine.type === 'delete') {
            hunkLine.type = 'add';
          }
        }
        // 交换 old 和 new
        const tempStart = hunk.oldStart;
        const tempCount = hunk.oldCount;
        hunk.oldStart = hunk.newStart;
        hunk.oldCount = hunk.newCount;
        hunk.newStart = tempStart;
        hunk.newCount = tempCount;
      }
      
      // 验证上下文
      for (const hunkLine of hunk.lines) {
        if (hunkLine.type === 'context' || hunkLine.type === 'delete') {
          if (oldPos >= lines.length) {
            const msg = `行 ${oldPos + 1} 超出范围`;
            if (strict) {
              throw new Error(msg);
            }
            warnings.push(msg);
            break;
          }
          
          if (hunkLine.type === 'context' && lines[oldPos] !== hunkLine.content) {
            const msg = `上下文不匹配于行 ${oldPos + 1}: 期望 "${hunkLine.content}", 实际 "${lines[oldPos]}"`;
            if (strict) {
              throw new Error(msg);
            }
            warnings.push(msg);
          }
          oldPos++;
        }
      }
      
      // 应用更改
      const newLines: string[] = [];
      oldPos = hunk.oldStart - 1 + lineOffset;
      
      for (const hunkLine of hunk.lines) {
        if (hunkLine.type === 'context') {
          newLines.push(lines[oldPos]);
          oldPos++;
          newPos++;
        } else if (hunkLine.type === 'delete') {
          oldPos++;
          lineOffset--;
        } else if (hunkLine.type === 'add') {
          newLines.push(hunkLine.content);
          newPos++;
          lineOffset++;
        }
      }
      
      // 替换原行
      const deleteCount = hunk.oldCount;
      lines.splice(hunk.oldStart - 1, deleteCount, ...newLines);
    }
    
    return {
      success: true,
      result: lines.join('\n'),
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      warnings,
    };
  }
}

// ==================== 合并冲突检测 ====================

/**
 * 三向合并
 * 
 * @param base 共同祖先
 * @param current 当前分支
 * @param incoming 传入分支
 * @returns 合并结果
 */
export function threeWayMerge(
  base: string,
  current: string,
  incoming: string
): MergeResult {
  const baseLines = splitLines(base);
  const currentLines = splitLines(current);
  const incomingLines = splitLines(incoming);
  
  // 生成 base -> current 的 diff
  const currentDiff = generateDiff(base, current, { contextLines: 0 });
  
  // 生成 base -> incoming 的 diff
  const incomingDiff = generateDiff(base, incoming, { contextLines: 0 });
  
  const conflicts: MergeConflict[] = [];
  const resultLines = [...currentLines];
  let autoMerged = 0;
  
  // 检查冲突
  const currentOps = currentDiff.operations;
  const incomingOps = incomingDiff.operations;
  
  for (const currOp of currentOps) {
    if (currOp.type === 'equal') continue;
    
    for (const incOp of incomingOps) {
      if (incOp.type === 'equal') continue;
      
      // 检查是否有重叠
      const currStart = currOp.startLine;
      const currEnd = currOp.endLine;
      const incStart = incOp.startLine;
      const incEnd = incOp.endLine;
      
      // 重叠检测
      if (currStart <= incEnd && incStart <= currEnd) {
        // 检测是否是相同的更改
        const currText = currOp.newText?.join('\n') || '';
        const incText = incOp.newText?.join('\n') || '';
        
        if (currText !== incText) {
          // 真正的冲突
          conflicts.push({
            startLine: Math.min(currStart, incStart),
            endLine: Math.max(currEnd, incEnd),
            current: currOp.newText || [],
            incoming: incOp.newText || [],
            base: currOp.oldText,
          });
        } else {
          autoMerged++;
        }
      }
    }
  }
  
  if (conflicts.length > 0) {
    // 生成带冲突标记的结果
    const outputLines: string[] = [];
    let lineIdx = 0;
    
    for (const currentLine of currentLines) {
      const conflict = conflicts.find(
        c => lineIdx + 1 >= c.startLine && lineIdx + 1 <= c.endLine
      );
      
      if (conflict && lineIdx + 1 === conflict.startLine) {
        outputLines.push('<<<<<<< CURRENT');
        outputLines.push(...conflict.current);
        outputLines.push('=======');
        outputLines.push(...conflict.incoming);
        outputLines.push('>>>>>>> INCOMING');
        lineIdx = conflict.endLine;
      } else {
        outputLines.push(currentLine);
        lineIdx++;
      }
    }
    
    return {
      success: false,
      result: outputLines.join('\n'),
      conflicts,
      stats: {
        autoMerged,
        conflictCount: conflicts.length,
      },
    };
  }
  
  // 无冲突，应用 incoming 的更改到 current
  const patchResult = applyPatch(current, incomingDiff.unifiedDiff, { strict: false });
  
  return {
    success: patchResult.success,
    result: patchResult.result,
    conflicts: [],
    stats: {
      autoMerged: currentOps.length,
      conflictCount: 0,
    },
  };
}

/**
 * 检测两个 diff 之间的冲突
 * 
 * @param oldText 原始文本
 * @param newText1 第一个版本的文本
 * @param newText2 第二个版本的文本
 * @returns 合并结果
 */
export function detectConflicts(
  oldText: string,
  newText1: string,
  newText2: string
): MergeResult {
  return threeWayMerge(oldText, newText1, newText2);
}

/**
 * 生成冲突标记格式的文本
 * 
 * @param current 当前版本
 * @param incoming 传入版本
 * @param base 共同祖先 (可选)
 * @returns 带冲突标记的文本
 */
export function formatConflicts(
  current: string[],
  incoming: string[],
  base?: string[]
): string {
  const lines: string[] = [
    '<<<<<<< CURRENT',
    ...current,
    '=======',
    ...incoming,
    '>>>>>>> INCOMING',
  ];
  
  if (base) {
    lines.splice(2, 0, '^^^^^^^ BASE');
    lines.splice(2, 0, ...base);
  }
  
  return lines.join('\n');
}

// ==================== 工具函数 ====================

/**
 * 将 Diff 结果转换为可读格式
 */
export function formatDiffSummary(diff: DiffResult): string {
  if (!diff.hasChanges) {
    return '✅ 无差异';
  }
  
  const lines: string[] = [
    `📊 Diff 统计:`,
    `  +${diff.stats.additions} 添加`,
    `  -${diff.stats.deletions} 删除`,
    `  ~${diff.stats.changes} 修改`,
    ``,
    `操作数：${diff.operations.length}`,
  ];
  
  if (diff.unifiedDiff) {
    lines.push(``, `--- Unified Diff ---`, diff.unifiedDiff);
  }
  
  return lines.join('\n');
}

/**
 * 验证 Patch 格式
 */
export function validatePatch(patch: string): { valid: boolean; error?: string } {
  if (!patch.trim()) {
    return { valid: true };
  }
  
  try {
    const hunks = parseUnifiedDiff(patch);
    if (hunks.length === 0) {
      return { valid: false, error: '未找到有效的 hunk' };
    }
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '无效的 Patch 格式' 
    };
  }
}

/**
 * 计算文本相似度 (0-1)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  if (text1 === text2) {
    return 1.0;
  }
  
  const diff = generateDiff(text1, text2);
  const totalLines1 = splitLines(text1).length;
  const totalLines2 = splitLines(text2).length;
  const maxLines = Math.max(totalLines1, totalLines2);
  
  if (maxLines === 0) {
    return 1.0;
  }
  
  const changedLines = diff.stats.additions + diff.stats.deletions + diff.stats.changes;
  return Math.max(0, 1 - (changedLines / maxLines));
}

// ==================== 导出 ====================

export default {
  generateDiff,
  applyPatch,
  detectConflicts,
  threeWayMerge,
  formatConflicts,
  formatDiffSummary,
  validatePatch,
  calculateSimilarity,
};

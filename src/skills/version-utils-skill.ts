/**
 * 语义化版本管理工具
 * 
 * 功能:
 * 1. 版本号解析 (parseVersion)
 * 2. 版本比较 (compareVersions, isVersionGreater, isVersionEqual)
 * 3. 版本范围匹配 (matchesVersionRange)
 * 
 * 遵循 SemVer 2.0.0 规范: https://semver.org/
 */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  raw: string;
}

export type VersionRange = 
  | { type: 'exact'; version: SemanticVersion }
  | { type: 'gte'; version: SemanticVersion }  // >=
  | { type: 'gt'; version: SemanticVersion }   // >
  | { type: 'lte'; version: SemanticVersion }  // <=
  | { type: 'lt'; version: SemanticVersion }   // <
  | { type: 'caret'; version: SemanticVersion } // ^
  | { type: 'tilde'; version: SemanticVersion } // ~
  | { type: 'wildcard'; major?: number; minor?: number } // * or x
  | { type: 'range'; min: SemanticVersion; max: SemanticVersion }; // 1.0.0 - 2.0.0

/**
 * 解析版本号字符串为 SemanticVersion 对象
 * 
 * @param version - 版本号字符串 (e.g., "1.2.3", "2.0.0-beta.1", "1.0.0+build.123")
 * @returns 解析后的 SemanticVersion 对象
 * @throws Error 如果版本号格式无效
 */
export function parseVersion(version: string): SemanticVersion {
  const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  const match = version.match(regex);
  
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || undefined,
    build: match[5] || undefined,
    raw: version,
  };
}

/**
 * 比较两个 SemanticVersion 对象
 * 
 * @param v1 - 第一个版本
 * @param v2 - 第二个版本
 * @returns -1 (v1 < v2), 0 (v1 === v2), 1 (v1 > v2)
 */
export function compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
  // 比较主版本号
  if (v1.major !== v2.major) {
    return v1.major > v2.major ? 1 : -1;
  }
  
  // 比较次版本号
  if (v1.minor !== v2.minor) {
    return v1.minor > v2.minor ? 1 : -1;
  }
  
  // 比较修订号
  if (v1.patch !== v2.patch) {
    return v1.patch > v2.patch ? 1 : -1;
  }
  
  // 比较预发布版本
  if (v1.prerelease && !v2.prerelease) {
    return -1; // 预发布版本 < 正式版本
  }
  if (!v1.prerelease && v2.prerelease) {
    return 1;
  }
  if (v1.prerelease && v2.prerelease) {
    const pre1Parts = v1.prerelease.split('.');
    const pre2Parts = v2.prerelease.split('.');
    
    for (let i = 0; i < Math.max(pre1Parts.length, pre2Parts.length); i++) {
      const p1 = pre1Parts[i];
      const p2 = pre2Parts[i];
      
      if (p1 === undefined) return -1;
      if (p2 === undefined) return 1;
      
      // 数字比较优先
      const n1 = parseInt(p1, 10);
      const n2 = parseInt(p2, 10);
      const isNum1 = !isNaN(n1);
      const isNum2 = !isNaN(n2);
      
      if (isNum1 && isNum2) {
        if (n1 !== n2) return n1 > n2 ? 1 : -1;
      } else if (isNum1) {
        return -1; // 数字 < 字符串
      } else if (isNum2) {
        return 1;
      } else {
        if (p1 !== p2) return p1 > p2 ? 1 : -1;
      }
    }
  }
  
  // 构建元数据不参与比较
  return 0;
}

/**
 * 比较两个版本号字符串
 * 
 * @param v1 - 第一个版本号字符串
 * @param v2 - 第二个版本号字符串
 * @returns -1 (v1 < v2), 0 (v1 === v2), 1 (v1 > v2)
 */
export function compareVersionStrings(v1: string, v2: string): number {
  return compareVersions(parseVersion(v1), parseVersion(v2));
}

/**
 * 判断版本 v1 是否大于 v2
 */
export function isVersionGreater(v1: string | SemanticVersion, v2: string | SemanticVersion): boolean {
  const sv1 = typeof v1 === 'string' ? parseVersion(v1) : v1;
  const sv2 = typeof v2 === 'string' ? parseVersion(v2) : v2;
  return compareVersions(sv1, sv2) > 0;
}

/**
 * 判断版本 v1 是否大于等于 v2
 */
export function isVersionGreaterOrEqual(v1: string | SemanticVersion, v2: string | SemanticVersion): boolean {
  const sv1 = typeof v1 === 'string' ? parseVersion(v1) : v1;
  const sv2 = typeof v2 === 'string' ? parseVersion(v2) : v2;
  return compareVersions(sv1, sv2) >= 0;
}

/**
 * 判断版本 v1 是否小于 v2
 */
export function isVersionLess(v1: string | SemanticVersion, v2: string | SemanticVersion): boolean {
  const sv1 = typeof v1 === 'string' ? parseVersion(v1) : v1;
  const sv2 = typeof v2 === 'string' ? parseVersion(v2) : v2;
  return compareVersions(sv1, sv2) < 0;
}

/**
 * 判断版本 v1 是否小于等于 v2
 */
export function isVersionLessOrEqual(v1: string | SemanticVersion, v2: string | SemanticVersion): boolean {
  const sv1 = typeof v1 === 'string' ? parseVersion(v1) : v1;
  const sv2 = typeof v2 === 'string' ? parseVersion(v2) : v2;
  return compareVersions(sv1, sv2) <= 0;
}

/**
 * 判断两个版本是否相等
 */
export function isVersionEqual(v1: string | SemanticVersion, v2: string | SemanticVersion): boolean {
  const sv1 = typeof v1 === 'string' ? parseVersion(v1) : v1;
  const sv2 = typeof v2 === 'string' ? parseVersion(v2) : v2;
  return compareVersions(sv1, sv2) === 0;
}

/**
 * 解析版本范围字符串
 * 
 * 支持的格式:
 * - "1.2.3" - 精确匹配
 * - ">=1.2.3" - 大于等于
 * - ">1.2.3" - 大于
 * - "<=1.2.3" - 小于等于
 * - "<1.2.3" - 小于
 * - "^1.2.3" - 兼容版本 (不改变主版本号)
 * - "~1.2.3" - 近似版本 (不改变主版本号和次版本号)
 * - "1.2.x" 或 "1.2.*" - 通配符
 * - "1.0.0 - 2.0.0" - 范围
 * 
 * @param range - 版本范围字符串
 * @returns VersionRange 对象
 */
export function parseVersionRange(range: string): VersionRange {
  const trimmed = range.trim();
  
  // 范围匹配 (1.0.0 - 2.0.0)
  const rangeMatch = trimmed.match(/^([0-9]+\.[0-9]+\.[0-9]+)\s*-\s*([0-9]+\.[0-9]+\.[0-9]+)$/);
  if (rangeMatch) {
    return {
      type: 'range',
      min: parseVersion(rangeMatch[1]),
      max: parseVersion(rangeMatch[2]),
    };
  }
  
  // 操作符匹配
  const operatorMatch = trimmed.match(/^(>=|<=|>|<|\^|~)?(.+)$/);
  if (!operatorMatch) {
    throw new Error(`Invalid version range format: ${range}`);
  }
  
  const operator = operatorMatch[1] || '';
  const versionStr = operatorMatch[2].trim();
  
  // 通配符匹配
  if (versionStr === '*' || versionStr === 'x') {
    return { type: 'wildcard' };
  }
  
  const wildcardMatch = versionStr.match(/^([0-9]+)\.([0-9]+)\.(x|\*)$/);
  if (wildcardMatch) {
    return {
      type: 'wildcard',
      major: parseInt(wildcardMatch[1], 10),
      minor: parseInt(wildcardMatch[2], 10),
    };
  }
  
  const majorWildcardMatch = versionStr.match(/^([0-9]+)\.(x|\*)$/);
  if (majorWildcardMatch) {
    return {
      type: 'wildcard',
      major: parseInt(majorWildcardMatch[1], 10),
    };
  }
  
  const version = parseVersion(versionStr);
  
  switch (operator) {
    case '>=':
      return { type: 'gte', version };
    case '>':
      return { type: 'gt', version };
    case '<=':
      return { type: 'lte', version };
    case '<':
      return { type: 'lt', version };
    case '^':
      return { type: 'caret', version };
    case '~':
      return { type: 'tilde', version };
    default:
      return { type: 'exact', version };
  }
}

/**
 * 判断版本是否匹配版本范围
 * 
 * @param version - 版本号字符串或 SemanticVersion 对象
 * @param range - 版本范围字符串或 VersionRange 对象
 * @returns boolean 是否匹配
 */
export function matchesVersionRange(
  version: string | SemanticVersion,
  range: string | VersionRange
): boolean {
  const v = typeof version === 'string' ? parseVersion(version) : version;
  const r = typeof range === 'string' ? parseVersionRange(range) : range;
  
  switch (r.type) {
    case 'exact':
      return isVersionEqual(v, r.version);
    
    case 'gte':
      return isVersionGreaterOrEqual(v, r.version);
    
    case 'gt':
      return isVersionGreater(v, r.version);
    
    case 'lte':
      return isVersionLessOrEqual(v, r.version);
    
    case 'lt':
      return isVersionLess(v, r.version);
    
    case 'caret': {
      // ^1.2.3 匹配 >=1.2.3 且 <2.0.0
      const min = r.version;
      const max = parseVersion(`${min.major + 1}.0.0`);
      return isVersionGreaterOrEqual(v, min) && isVersionLess(v, max);
    }
    
    case 'tilde': {
      // ~1.2.3 匹配 >=1.2.3 且 <1.3.0
      const min = r.version;
      const max = parseVersion(`${min.major}.${min.minor + 1}.0`);
      return isVersionGreaterOrEqual(v, min) && isVersionLess(v, max);
    }
    
    case 'wildcard': {
      if (r.major === undefined && r.minor === undefined) {
        return true; // * 匹配所有
      }
      if (r.minor === undefined) {
        return v.major === r.major; // 1.x 匹配所有 1.x.x
      }
      return v.major === r.major && v.minor === r.minor; // 1.2.x 匹配所有 1.2.x
    }
    
    case 'range':
      return isVersionGreaterOrEqual(v, r.min) && isVersionLessOrEqual(v, r.max);
    
    default:
      return false;
  }
}

/**
 * 获取满足版本范围的最新版本
 * 
 * @param versions - 版本号数组
 * @param range - 版本范围字符串
 * @returns 匹配的最新版本号，如果没有匹配则返回 null
 */
export function findLatestMatchingVersion(versions: string[], range: string): string | null {
  const matchingVersions = versions.filter(v => matchesVersionRange(v, range));
  
  if (matchingVersions.length === 0) {
    return null;
  }
  
  return matchingVersions.reduce((latest, current) => {
    return isVersionGreater(current, latest) ? current : latest;
  });
}

/**
 * 将 SemanticVersion 对象转换为字符串
 */
export function versionToString(version: SemanticVersion): string {
  let result = `${version.major}.${version.minor}.${version.patch}`;
  if (version.prerelease) {
    result += `-${version.prerelease}`;
  }
  if (version.build) {
    result += `+${version.build}`;
  }
  return result;
}

/**
 * 版本号自增
 * 
 * @param version - 版本号字符串
 * @param level - 自增级别 ('major' | 'minor' | 'patch')
 * @returns 自增后的版本号字符串
 */
export function incrementVersion(version: string, level: 'major' | 'minor' | 'patch'): string {
  const v = parseVersion(version);
  
  switch (level) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例代码
 * 
 * 运行方式：直接执行此文件或在其他模块中导入使用
 */
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('version-utils-skill.ts')) {
  console.log('🔧 语义化版本管理工具 - 使用示例\n');
  
  // 1. 版本号解析
  console.log('📋 1. 版本号解析');
  console.log('─'.repeat(50));
  const v1 = parseVersion('1.2.3');
  console.log('parseVersion("1.2.3"):', v1);
  
  const v2 = parseVersion('2.0.0-beta.1');
  console.log('parseVersion("2.0.0-beta.1"):', v2);
  
  const v3 = parseVersion('1.0.0+build.123');
  console.log('parseVersion("1.0.0+build.123"):', v3);
  
  // 2. 版本比较
  console.log('\n📊 2. 版本比较');
  console.log('─'.repeat(50));
  console.log('compareVersionStrings("1.2.3", "1.2.4"):', compareVersionStrings('1.2.3', '1.2.4'));
  console.log('compareVersionStrings("2.0.0", "1.9.9"):', compareVersionStrings('2.0.0', '1.9.9'));
  console.log('compareVersionStrings("1.0.0", "1.0.0"):', compareVersionStrings('1.0.0', '1.0.0'));
  console.log('isVersionGreater("2.0.0", "1.9.9"):', isVersionGreater('2.0.0', '1.9.9'));
  console.log('isVersionEqual("1.0.0", "1.0.0"):', isVersionEqual('1.0.0', '1.0.0'));
  console.log('isVersionLess("1.0.0-beta", "1.0.0"):', isVersionLess('1.0.0-beta', '1.0.0'));
  
  // 3. 版本范围匹配
  console.log('\n🎯 3. 版本范围匹配');
  console.log('─'.repeat(50));
  const testCases = [
    { version: '1.2.3', range: '1.2.3', expected: true },
    { version: '1.2.4', range: '>=1.2.3', expected: true },
    { version: '1.2.2', range: '>1.2.3', expected: false },
    { version: '1.5.0', range: '^1.2.3', expected: true },
    { version: '2.0.0', range: '^1.2.3', expected: false },
    { version: '1.2.8', range: '~1.2.3', expected: true },
    { version: '1.3.0', range: '~1.2.3', expected: false },
    { version: '1.2.5', range: '1.2.x', expected: true },
    { version: '1.3.0', range: '1.2.x', expected: false },
    { version: '1.5.0', range: '1.0.0 - 2.0.0', expected: true },
  ];
  
  testCases.forEach(({ version, range, expected }) => {
    const result = matchesVersionRange(version, range);
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} matchesVersionRange("${version}", "${range}") = ${result}`);
  });
  
  // 4. 查找匹配的最新版本
  console.log('\n🔍 4. 查找匹配的最新版本');
  console.log('─'.repeat(50));
  const availableVersions = ['1.0.0', '1.1.0', '1.2.0', '1.2.3', '1.3.0', '2.0.0', '2.1.0'];
  console.log('可用版本:', availableVersions.join(', '));
  
  const ranges = ['^1.2.0', '~1.2.0', '>=1.5.0', '1.x'];
  ranges.forEach(range => {
    const latest = findLatestMatchingVersion(availableVersions, range);
    console.log(`findLatestMatchingVersion(versions, "${range}") = ${latest}`);
  });
  
  // 5. 版本号自增
  console.log('\n⬆️ 5. 版本号自增');
  console.log('─'.repeat(50));
  console.log('incrementVersion("1.2.3", "major"):', incrementVersion('1.2.3', 'major'));
  console.log('incrementVersion("1.2.3", "minor"):', incrementVersion('1.2.3', 'minor'));
  console.log('incrementVersion("1.2.3", "patch"):', incrementVersion('1.2.3', 'patch'));
  
  console.log('\n✨ 所有示例执行完成!');
}

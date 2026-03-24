/**
 * Layered Architecture Skill - KAEL Engineering
 * 
 * 提供分层架构管理工具，支持层次定义、依赖规则和跨层调用验证
 * 
 * @author KAEL
 * @version 1.0.0
 */

/**
 * 架构层次枚举
 */
export enum ArchitectureLayer {
  /** 表示层 - UI/接口 */
  PRESENTATION = 'presentation',
  /** 业务层 - 业务逻辑 */
  BUSINESS = 'business',
  /** 领域层 - 领域模型 */
  DOMAIN = 'domain',
  /** 基础设施层 - 数据访问/外部服务 */
  INFRASTRUCTURE = 'infrastructure',
  /** 共享层 - 公共工具/常量 */
  SHARED = 'shared'
}

/**
 * 层次配置
 */
export interface LayerConfig {
  /** 层次名称 */
  name: ArchitectureLayer;
  /** 层次描述 */
  description: string;
  /** 允许依赖的层次 (向下依赖) */
  allowedDependencies: ArchitectureLayer[];
  /** 层次优先级 (数字越小越上层) */
  priority: number;
}

/**
 * 模块定义
 */
export interface ModuleDefinition {
  /** 模块名称 */
  name: string;
  /** 所属层次 */
  layer: ArchitectureLayer;
  /** 模块路径 */
  path: string;
  /** 依赖的模块列表 */
  dependencies: string[];
  /** 暴露的接口 */
  exports: string[];
}

/**
 * 跨层调用规则
 */
export interface CrossLayerRule {
  /** 源层次 */
  from: ArchitectureLayer;
  /** 目标层次 */
  to: ArchitectureLayer;
  /** 是否允许 */
  allowed: boolean;
  /** 规则描述 */
  description?: string;
}

/**
 * 分层架构管理器
 */
class LayeredArchitectureManager {
  private layers: Map<ArchitectureLayer, LayerConfig> = new Map();
  private modules: Map<string, ModuleDefinition> = new Map();
  private rules: CrossLayerRule[] = [];
  private initialized: boolean = false;

  /**
   * 初始化默认层次配置
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // 定义标准分层架构
    this.layers.set(ArchitectureLayer.PRESENTATION, {
      name: ArchitectureLayer.PRESENTATION,
      description: '表示层 - 用户界面和 API 接口',
      allowedDependencies: [ArchitectureLayer.BUSINESS, ArchitectureLayer.SHARED],
      priority: 1
    });

    this.layers.set(ArchitectureLayer.BUSINESS, {
      name: ArchitectureLayer.BUSINESS,
      description: '业务层 - 业务逻辑和用例',
      allowedDependencies: [ArchitectureLayer.DOMAIN, ArchitectureLayer.SHARED],
      priority: 2
    });

    this.layers.set(ArchitectureLayer.DOMAIN, {
      name: ArchitectureLayer.DOMAIN,
      description: '领域层 - 领域模型和实体',
      allowedDependencies: [ArchitectureLayer.SHARED],
      priority: 3
    });

    this.layers.set(ArchitectureLayer.INFRASTRUCTURE, {
      name: ArchitectureLayer.INFRASTRUCTURE,
      description: '基础设施层 - 数据访问和外部服务',
      allowedDependencies: [ArchitectureLayer.DOMAIN, ArchitectureLayer.SHARED],
      priority: 4
    });

    this.layers.set(ArchitectureLayer.SHARED, {
      name: ArchitectureLayer.SHARED,
      description: '共享层 - 公共工具、常量和类型',
      allowedDependencies: [],
      priority: 5
    });

    // 生成跨层调用规则
    this.generateCrossLayerRules();

    this.initialized = true;
    console.log('[LayeredArch] 分层架构初始化完成');
  }

  /**
   * 生成跨层调用规则
   */
  private generateCrossLayerRules(): void {
    this.rules = [];
    
    for (const [fromLayer, fromConfig] of this.layers) {
      for (const [toLayer, toConfig] of this.layers) {
        if (fromLayer === toLayer) {
          continue;
        }

        const allowed = fromConfig.allowedDependencies.includes(toLayer);
        this.rules.push({
          from: fromLayer,
          to: toLayer,
          allowed,
          description: `${fromLayer} → ${toLayer}: ${allowed ? '允许' : '禁止'}`
        });
      }
    }
  }

  /**
   * 注册模块
   */
  registerModule(moduleDef: ModuleDefinition): void {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.layers.has(moduleDef.layer)) {
      throw new Error(`[LayeredArch] 未知层次：${moduleDef.layer}`);
    }

    this.modules.set(moduleDef.name, moduleDef);
    console.log(`[LayeredArch] 模块注册成功：${moduleDef.name} (${moduleDef.layer})`);
  }

  /**
   * 验证模块依赖
   */
  validateDependencies(moduleName: string): { valid: boolean; errors: string[] } {
    const module = this.modules.get(moduleName);
    if (!module) {
      return { valid: false, errors: [`模块不存在：${moduleName}`] };
    }

    const errors: string[] = [];

    for (const depName of module.dependencies) {
      const depModule = this.modules.get(depName);
      
      if (!depModule) {
        errors.push(`依赖模块不存在：${depName}`);
        continue;
      }

      // 检查跨层调用规则
      const rule = this.rules.find(
        r => r.from === module.layer && r.to === depModule.layer
      );

      if (rule && !rule.allowed) {
        errors.push(
          `违反跨层调用规则：${moduleName} (${module.layer}) 不能依赖 ${depName} (${depModule.layer})`
        );
      }

      // 检查循环依赖
      if (this.hasCircularDependency(module, depModule, new Set())) {
        errors.push(`检测到循环依赖：${moduleName} ↔ ${depName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查循环依赖
   */
  private hasCircularDependency(
    current: ModuleDefinition,
    target: ModuleDefinition,
    visited: Set<string>
  ): boolean {
    if (visited.has(target.name)) {
      return false;
    }

    visited.add(target.name);

    for (const depName of target.dependencies) {
      const depModule = this.modules.get(depName);
      if (!depModule) {
        continue;
      }

      if (depModule.name === current.name) {
        return true;
      }

      if (this.hasCircularDependency(current, depModule, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 验证所有模块
   */
  validateAllModules(): { valid: boolean; report: string } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [name, module] of this.modules) {
      const result = this.validateDependencies(name);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }

    // 检查未使用的导出
    for (const [name, module] of this.modules) {
      for (const exported of module.exports) {
        let isUsed = false;
        
        for (const [otherName, otherModule] of this.modules) {
          if (otherName === name) {
            continue;
          }
          
          if (otherModule.dependencies.includes(name)) {
            isUsed = true;
            break;
          }
        }

        if (!isUsed) {
          warnings.push(`未使用的导出：${name}.${exported}`);
        }
      }
    }

    const report = [
      '=== 分层架构验证报告 ===',
      `模块总数：${this.modules.size}`,
      `错误数：${errors.length}`,
      `警告数：${warnings.length}`,
      '',
      errors.length > 0 ? '错误:' : '',
      ...errors.map(e => `  ❌ ${e}`),
      warnings.length > 0 ? '警告:' : '',
      ...warnings.map(w => `  ⚠️ ${w}`),
      '',
      errors.length === 0 ? '✅ 验证通过' : '❌ 验证失败'
    ].filter(line => line !== '').join('\n');

    return {
      valid: errors.length === 0,
      report
    };
  }

  /**
   * 获取层次信息
   */
  getLayerInfo(layer: ArchitectureLayer): LayerConfig | undefined {
    return this.layers.get(layer);
  }

  /**
   * 获取所有层次
   */
  getAllLayers(): LayerConfig[] {
    return Array.from(this.layers.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取跨层调用规则
   */
  getCrossLayerRules(): CrossLayerRule[] {
    return this.rules;
  }

  /**
   * 导出架构图谱
   */
  exportArchitectureGraph(): string {
    const lines: string[] = ['architectureDiagram {'];

    // 导出层次
    for (const [name, config] of this.layers) {
      lines.push(`  layer ${name} {`);
      lines.push(`    description "${config.description}"`);
      lines.push(`    priority ${config.priority}`);
      lines.push(`    dependencies [${config.allowedDependencies.join(', ')}]`);
      lines.push(`  }`);
    }

    // 导出模块
    for (const [name, module] of this.modules) {
      lines.push(`  module ${name} {`);
      lines.push(`    layer ${module.layer}`);
      lines.push(`    path "${module.path}"`);
      lines.push(`    dependencies [${module.dependencies.join(', ')}]`);
      lines.push(`    exports [${module.exports.join(', ')}]`);
      lines.push(`  }`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.layers.clear();
    this.modules.clear();
    this.rules = [];
    this.initialized = false;
  }
}

// 导出单例实例
export const layeredArch = new LayeredArchitectureManager();

/**
 * 快捷函数：创建模块定义
 */
export function createModule(
  name: string,
  layer: ArchitectureLayer,
  path: string,
  dependencies: string[] = [],
  exports: string[] = []
): ModuleDefinition {
  return {
    name,
    layer,
    path,
    dependencies,
    exports
  };
}

/**
 * 快捷函数：检查层次依赖是否合法
 */
export function canDependOn(from: ArchitectureLayer, to: ArchitectureLayer): boolean {
  const layerConfig = layeredArch.getLayerInfo(from);
  if (!layerConfig) {
    return false;
  }
  return layerConfig.allowedDependencies.includes(to);
}

/**
 * 快捷函数：获取层次优先级
 */
export function getLayerPriority(layer: ArchitectureLayer): number {
  const layerConfig = layeredArch.getLayerInfo(layer);
  return layerConfig ? layerConfig.priority : Infinity;
}

// 自动初始化
layeredArch.initialize();

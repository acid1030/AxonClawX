/**
 * Template Method Pattern Skill - 模板方法模式技能
 * 
 * 定义算法骨架，将具体步骤延迟到子类实现
 * 核心：不变的结构 + 可变的实现
 */

// ============== 抽象模板类 ==============
abstract class SkillTemplate {
  /**
   * 模板方法 - 定义算法骨架 (final 防止子类修改)
   */
  public async execute(input: any): Promise<any> {
    console.log(`[Skill] 开始执行：${this.name}`);
    
    // 1. 验证输入
    this.validateInput(input);
    
    // 2. 预处理 (钩子方法，可选)
    this.preProcess(input);
    
    // 3. 核心处理 (抽象方法，必须实现)
    const result = await this.coreProcess(input);
    
    // 4. 后处理 (钩子方法，可选)
    this.postProcess(result);
    
    // 5. 格式化输出 (抽象方法，必须实现)
    const output = this.formatOutput(result);
    
    console.log(`[Skill] 执行完成：${this.name}`);
    return output;
  }

  /**
   * 技能名称 (钩子方法)
   */
  protected get name(): string {
    return this.constructor.name;
  }

  /**
   * 验证输入 (钩子方法 - 默认实现)
   */
  protected validateInput(input: any): void {
    if (!input) {
      throw new Error('输入不能为空');
    }
  }

  /**
   * 预处理 (钩子方法 - 可选覆盖)
   */
  protected preProcess(input: any): void {
    // 默认空实现，子类可选择性覆盖
  }

  /**
   * 核心处理 (抽象方法 - 必须实现)
   */
  protected abstract coreProcess(input: any): Promise<any>;

  /**
   * 后处理 (钩子方法 - 可选覆盖)
   */
  protected postProcess(result: any): void {
    // 默认空实现，子类可选择性覆盖
  }

  /**
   * 格式化输出 (抽象方法 - 必须实现)
   */
  protected abstract formatOutput(result: any): any;
}

// ============== 具体技能实现 1: 数据处理技能 ==============
class DataProcessingSkill extends SkillTemplate {
  protected override validateInput(input: any): void {
    super.validateInput(input);
    if (!Array.isArray(input.data)) {
      throw new Error('数据必须是数组格式');
    }
  }

  protected override preProcess(input: any): void {
    console.log('[DataProcessing] 数据预处理：去重、排序');
    input.data = [...new Set(input.data)].sort();
  }

  protected async coreProcess(input: any): Promise<any> {
    console.log('[DataProcessing] 核心处理：数据转换');
    // 模拟异步处理
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return input.data.map((item: any) => {
      if (typeof item === 'number') {
        return item * 2;
      }
      return item.toUpperCase?.() ?? item;
    });
  }

  protected override postProcess(result: any): void {
    console.log(`[DataProcessing] 后处理：处理了 ${result.length} 条数据`);
  }

  protected formatOutput(result: any): any {
    return {
      type: 'processed_data',
      count: result.length,
      data: result,
      timestamp: Date.now()
    };
  }
}

// ============== 具体技能实现 2: 文本分析技能 ==============
class TextAnalysisSkill extends SkillTemplate {
  protected override validateInput(input: any): void {
    super.validateInput(input);
    if (typeof input.text !== 'string') {
      throw new Error('输入必须包含 text 字段');
    }
  }

  protected override preProcess(input: any): void {
    console.log('[TextAnalysis] 文本预处理：去除空白、标准化');
    input.text = input.text.trim().toLowerCase();
  }

  protected async coreProcess(input: any): Promise<any> {
    console.log('[TextAnalysis] 核心处理：文本分析');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const words = input.text.split(/\s+/);
    return {
      original: input.text,
      wordCount: words.length,
      charCount: input.text.length,
      uniqueWords: new Set(words).size,
      avgWordLength: Math.round(
        (words.reduce((sum: number, word: string) => sum + word.length, 0) / words.length) * 100
      ) / 100
    };
  }

  protected formatOutput(result: any): any {
    return {
      type: 'text_analysis',
      analysis: result,
      timestamp: Date.now()
    };
  }
}

// ============== 具体技能实现 3: API 调用技能 ==============
class ApiCallSkill extends SkillTemplate {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.example.com') {
    super();
    this.baseUrl = baseUrl;
  }

  protected override validateInput(input: any): void {
    super.validateInput(input);
    if (!input.endpoint) {
      throw new Error('必须指定 API endpoint');
    }
  }

  protected override preProcess(input: any): void {
    console.log(`[ApiCall] 准备请求：${input.endpoint}`);
    input.headers = {
      'Content-Type': 'application/json',
      ...input.headers
    };
  }

  protected async coreProcess(input: any): Promise<any> {
    console.log('[ApiCall] 发送 API 请求');
    
    // 模拟 API 调用 (实际使用时替换为真实 fetch)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      status: 200,
      endpoint: input.endpoint,
      method: input.method || 'GET',
      data: { success: true, message: 'Mock response' }
    };
  }

  protected override postProcess(result: any): void {
    console.log(`[ApiCall] 响应状态：${result.status}`);
  }

  protected formatOutput(result: any): any {
    return {
      type: 'api_response',
      success: result.status >= 200 && result.status < 300,
      status: result.status,
      data: result.data,
      timestamp: Date.now()
    };
  }
}

// ============== 使用示例 ==============
async function demonstrateUsage() {
  console.log('=== 模板方法模式使用示例 ===\n');

  // 示例 1: 数据处理技能
  console.log('--- 示例 1: 数据处理 ---');
  const dataSkill = new DataProcessingSkill();
  const dataResult = await dataSkill.execute({
    data: [3, 1, 2, 1, 4, 3, 5]
  });
  console.log('结果:', JSON.stringify(dataResult, null, 2));
  console.log();

  // 示例 2: 文本分析技能
  console.log('--- 示例 2: 文本分析 ---');
  const textSkill = new TextAnalysisSkill();
  const textResult = await textSkill.execute({
    text: 'Hello World This is a Template Method Pattern Example'
  });
  console.log('结果:', JSON.stringify(textResult, null, 2));
  console.log();

  // 示例 3: API 调用技能
  console.log('--- 示例 3: API 调用 ---');
  const apiSkill = new ApiCallSkill('https://api.github.com');
  const apiResult = await apiSkill.execute({
    endpoint: '/users/octocat',
    method: 'GET'
  });
  console.log('结果:', JSON.stringify(apiResult, null, 2));
  console.log();

  console.log('=== 演示完成 ===');
}

// ============== 导出 ==============
export {
  SkillTemplate,
  DataProcessingSkill,
  TextAnalysisSkill,
  ApiCallSkill,
  demonstrateUsage
};

// 如果直接运行此文件，执行演示
if (typeof require !== 'undefined' && require.main === module) {
  demonstrateUsage().catch(console.error);
}

/**
 * ACE 数据解析工具 - 使用示例
 * 
 * @author Axon (ACE Subagent)
 * @version 1.0.0
 */

import {
  parseJSON,
  parseCSV,
  parseXML,
  toJSON,
  toCSV,
  toXML,
  type JSONParseOptions,
  type CSVParseOptions,
  type XMLParseOptions
} from './parser-utils-skill';

// ==================== JSON 解析示例 ====================

/**
 * 示例 1: 基础 JSON 解析
 */
function exampleJSONBasic() {
  const jsonString = `{
    "name": "Axon",
    "version": "1.0.0",
    "active": true,
    "modules": ["core", "parser", "orchestrator"]
  }`;

  const result = parseJSON(jsonString);
  
  if (result.success) {
    console.log('✅ JSON 解析成功:', result.data);
    console.log('⏱️ 解析耗时:', result.metadata?.parseTime, 'ms');
  } else {
    console.error('❌ JSON 解析失败:', result.error);
  }
}

/**
 * 示例 2: JSON 解析带选项
 */
function exampleJSONWithOptions() {
  const jsonString = '{ "empty": [] }';
  
  const options: JSONParseOptions = {
    allowEmpty: true,
    maxDepth: 50,
    validate: true
  };

  const result = parseJSON(jsonString, options);
  
  console.log('解析结果:', result);
  // 输出: { success: true, data: { empty: [] }, warnings: ['Empty array detected'] }
}

/**
 * 示例 3: JSON 解析错误处理
 */
function exampleJSONError() {
  const invalidJSON = '{ "name": "Axon", "version": }'; // 缺少值
  
  const result = parseJSON(invalidJSON);
  
  console.log('错误信息:', result.error);
  // 输出: "Unexpected token } in JSON at position 26"
}

/**
 * 示例 4: 对象转 JSON 字符串
 */
function exampleToJSON() {
  const data = {
    name: 'ACE Parser',
    features: ['JSON', 'CSV', 'XML'],
    version: 1.0
  };

  const pretty = toJSON(data, true);
  const compact = toJSON(data, false);
  
  console.log('格式化 JSON:\n', pretty);
  console.log('紧凑 JSON:', compact);
}

// ==================== CSV 解析示例 ====================

/**
 * 示例 5: 基础 CSV 解析 (带表头)
 */
function exampleCSVBasic() {
  const csvString = `name,age,city,active
Axon,30,Beijing,true
KAEL,28,Shanghai,true
NOVA,25,Shenzhen,false`;

  const result = parseCSV(csvString);
  
  if (result.success && result.data) {
    console.log('✅ CSV 解析成功:');
    console.log('📊 行数:', result.metadata?.rowCount);
    console.log('📊 列数:', result.metadata?.columnCount);
    console.log('📄 数据:', result.data);
    // 输出: [{ name: 'Axon', age: 30, city: 'Beijing', active: true }, ...]
  }
}

/**
 * 示例 6: CSV 解析带选项
 */
function exampleCSVWithOptions() {
  const csvString = `Axon;30;Beijing
KAEL;28;Shanghai`;

  const options: CSVParseOptions = {
    delimiter: ';',
    hasHeader: false,
    columnNames: ['name', 'age', 'city'],
    trim: true,
    skipEmptyLines: true
  };

  const result = parseCSV(csvString, options);
  
  console.log('解析结果:', result.data);
  // 输出: [{ name: 'Axon', age: 30, city: 'Beijing' }, ...]
}

/**
 * 示例 7: CSV 解析含引号和特殊字符
 */
function exampleCSVWithQuotes() {
  const csvString = `name,description,value
"Product A","High-quality, ""premium"" item",100
"Product B","Standard product",50`;

  const result = parseCSV(csvString);
  
  console.log('解析结果:', result.data);
  // 输出: [{ name: 'Product A', description: 'High-quality, "premium" item', value: 100 }, ...]
}

/**
 * 示例 8: 对象数组转 CSV
 */
function exampleToCSV() {
  const data = [
    { name: 'Axon', age: 30, city: 'Beijing' },
    { name: 'KAEL', age: 28, city: 'Shanghai' },
    { name: 'NOVA', age: 25, city: 'Shenzhen' }
  ];

  const csvString = toCSV(data);
  
  console.log('生成的 CSV:\n', csvString);
  // 输出:
  // name,age,city
  // Axon,30,Beijing
  // KAEL,28,Shanghai
  // NOVA,25,Shenzhen
}

// ==================== XML 解析示例 ====================

/**
 * 示例 9: 基础 XML 解析
 */
function exampleXMLBasic() {
  const xmlString = `<?xml version="1.0"?>
  <project name="AxonClaw" version="1.0">
    <module name="parser">
      <feature>JSON</feature>
      <feature>CSV</feature>
      <feature>XML</feature>
    </module>
    <author>Axon</author>
  </project>`;

  const result = parseXML(xmlString);
  
  if (result.success && result.data) {
    console.log('✅ XML 解析成功:');
    console.log('📄 数据结构:', JSON.stringify(result.data, null, 2));
    /*
    输出:
    {
      "tag": "project",
      "attributes": { "name": "AxonClaw", "version": "1.0" },
      "children": [
        {
          "tag": "module",
          "attributes": { "name": "parser" },
          "children": [
            { "tag": "feature", "text": "JSON" },
            { "tag": "feature", "text": "CSV" },
            { "tag": "feature", "text": "XML" }
          ]
        },
        { "tag": "author", "text": "Axon" }
      ]
    }
    */
  }
}

/**
 * 示例 10: XML 解析带选项
 */
function exampleXMLWithOptions() {
  const xmlString = `<user id="123" active="true">
    <name>Axon</name>
    <email>axon@example.com</email>
  </user>`;

  const options: XMLParseOptions = {
    includeAttributes: false,
    includeText: true,
    compact: false
  };

  const result = parseXML(xmlString, options);
  
  console.log('解析结果:', result.data);
  // 属性被忽略，只保留标签和文本
}

/**
 * 示例 11: XML 解析自闭合标签
 */
function exampleXMLSelfClosing() {
  const xmlString = `
  <config>
    <setting name="timeout" value="30" />
    <setting name="retries" value="3" />
    <debug enabled="true" />
  </config>`;

  const result = parseXML(xmlString);
  
  console.log('解析结果:', result.data);
}

/**
 * 示例 12: XML 节点转字符串
 */
function exampleToXML() {
  const xmlNode = {
    tag: 'project',
    attributes: { name: 'AxonClaw', version: '1.0' },
    children: [
      {
        tag: 'module',
        attributes: { name: 'parser' },
        children: [
          { tag: 'feature', text: 'JSON' },
          { tag: 'feature', text: 'CSV' },
          { tag: 'feature', text: 'XML' }
        ]
      },
      { tag: 'author', text: 'Axon' }
    ]
  };

  const xmlString = toXML(xmlNode);
  
  console.log('生成的 XML:\n', xmlString);
}

// ==================== 综合示例 ====================

/**
 * 示例 13: 数据格式转换 (JSON → CSV)
 */
function exampleJSONtoCSV() {
  const jsonString = `[
    { "name": "Axon", "role": "Architect", "level": 99 },
    { "name": "KAEL", "role": "Engineer", "level": 95 },
    { "name": "NOVA", "role": "Growth", "level": 90 }
  ]`;

  const jsonResult = parseJSON(jsonString);
  
  if (jsonResult.success && jsonResult.data) {
    const csvString = toCSV(jsonResult.data);
    console.log('转换后的 CSV:\n', csvString);
  }
}

/**
 * 示例 14: 批量解析与错误处理
 */
function exampleBatchParse() {
  const inputs = [
    { type: 'json', data: '{ "valid": true }' },
    { type: 'json', data: '{ invalid json }' },
    { type: 'csv', data: 'name,value\nAxon,100' },
    { type: 'xml', data: '<root><item>test</item></root>' }
  ];

  inputs.forEach((input, index) => {
    console.log(`\n--- 处理输入 #${index + 1} (${input.type}) ---`);
    
    let result;
    switch (input.type) {
      case 'json':
        result = parseJSON(input.data);
        break;
      case 'csv':
        result = parseCSV(input.data);
        break;
      case 'xml':
        result = parseXML(input.data);
        break;
    }

    if (result?.success) {
      console.log('✅ 成功');
    } else {
      console.log('❌ 失败:', result?.error);
    }
  });
}

// ==================== 运行示例 ====================

function runAllExamples() {
  console.log('🚀 ACE 数据解析工具 - 使用示例\n');
  console.log('='.repeat(50));
  
  console.log('\n📦 JSON 解析示例:');
  exampleJSONBasic();
  exampleJSONWithOptions();
  exampleJSONError();
  exampleToJSON();
  
  console.log('\n📊 CSV 解析示例:');
  exampleCSVBasic();
  exampleCSVWithOptions();
  exampleCSVWithQuotes();
  exampleToCSV();
  
  console.log('\n📄 XML 解析示例:');
  exampleXMLBasic();
  exampleXMLWithOptions();
  exampleXMLSelfClosing();
  exampleToXML();
  
  console.log('\n🔄 综合示例:');
  exampleJSONtoCSV();
  exampleBatchParse();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 所有示例执行完成!\n');
}

// 导出示例函数
export {
  exampleJSONBasic,
  exampleJSONWithOptions,
  exampleJSONError,
  exampleToJSON,
  exampleCSVBasic,
  exampleCSVWithOptions,
  exampleCSVWithQuotes,
  exampleToCSV,
  exampleXMLBasic,
  exampleXMLWithOptions,
  exampleXMLSelfClosing,
  exampleToXML,
  exampleJSONtoCSV,
  exampleBatchParse,
  runAllExamples
};

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples();
}

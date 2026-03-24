# doc-gen - API 文档生成器

自动生成 TypeScript API 文档的工具。

## 快速开始

### 1. 安装依赖

```bash
npm install -D typescript ts-node
```

### 2. 使用示例

```bash
# 解析示例文件
npx ts-node skills/doc-gen/doc-generator.ts skills/doc-gen/examples/sample.ts -o skills/doc-gen/examples/API.md

# 查看生成的文档
cat skills/doc-gen/examples/API.md
```

### 3. 解析整个项目

```bash
# 解析 src 目录，输出到 docs/api.md
npx ts-node skills/doc-gen/doc-generator.ts ./src -o docs/api.md -t "项目 API 文档"
```

## 输出示例

查看 [examples/API.md](./examples/API.md) 查看生成的文档示例。

## 命令行选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-o, --output` | 输出文件路径 | `API.md` |
| `-t, --title` | 文档标题 | `API 文档` |
| `--no-index` | 不生成目录索引 | false |
| `-e, --exclude` | 排除的目录 (逗号分隔) | `node_modules,dist,test` |

## 支持的特性

- ✅ 函数和箭头函数
- ✅ 类和类方法
- ✅ 接口和类型
- ✅ JSDoc 注释解析
- ✅ 参数类型和描述
- ✅ 返回值类型和描述
- ✅ 代码示例
- ✅ 自动生成目录索引

## 开发

```bash
# 运行测试
npx ts-node skills/doc-gen/doc-generator.ts skills/doc-gen/examples/sample.ts

# 查看帮助
npx ts-node skills/doc-gen/doc-generator.ts --help
```

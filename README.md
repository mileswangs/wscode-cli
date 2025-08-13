# Gemini CLI Copy

一个基于 TypeScript 的 CLI 工具，集成了 OpenAI GPT 模型和文件系统工具。

## 功能特性

- 🤖 集成 OpenAI GPT-4 模型
- 📁 文件系统工具（读取文件、列出目录）
- 🛠️ 可扩展的工具系统
- ✅ 完整的单元测试覆盖
- 🔧 TypeScript + Vitest 开发环境

## 安装和设置

1. 克隆项目并安装依赖：

```bash
pnpm install
```

2. 配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，添加你的 OpenAI API Key
```

3. 运行开发环境：

```bash
pnpm dev "your prompt here"
```

## 使用示例

```bash
# 列出当前目录的文件
pnpm dev "List the files in the current directory"

# 读取特定文件
pnpm dev "Read the package.json file"

# 读取多个文件
pnpm dev "Read the contents of package.json and tsconfig.json"

# 分析项目结构
pnpm dev "Analyze the project structure and tell me what this project does"
```

## 可用工具

### 1. list_directory

列出指定目录中的文件和子目录。

**参数：**

- `path` (string): 目录路径

### 2. read_files

读取一个或多个文件的内容。

**参数：**

- `paths` (string[]): 文件路径数组
- `encoding` (string, 可选): 文件编码，默认为 'utf8'

## 开发

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 运行测试UI界面
pnpm test:ui
```

### 构建项目

```bash
pnpm build
```

### 代码检查

```bash
npx tsc --noEmit
```

## 项目结构

```
src/
├── chat.ts                 # Chat类，处理与OpenAI的交互
├── main.ts                 # 主入口文件
├── tools/                  # 工具系统
│   ├── base-tool.ts        # 工具基础接口
│   ├── tool-registry.ts    # 工具注册表
│   ├── ls.ts              # 目录列表工具
│   ├── read-files.ts      # 文件读取工具
│   └── __tests__/         # 工具测试
├── __tests__/             # 主要功能测试
└── ...
```

## 添加新工具

1. 创建新的工具类，实现 `Tool<TParams, ToolResult>` 接口
2. 在 `tool-registry.ts` 中注册新工具
3. 编写相应的测试文件

示例：

```typescript
export class MyTool implements Tool<MyParams, ToolResult> {
  name = "my_tool";
  description = "Description of what this tool does";

  schema = {
    type: "object",
    properties: {
      // 定义参数schema
    },
    required: ["required_param"],
  };

  validateToolParams(params: MyParams): string | null {
    // 使用AJV验证参数
  }

  async execute(params: MyParams): Promise<ToolResult> {
    // 工具执行逻辑
  }
}
```

## 环境变量

- `OPENAI_API_KEY`: OpenAI API 密钥（必需）

## 技术栈

- TypeScript
- Node.js
- OpenAI SDK
- Vitest (测试)
- AJV (JSON Schema 验证)
- tsx (TypeScript 执行器)

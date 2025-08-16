# wsCode cli

一个基于 TypeScript 和 Ink 的现代化 CLI 工具，集成了 AI 助手和强大的文件系统工具。

## 功能特性

- 🤖 集成 Anthropic Claude 模型 (通过 OpenRouter)
- 📊 Langfuse 监控和分析集成
- 🎨 美观的 Ink React 终端界面
- 📁 强大的文件系统工具（文件读写、目录操作、glob 搜索）
- 🔍 高效的文本搜索和 grep 功能
- 🛠️ 可扩展的工具系统架构
- ✅ 完整的单元测试覆盖
- 🔧 TypeScript + Vitest 开发环境

## 安装和设置

### 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```bash
# OpenRouter API Key (必需)
OPENROUTER_KEY=your_openrouter_api_key

# Langfuse Configuration (可选，用于监控)
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Environment
NODE_ENV=development
```

### 从 npm 安装（推荐）

```bash
npm install -g wscode-cli
```

### 打开

```bash
wscode
```

## Langfuse 监控

本项目集成了 Langfuse 来监控和分析 AI 对话：

### 监控内容

- **LLM 调用追踪**: Token 使用量、延迟、成本
- **工具执行监控**: 每个工具的执行情况和结果
- **对话会话管理**: 多轮对话的上下文追踪
- **质量评估**: 响应质量评分和用户反馈
- **错误监控**: 自动捕获和记录错误信息

### 使用示例

```typescript
import { Chat } from "./src/chat";

const chat = new Chat();

// 发送带用户 ID 的提示
const response = await chat.sendPrompt(
  "List the files in the current directory",
  "user-123"
);

// 为对话评分 (1-5 分)
await chat.scoreLastConversation(4, "Good response!");
```

更多示例请查看 `examples/langfuse-example.ts`。

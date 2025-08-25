# wsCode cli

一个基于 TypeScript 和 Ink 的现代化 CLI 工具，集成了 AI 助手和强大的文件系统工具。

## 功能特性

- 🤖 集成 Anthropic Claude 模型 (通过 OpenRouter)
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

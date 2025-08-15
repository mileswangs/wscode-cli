# 发布说明

## 已完成的配置

### npm 发布设置

- ✅ `package.json` 已配置正确的 `files` 字段
- ✅ 添加了 `bin` 字段用于全局命令安装
- ✅ 设置了 `prepublishOnly` 脚本自动构建
- ✅ 创建了 `.npmignore` 排除源码和开发文件
- ✅ 添加了 LICENSE 文件

### 构建配置

- ✅ esbuild 配置正确，将依赖标记为 external
- ✅ 生成的 `dist/main.js` 包含正确的 shebang
- ✅ 支持 ES modules

### 测试验证

- ✅ 成功创建了 `gemini-cli-copy-1.0.0.tgz` 包
- ✅ 包只包含必要的 dist 文件和文档

## 发布步骤

1. **本地测试**：

   ```bash
   # 测试全局安装
   npm install -g ./wscode-1.0.0.tgz

   # 测试命令
   wscode

   # 卸载
   npm uninstall -g wscode
   ```

2. **发布到 npm**：

   ```bash
   # 登录 npm（如果还没有）
   npm login

   # 发布
   npm publish
   ```

3. **用户安装**：

   ```bash
   # 全局安装
   npm install -g wscode

   # 使用
   wscode
   ```

## 包结构

发布的包只包含：

- `dist/main.js` - 编译后的可执行文件
- `package.json` - 包元数据
- `README.md` - 文档
- `LICENSE` - 许可证

不包含源码、测试文件、构建工具等开发文件。

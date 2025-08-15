#!/bin/bash

# 构建项目
echo "🚀 Building project..."
npm run build

# 备份原始 package.json
echo "📦 Preparing for packaging..."
cp package.json package.json.backup

# 使用最小化的 package.json
cp package-minimal.json package.json

# 创建 .tgz 文件
echo "📦 Creating .tgz package..."
npm pack

# 恢复原始 package.json
echo "🔄 Restoring original package.json..."
mv package.json.backup package.json

echo "✅ Package created successfully!"
echo "📁 Generated file: wscode-1.0.0.tgz"

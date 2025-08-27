#!/bin/bash

# GitHub 环境专用部署脚本
# 解决 pnpm lockfile 冲突问题

set -e

echo "🚀 GitHub 环境部署 Afilmory Workers..."

# 创建必要的配置文件
echo "📝 Creating configuration files..."
cp config.example.json config.json || echo "Config exists"
cp builder.config.example.json builder.config.json || echo "Builder config exists"

# 删除可能冲突的文件
echo "🧹 Cleaning up conflicting files..."
rm -f pnpm-lock.yaml
rm -f package-lock.json
rm -f yarn.lock

# 使用 npm 安装依赖（忽略 lockfile）
echo "📦 Installing dependencies with npm..."
npm install --no-package-lock --no-save

# 检查 wrangler 是否可用
echo "🔍 Checking Wrangler..."
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler globally..."
    npm install -g wrangler
fi

# 创建 R2 存储桶
echo "🪣 Creating R2 buckets..."
wrangler r2 bucket create afilmory-photos || echo "Photos bucket may already exist"
wrangler r2 bucket create afilmory-cache || echo "Cache bucket may already exist"

# 部署 Worker
echo "🚀 Deploying Worker..."
wrangler deploy

echo "✅ Deployment completed successfully!"
echo "🌐 Your gallery should be available at: https://afilmory-workers.your-subdomain.workers.dev"
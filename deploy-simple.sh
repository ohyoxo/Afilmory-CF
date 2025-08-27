#!/bin/bash

# Afilmory Cloudflare Workers 简化部署脚本
# 适用于 GitHub 等 CI/CD 环境

set -e

echo "🚀 Deploying Afilmory to Cloudflare Workers (Simplified)..."

# 检查必要的工具
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v wrangler &> /dev/null; then
        echo "❌ Wrangler CLI not found. Installing..."
        npm install -g wrangler
    fi
    
    echo "✅ Dependencies ready"
}

# 检查 Cloudflare 认证
check_auth() {
    echo "🔐 Checking Cloudflare authentication..."
    
    if ! wrangler whoami &> /dev/null; then
        echo "❌ Not authenticated with Cloudflare."
        echo "Please set CLOUDFLARE_API_TOKEN environment variable"
        exit 1
    fi
    
    echo "✅ Authenticated with Cloudflare"
}

# 创建必要的配置文件
create_configs() {
    echo "📝 Creating configuration files..."
    
    # 创建基本的 config.json
    if [ ! -f "config.json" ]; then
        cp config.example.json config.json
        echo "✅ Created config.json"
    fi
    
    # 创建基本的 builder.config.json
    if [ ! -f "builder.config.json" ]; then
        cp builder.config.example.json builder.config.json
        echo "✅ Created builder.config.json"
    fi
}

# 安装依赖
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # 只安装必要的依赖
    npm install --production
    
    echo "✅ Dependencies installed"
}

# 设置 Cloudflare 资源 (简化版)
setup_resources() {
    echo "🔧 Setting up Cloudflare resources..."
    
    # 创建 R2 存储桶
    echo "Creating R2 buckets..."
    wrangler r2 bucket create afilmory-photos || echo "Bucket may already exist"
    wrangler r2 bucket create afilmory-cache || echo "Bucket may already exist"
    
    # 创建 KV 命名空间
    echo "Creating KV namespace..."
    wrangler kv:namespace create METADATA_KV || echo "KV namespace may already exist"
    
    echo "✅ Resources setup completed"
}

# 构建前端应用 (简化版)
build_frontend() {
    echo "🏗️ Building frontend application..."
    
    if [ -d "apps/web" ]; then
        cd apps/web
        
        # 安装前端依赖
        if [ -f "package.json" ]; then
            npm install
            
            # 构建前端
            if npm run build:workers 2>/dev/null; then
                echo "✅ Frontend built with workers config"
            elif npm run build 2>/dev/null; then
                echo "✅ Frontend built with default config"
            else
                echo "⚠️ Frontend build failed, continuing..."
            fi
        fi
        
        cd ../..
    else
        echo "⚠️ Frontend directory not found, skipping..."
    fi
}

# 部署 Worker
deploy_worker() {
    echo "🚀 Deploying Worker..."
    
    local env=${1:-production}
    
    # 确保 wrangler.toml 存在
    if [ ! -f "wrangler.toml" ]; then
        echo "❌ wrangler.toml not found"
        exit 1
    fi
    
    # 部署
    if [ "$env" = "development" ]; then
        wrangler deploy --env development
    else
        wrangler deploy
    fi
    
    echo "✅ Worker deployed successfully"
}

# 显示后续步骤
show_next_steps() {
    echo ""
    echo "🎉 Deployment completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Upload your photos to R2 bucket:"
    echo "   wrangler r2 object put afilmory-photos/path/to/photo.jpg --file=./photo.jpg"
    echo ""
    echo "2. Trigger photo sync:"
    echo "   curl -X POST https://your-worker.your-subdomain.workers.dev/api/sync"
    echo ""
    echo "3. View your gallery:"
    echo "   https://your-worker.your-subdomain.workers.dev"
    echo ""
}

# 主函数
main() {
    local env=${1:-production}
    
    echo "Environment: $env"
    echo ""
    
    check_dependencies
    check_auth
    create_configs
    install_dependencies
    setup_resources
    build_frontend
    deploy_worker "$env"
    show_next_steps
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--env production|development] [--help]"
            echo ""
            echo "Options:"
            echo "  --env            Deployment environment (default: production)"
            echo "  --help, -h       Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# 运行主函数
main "${ENV:-production}"
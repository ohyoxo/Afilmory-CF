#!/bin/bash

# Afilmory Cloudflare Workers 部署脚本
# 一键部署到 Cloudflare Workers

set -e

echo "🚀 Deploying Afilmory to Cloudflare Workers..."

# 检查必要的工具
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v wrangler &> /dev/null; then
        echo "❌ Wrangler CLI not found. Please install it first:"
        echo "npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js not found. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm not found. Please install npm first."
        exit 1
    fi
    
    echo "✅ All dependencies found"
}

# 检查 Cloudflare 认证
check_auth() {
    echo "🔐 Checking Cloudflare authentication..."
    
    if ! wrangler whoami &> /dev/null; then
        echo "❌ Not authenticated with Cloudflare. Please run:"
        echo "wrangler auth login"
        exit 1
    fi
    
    echo "✅ Authenticated with Cloudflare"
}

# 安装依赖
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # 安装根目录依赖
    npm install
    
    # 安装 web 应用依赖
    cd apps/web
    npm install
    cd ../..
    
    echo "✅ Dependencies installed"
}

# 设置 Cloudflare 资源
setup_resources() {
    echo "🔧 Setting up Cloudflare resources..."
    
    # 检查是否已经设置过
    if [ -f ".workers-setup-done" ]; then
        echo "ℹ️ Resources already set up, skipping..."
        return
    fi
    
    # 运行设置脚本
    npm run setup
    
    # 标记设置完成
    touch .workers-setup-done
    
    echo "✅ Cloudflare resources set up"
}

# 构建前端应用
build_frontend() {
    echo "🏗️ Building frontend application..."
    
    cd apps/web
    npm run build:workers
    cd ../..
    
    echo "✅ Frontend built successfully"
}

# 上传静态资源
upload_static() {
    echo "☁️ Uploading static assets to R2..."
    
    cd apps/web
    npm run upload-static
    cd ../..
    
    echo "✅ Static assets uploaded"
}

# 部署 Worker
deploy_worker() {
    echo "🚀 Deploying Worker..."
    
    local env=${1:-production}
    
    if [ "$env" = "development" ]; then
        wrangler deploy --env development
    else
        wrangler deploy --env production
    fi
    
    echo "✅ Worker deployed successfully"
}

# 验证部署
verify_deployment() {
    echo "🔍 Verifying deployment..."
    
    # 获取 Worker URL
    local worker_url=$(wrangler subdomain 2>/dev/null || echo "your-worker.your-subdomain.workers.dev")
    
    # 测试基本端点
    if curl -s -f "https://$worker_url/api/manifest" > /dev/null; then
        echo "✅ Deployment verified successfully"
        echo "🌐 Your gallery is available at: https://$worker_url"
    else
        echo "⚠️ Deployment verification failed. Please check the logs:"
        echo "wrangler tail"
    fi
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
    echo "4. Monitor your Worker:"
    echo "   wrangler tail"
    echo ""
    echo "📚 For more information, see README-WORKERS.md"
}

# 主函数
main() {
    local env=${1:-production}
    local skip_setup=${2:-false}
    
    echo "Environment: $env"
    echo "Skip setup: $skip_setup"
    echo ""
    
    check_dependencies
    check_auth
    install_dependencies
    
    if [ "$skip_setup" != "true" ]; then
        setup_resources
    fi
    
    build_frontend
    upload_static
    deploy_worker "$env"
    verify_deployment
    show_next_steps
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --skip-setup)
            SKIP_SETUP="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--env production|development] [--skip-setup] [--help]"
            echo ""
            echo "Options:"
            echo "  --env            Deployment environment (default: production)"
            echo "  --skip-setup     Skip Cloudflare resources setup"
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
main "${ENV:-production}" "${SKIP_SETUP:-false}"
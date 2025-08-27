# Afilmory Cloudflare Workers 部署指南

本指南将帮助你将 Afilmory 照片画廊部署到 Cloudflare Workers，享受全球边缘计算的高性能体验。

## 📋 前置要求

### 必需工具
- **Node.js** 18+ 
- **npm** 或 **pnpm**
- **Cloudflare 账户** (免费版即可开始)
- **Wrangler CLI** (Cloudflare 官方工具)

### 安装 Wrangler
```bash
npm install -g wrangler
```

### 登录 Cloudflare
```bash
wrangler auth login
```

## 🚀 快速部署

### 方法一：一键部署脚本
```bash
# 克隆项目
git clone https://github.com/your-username/afilmory-workers.git
cd afilmory-workers

# 运行一键部署脚本
chmod +x deploy-workers.sh
./deploy-workers.sh
```

### 方法二：手动部署
```bash
# 1. 安装依赖
npm install

# 2. 设置 Cloudflare 资源
npm run setup

# 3. 配置环境变量
cp .env.workers.example .env
# 编辑 .env 文件

# 4. 构建和部署
npm run build
npm run deploy
```

## ⚙️ 详细配置

### 1. 环境变量配置

创建 `.env` 文件：

```env
# 基本配置
NODE_ENV=production
ENVIRONMENT=production

# 站点信息
SITE_NAME=My Photo Gallery
SITE_TITLE=My Beautiful Photo Gallery
SITE_DESCRIPTION=A stunning photo gallery powered by Cloudflare Workers
SITE_URL=https://gallery.yourdomain.com

# 作者信息
SITE_AUTHOR_NAME=Your Name
SITE_AUTHOR_URL=https://yourdomain.com
SITE_AUTHOR_AVATAR=https://yourdomain.com/avatar.jpg

# 外部存储 (可选)
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-source-bucket
S3_PREFIX=photos/
S3_CUSTOM_DOMAIN=https://your-cdn-domain.com

# GitHub 集成 (可选)
GITHUB_TOKEN=your-github-token
GITHUB_REPO=username/photo-repo
```

### 2. wrangler.toml 配置

确保 `wrangler.toml` 配置正确：

```toml
name = "afilmory-workers"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# 生产环境配置
[env.production.vars]
ENVIRONMENT = "production"

[[env.production.r2_buckets]]
binding = "PHOTOS_BUCKET"
bucket_name = "afilmory-photos"

[[env.production.r2_buckets]]
binding = "CACHE_BUCKET"
bucket_name = "afilmory-cache"

[[env.production.kv_namespaces]]
binding = "METADATA1_KV"
id = "your-kv-namespace-id"

# 开发环境配置
[env.development.vars]
ENVIRONMENT = "development"

[[env.development.r2_buckets]]
binding = "PHOTOS_BUCKET"
bucket_name = "afilmory-photos-dev"

[[env.development.r2_buckets]]
binding = "CACHE_BUCKET"
bucket_name = "afilmory-cache-dev"

[[env.development.kv_namespaces]]
binding = "METADATA1_KV"
id = "your-dev-kv-namespace-id"
```

### 3. 自定义域名设置

#### 在 Cloudflare Dashboard 中：
1. 添加你的域名到 Cloudflare
2. 在 Workers & Pages 中设置自定义域名
3. 更新 `wrangler.toml`：

```toml
[env.production]
routes = [
  { pattern = "gallery.yourdomain.com/*", custom_domain = true }
]
```

## 📸 照片管理

### 上传照片到 R2

#### 单个文件上传
```bash
wrangler r2 object put afilmory-photos/2024/vacation/photo1.jpg --file=./photos/photo1.jpg
```

#### 批量上传
```bash
# 上传整个文件夹
find ./photos -name "*.jpg" -exec wrangler r2 object put afilmory-photos/{} --file={} \;

# 使用 rclone (推荐大量文件)
rclone copy ./photos/ :r2:afilmory-photos/
```

### 从外部存储同步

如果你有现有的 S3 存储，可以配置自动同步：

```env
# 在 .env 中配置
S3_BUCKET_NAME=your-existing-bucket
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

然后触发同步：
```bash
curl -X POST https://your-worker.workers.dev/api/sync
```

### 从 GitHub 同步

配置 GitHub 仓库同步：

```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_REPO=username/photo-repository
```

## 🔧 高级配置

### 缓存策略优化

在 `wrangler.toml` 中配置缓存：

```toml
[env.production.vars]
CACHE_TTL_MANIFEST = "300"      # 5分钟
CACHE_TTL_IMAGES = "31536000"   # 1年
CACHE_TTL_THUMBNAILS = "31536000" # 1年
```

### 性能优化

1. **启用图片压缩**：
```env
IMAGE_QUALITY=85
ENABLE_WEBP=true
```

2. **配置缩略图尺寸**：
```env
THUMBNAIL_SIZES=300x200,600x400,1200x800
```

3. **启用增量同步**：
```env
ENABLE_INCREMENTAL_SYNC=true
```

## 📊 监控和维护

### 查看实时日志
```bash
wrangler tail
```

### 查看存储使用情况
```bash
# R2 存储桶列表
wrangler r2 bucket list

# 查看存储桶内容
wrangler r2 object list afilmory-photos

# KV 命名空间
wrangler kv:namespace list
```

### 性能监控

在 Cloudflare Dashboard 中查看：
- 请求量和响应时间
- 错误率统计
- 地理分布
- 缓存命中率

### 定期维护

1. **清理缓存**：
```bash
# 清理缩略图缓存
wrangler r2 object delete afilmory-cache --recursive --prefix=thumbnail

# 清理元数据缓存
wrangler kv:key delete METADATA1_KV photos-manifest
```

2. **更新清单**：
```bash
curl -X POST https://your-worker.workers.dev/api/sync
```

## 🔒 安全配置

### API 访问控制

使用 Cloudflare Access 保护管理接口：

```toml
[env.production]
# 保护同步接口
[[env.production.routes]]
pattern = "gallery.yourdomain.com/api/sync"
custom_domain = true
zone_name = "yourdomain.com"
```

### 内容安全策略

在前端应用中配置 CSP：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  img-src 'self' data: https:;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
">
```

## 💰 成本估算

### Cloudflare Workers 免费额度
- **请求数**: 100,000/天
- **CPU 时间**: 10ms/请求
- **内存**: 128MB

### R2 存储定价
- **存储**: $0.015/GB/月
- **操作**: Class A $4.50/百万次，Class B $0.36/百万次
- **出站流量**: 免费 (通过 Cloudflare CDN)

### 示例成本 (1000张照片，每张2MB)
- **存储**: 2GB × $0.015 = $0.03/月
- **请求**: 通常在免费额度内
- **总计**: 约 $0.03-0.10/月

## 🚨 故障排除

### 常见问题

#### 1. 部署失败
```bash
# 检查认证状态
wrangler whoami

# 检查配置
wrangler dev --dry-run

# 查看详细错误
wrangler deploy --verbose
```

#### 2. 图片无法显示
```bash
# 检查 R2 存储桶
wrangler r2 object list afilmory-photos

# 检查权限
wrangler r2 bucket list

# 查看 Worker 日志
wrangler tail
```

#### 3. 同步失败
```bash
# 查看同步日志
wrangler tail --format=pretty

# 手动触发同步
curl -X POST https://your-worker.workers.dev/api/sync

# 检查外部存储配置
curl https://your-worker.workers.dev/api/stats
```

#### 4. 性能问题
- 检查缓存配置
- 优化图片尺寸
- 启用 WebP 格式
- 使用 CDN 加速

### 调试模式

启用详细日志：
```bash
# 本地开发
wrangler dev --local --debug

# 生产环境调试
wrangler tail --format=json | jq
```

## 🔄 更新和升级

### 更新代码
```bash
git pull origin main
npm run build
npm run deploy
```

### 数据库迁移
```bash
# 备份现有数据
wrangler r2 object list afilmory-photos > backup-list.txt

# 更新清单格式
curl -X POST https://your-worker.workers.dev/api/sync?force=true
```

### 版本回滚
```bash
# 查看部署历史
wrangler deployments list

# 回滚到指定版本
wrangler rollback [deployment-id]
```

## 📞 支持和帮助

- **文档**: [README-WORKERS.md](./README-WORKERS.md)
- **问题反馈**: GitHub Issues
- **社区讨论**: GitHub Discussions
- **Cloudflare 文档**: [workers.cloudflare.com](https://workers.cloudflare.com)

---

🎉 恭喜！你的 Afilmory 照片画廊现在运行在全球边缘网络上，享受极速的访问体验！
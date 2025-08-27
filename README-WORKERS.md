# Afilmory for Cloudflare Workers

这是 Afilmory 照片画廊的 Cloudflare Workers 版本，完全适配 Workers 环境，支持 R2 存储和边缘计算。

## 🌟 特性

### 核心功能保留
- ✅ **高性能 WebGL 图片渲染器** - 完全保留原有功能
- ✅ **响应式瀑布流布局** - 适配移动端和桌面端
- ✅ **现代化 UI 设计** - Tailwind CSS + Radix UI
- ✅ **增量同步** - 智能变更检测，只处理新增或修改的照片
- ✅ **多语言支持** - i18n 国际化
- ✅ **OpenGraph 支持** - 社交媒体分享优化

### Workers 环境优化
- 🚀 **边缘计算** - 全球 CDN 加速，低延迟访问
- 💾 **R2 存储集成** - 原生支持 Cloudflare R2 对象存储
- 🔄 **KV 缓存** - 元数据和清单文件高速缓存
- ⚡ **无服务器架构** - 零运维，自动扩缩容
- 🌍 **全球部署** - 一键部署到全球边缘节点

### 图片处理
- 🖼️ **智能缩略图** - 动态生成多尺寸缩略图
- 📷 **EXIF 信息提取** - 完整的拍摄参数显示
- 🌈 **Blurhash 占位符** - 优雅的图片加载体验
- 📱 **Live Photo 支持** - iPhone Live Photos 检测和显示
- ☀️ **HDR 图片支持** - 高动态范围图片显示

## 🏗️ 技术架构

### 后端 (Cloudflare Workers)
- **Cloudflare Workers** - 边缘计算运行时
- **R2 Object Storage** - 图片和静态资源存储
- **KV Storage** - 元数据和缓存存储
- **TypeScript** - 类型安全的开发体验

### 前端 (保持原有技术栈)
- **React 19** - 最新 React 版本
- **TypeScript** - 完整类型安全
- **Vite** - 现代构建工具
- **Tailwind CSS** - 原子化 CSS 框架
- **Radix UI** - 无障碍组件库

### 存储架构
- **主存储**: Cloudflare R2 (照片和静态资源)
- **缓存存储**: Cloudflare R2 (缩略图和处理后的图片)
- **元数据存储**: Cloudflare KV (照片清单和配置)
- **外部同步**: 支持从 S3、GitHub 等外部源同步

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler auth login

# 克隆项目
git clone https://github.com/your-username/afilmory-workers.git
cd afilmory-workers
```

### 2. 环境设置

```bash
# 安装依赖
npm install

# 设置 Cloudflare 资源
npm run setup

# 这将创建：
# - R2 存储桶 (afilmory-photos, afilmory-cache)
# - KV 命名空间 (METADATA1_KV)
# - 更新 wrangler.toml 配置
```

### 3. 配置环境变量

复制并编辑环境变量文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 外部 S3 存储 (可选)
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-source-bucket
S3_PREFIX=photos/

# GitHub 集成 (可选)
GITHUB_TOKEN=your-github-token
GITHUB_REPO=username/repo-name

# 站点配置
SITE_NAME=My Photo Gallery
SITE_TITLE=My Photo Gallery
SITE_URL=https://your-domain.com
```

### 4. 上传照片

将照片上传到 R2 存储桶：

```bash
# 使用 wrangler 上传
wrangler r2 object put afilmory-photos/2024/photo1.jpg --file=./photos/photo1.jpg

# 或批量上传
find ./photos -name "*.jpg" -exec wrangler r2 object put afilmory-photos/{} --file={} \;
```

### 5. 构建和部署

```bash
# 构建前端应用
npm run build

# 部署到 Cloudflare Workers
npm run deploy
```

## 📋 可用命令

### 开发命令

```bash
# 本地开发
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 代码检查
npm run lint
```

### 构建和部署

```bash
# 构建前端应用
npm run build:frontend

# 上传静态资源到 R2
npm run upload-static

# 完整构建 (前端 + 静态资源上传)
npm run build

# 部署 Worker
npm run deploy

# 部署到生产环境
npm run deploy:production
```

### 管理命令

```bash
# 同步照片 (触发 Worker 中的同步)
curl -X POST https://your-worker.your-subdomain.workers.dev/api/sync

# 查看统计信息
curl https://your-worker.your-subdomain.workers.dev/api/stats

# 获取照片清单
curl https://your-worker.your-subdomain.workers.dev/api/manifest
```

## ⚙️ 配置选项

### wrangler.toml 配置

```toml
name = "afilmory-workers"
main = "src/index.ts"
compatibility_date = "2024-12-01"

# R2 存储绑定
[[r2_buckets]]
binding = "PHOTOS_BUCKET"
bucket_name = "afilmory-photos"

[[r2_buckets]]
binding = "CACHE_BUCKET"
bucket_name = "afilmory-cache"

# KV 存储绑定
[[kv_namespaces]]
binding = "METADATA1_KV"
id = "your-kv-namespace-id"
```

### 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `S3_BUCKET_NAME` | 外部 S3 存储桶名称 | 否 |
| `S3_ACCESS_KEY_ID` | S3 访问密钥 ID | 否 |
| `S3_SECRET_ACCESS_KEY` | S3 访问密钥 | 否 |
| `GITHUB_TOKEN` | GitHub 访问令牌 | 否 |
| `GITHUB_REPO` | GitHub 仓库 | 否 |

## 🔧 高级配置

### 自定义域名

1. 在 Cloudflare Dashboard 中添加自定义域名
2. 更新 `wrangler.toml`:

```toml
[env.production]
routes = [
  { pattern = "gallery.yourdomain.com/*", custom_domain = true }
]
```

### 缓存策略

Workers 版本使用多层缓存：

1. **边缘缓存**: Cloudflare CDN 自动缓存静态资源
2. **R2 缓存**: 缩略图和处理后的图片缓存
3. **KV 缓存**: 元数据和清单文件缓存

### 性能优化

- **图片优化**: 自动 WebP 转换和压缩
- **缩略图生成**: 多尺寸缩略图按需生成
- **CDN 加速**: 全球边缘节点分发
- **智能缓存**: 基于文件修改时间的增量更新

## 📊 监控和分析

### Cloudflare Analytics

在 Cloudflare Dashboard 中查看：
- 请求量和响应时间
- 错误率和状态码分布
- 地理分布和流量来源
- Workers 执行时间和内存使用

### 自定义监控

```bash
# 查看 Worker 日志
wrangler tail

# 查看 R2 使用情况
wrangler r2 bucket list

# 查看 KV 使用情况
wrangler kv:namespace list
```

## 🔒 安全考虑

- **访问控制**: 通过 Cloudflare Access 控制管理接口
- **API 限流**: 内置请求频率限制
- **CORS 配置**: 安全的跨域资源共享设置
- **内容安全**: 自动图片格式验证和安全检查

## 💰 成本优化

### Cloudflare Workers 免费额度
- **请求**: 100,000 次/天
- **CPU 时间**: 10ms/请求
- **内存**: 128MB

### R2 存储定价
- **存储**: $0.015/GB/月
- **Class A 操作**: $4.50/百万次
- **Class B 操作**: $0.36/百万次
- **出站流量**: 免费 (通过 Cloudflare CDN)

### 优化建议
- 使用缩略图减少带宽消耗
- 启用图片压缩和 WebP 转换
- 合理设置缓存策略
- 定期清理未使用的资源

## 🚨 故障排除

### 常见问题

1. **部署失败**
   ```bash
   # 检查 wrangler.toml 配置
   wrangler whoami
   wrangler r2 bucket list
   ```

2. **图片无法显示**
   ```bash
   # 检查 R2 存储桶权限
   wrangler r2 object list afilmory-photos
   ```

3. **同步失败**
   ```bash
   # 查看 Worker 日志
   wrangler tail
   ```

### 调试模式

```bash
# 启用详细日志
wrangler dev --local --debug

# 查看实时日志
wrangler tail --format=pretty
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License © 2025

---

如果这个项目对你有帮助，请给它一个 ⭐️ Star！
# Afilmory Workers 快速开始指南

## 🚀 最简单的部署方式

### 方法一：GitHub 一键部署 (推荐)

1. **Fork 仓库**
   - 访问 [GitHub 仓库](https://github.com/your-username/afilmory-workers)
   - 点击右上角的 "Fork" 按钮

2. **获取 Cloudflare 凭据**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 获取 Account ID (右侧边栏)
   - 创建 API Token (My Profile > API Tokens > Create Token)

3. **配置 GitHub Secrets**
   - 在你的 Fork 仓库中，进入 Settings > Secrets and variables > Actions
   - 添加以下 Secrets：
     - `CLOUDFLARE_API_TOKEN`: 你的 API Token
     - `CLOUDFLARE_ACCOUNT_ID`: 你的 Account ID

4. **触发部署**
   - 推送任何代码到 main 分支
   - 或者在 Actions 页面手动触发 "Deploy to Cloudflare Workers"

5. **完成！**
   - 部署完成后，访问 `https://afilmory-workers.your-subdomain.workers.dev`

### 方法二：本地快速部署

```bash
# 1. 克隆项目
git clone https://github.com/your-username/afilmory-workers.git
cd afilmory-workers

# 2. 安装 Wrangler (如果没有)
npm install -g wrangler

# 3. 登录 Cloudflare
wrangler auth login

# 4. 一键部署
chmod +x deploy-simple.sh
./deploy-simple.sh
```

## 📸 上传照片

部署完成后，上传你的照片：

```bash
# 单张照片
wrangler r2 object put afilmory-photos/2024/photo1.jpg --file=./photo1.jpg

# 批量上传
find ./photos -name "*.jpg" -exec wrangler r2 object put afilmory-photos/{} --file={} \;
```

## 🔄 同步照片

上传照片后，触发同步：

```bash
curl -X POST https://your-worker.workers.dev/api/sync
```

## 🎉 完成！

现在访问你的照片画廊：`https://your-worker.workers.dev`

## 🔧 可选配置

### 自定义域名
1. 在 Cloudflare Dashboard 中添加你的域名
2. 在 Workers & Pages 中设置自定义域名

### 外部存储同步
如果你有现有的 S3 存储，可以配置自动同步：

1. 编辑 `wrangler.toml`，添加环境变量：
```toml
[vars]
S3_BUCKET_NAME = "your-bucket"
S3_ACCESS_KEY_ID = "your-key"
S3_SECRET_ACCESS_KEY = "your-secret"
```

2. 重新部署：
```bash
wrangler deploy
```

## 🆘 遇到问题？

### 常见问题
- **部署失败**: 检查 API Token 权限
- **照片不显示**: 确保照片已上传到 R2 存储桶
- **同步失败**: 查看 Worker 日志 `wrangler tail`

### 获取帮助
- [完整部署指南](./DEPLOYMENT-GUIDE.md)
- [GitHub Issues](https://github.com/your-username/afilmory-workers/issues)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)

---

🎊 享受你的全球化照片画廊吧！
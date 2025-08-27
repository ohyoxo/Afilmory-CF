# Afilmory for Cloudflare Workers

<p align="center">
  <img src="https://github.com/Afilmory/assets/blob/main/afilmory-readme.webp?raw=true" alt="Afilmory" width="100%" />
</p>

一个运行在 Cloudflare Workers 上的现代化照片画廊，具有全球边缘计算能力、零运维成本和极致性能。

## ✨ 特性

- 🚀 **边缘计算** - 全球 200+ 节点，毫秒级响应
- 💾 **R2 存储** - 原生 Cloudflare R2 对象存储集成
- 🖼️ **智能图片处理** - 动态缩略图生成和优化
- 📱 **响应式设计** - 完美适配所有设备
- 🌍 **多语言支持** - 国际化 i18n 支持
- 📷 **EXIF 信息** - 完整的拍摄参数显示
- 🗺️ **地图功能** - GPS 位置可视化
- ⚡ **PWA 支持** - 渐进式 Web 应用
- 💰 **超低成本** - 小型画廊每月仅需 $0.02

## 🚀 快速开始

### 方法一：GitHub 一键部署 (推荐)

1. **Fork 这个仓库**
2. **添加 Cloudflare 凭据到 GitHub Secrets**：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. **推送代码，自动部署！**

详细步骤：[快速开始指南](./QUICK-START.md)

### 方法二：本地部署

```bash
# 克隆项目
git clone https://github.com/your-username/afilmory-workers.git
cd afilmory-workers

# 一键部署
chmod +x deploy-simple.sh
./deploy-simple.sh
```

## 📸 使用方法

### 1. 上传照片
```bash
# 单张照片
wrangler r2 object put afilmory-photos/2024/photo1.jpg --file=./photo1.jpg

# 批量上传
find ./photos -name "*.jpg" -exec wrangler r2 object put afilmory-photos/{} --file={} \;
```

### 2. 同步照片
```bash
curl -X POST https://your-worker.workers.dev/api/sync
```

### 3. 访问画廊
打开 `https://your-worker.workers.dev` 即可查看你的照片画廊！

## 🏗️ 技术架构

- **后端**: Cloudflare Workers (TypeScript)
- **前端**: React 19 + Vite + Tailwind CSS
- **存储**: Cloudflare R2 + KV
- **CDN**: Cloudflare 全球网络
- **部署**: GitHub Actions + Wrangler

## 💰 成本分析

| 画廊规模 | 存储 | 月成本 |
|---------|------|--------|
| 小型 (500张照片, 1GB) | R2 存储 | ~$0.02 |
| 中型 (2000张照片, 5GB) | R2 存储 | ~$0.08 |
| 大型 (10000张照片, 20GB) | R2 存储 | ~$0.50 |

*基于 Cloudflare Workers 免费额度和 R2 存储定价*

## 📚 文档

- [快速开始指南](./QUICK-START.md) - 5分钟部署指南
- [详细部署指南](./DEPLOYMENT-GUIDE.md) - 完整配置说明
- [项目总结](./WORKERS-SUMMARY.md) - 技术架构详解
- [API 文档](./API.md) - 接口说明

## 🌟 功能对比

| 功能 | 原版 Afilmory | Workers 版本 |
|------|--------------|-------------|
| WebGL 渲染器 | ✅ | ✅ |
| 瀑布流布局 | ✅ | ✅ |
| EXIF 信息 | ✅ | ✅ |
| 多语言支持 | ✅ | ✅ |
| Live Photo | ✅ | ✅ |
| 地图功能 | ✅ | ✅ |
| 全球 CDN | ❌ | ✅ |
| 零运维 | ❌ | ✅ |
| 边缘计算 | ❌ | ✅ |
| 超低成本 | ❌ | ✅ |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License © 2025

## 🔗 相关链接

- [原版 Afilmory](https://github.com/Afilmory/Afilmory)
- [Cloudflare Workers](https://workers.cloudflare.com)
- [演示站点](https://afilmory-workers.your-subdomain.workers.dev)

---

如果这个项目对你有帮助，请给它一个 ⭐️ Star！
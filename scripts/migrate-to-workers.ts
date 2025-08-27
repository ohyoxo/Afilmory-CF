#!/usr/bin/env tsx
/**
 * 迁移脚本：从原 Afilmory 项目迁移到 Cloudflare Workers 版本
 * 帮助用户迁移现有的配置、数据和资源
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface MigrationConfig {
  sourceDir: string
  preserveData: boolean
  migrateConfig: boolean
  migrateAssets: boolean
  uploadToR2: boolean
}

async function main() {
  console.log('🔄 Afilmory Workers 迁移工具')
  console.log('================================')
  
  const config = await getMigrationConfig()
  
  try {
    console.log('开始迁移...')
    
    // 1. 验证源项目
    await validateSourceProject(config.sourceDir)
    
    // 2. 迁移配置文件
    if (config.migrateConfig) {
      await migrateConfiguration(config.sourceDir)
    }
    
    // 3. 迁移静态资源
    if (config.migrateAssets) {
      await migrateAssets(config.sourceDir)
    }
    
    // 4. 迁移照片数据
    if (config.preserveData) {
      await migratePhotoData(config.sourceDir, config.uploadToR2)
    }
    
    // 5. 生成新的配置文件
    await generateWorkersConfig(config.sourceDir)
    
    // 6. 显示迁移后的步骤
    showPostMigrationSteps()
    
    console.log('✅ 迁移完成！')
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  }
}

async function getMigrationConfig(): Promise<MigrationConfig> {
  // 简化版本，实际可以使用 inquirer 等库进行交互式配置
  return {
    sourceDir: process.env.SOURCE_DIR || '../afilmory-original',
    preserveData: process.env.PRESERVE_DATA !== 'false',
    migrateConfig: process.env.MIGRATE_CONFIG !== 'false',
    migrateAssets: process.env.MIGRATE_ASSETS !== 'false',
    uploadToR2: process.env.UPLOAD_TO_R2 === 'true'
  }
}

async function validateSourceProject(sourceDir: string): Promise<void> {
  console.log('🔍 验证源项目...')
  
  if (!existsSync(sourceDir)) {
    throw new Error(`源项目目录不存在: ${sourceDir}`)
  }
  
  const packageJsonPath = join(sourceDir, 'package.json')
  if (!existsSync(packageJsonPath)) {
    throw new Error('源项目中未找到 package.json')
  }
  
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  if (packageJson.name !== '@afilmory/monorepo') {
    console.warn('⚠️ 源项目可能不是 Afilmory 项目')
  }
  
  console.log('✅ 源项目验证通过')
}

async function migrateConfiguration(sourceDir: string): Promise<void> {
  console.log('⚙️ 迁移配置文件...')
  
  // 迁移站点配置
  const siteConfigPath = join(sourceDir, 'site.config.ts')
  if (existsSync(siteConfigPath)) {
    const siteConfig = readFileSync(siteConfigPath, 'utf-8')
    
    // 解析配置并转换为环境变量格式
    const envVars = extractSiteConfigToEnv(siteConfig)
    
    // 更新 .env 文件
    updateEnvFile(envVars)
    
    console.log('✅ 站点配置已迁移')
  }
  
  // 迁移构建器配置
  const builderConfigPath = join(sourceDir, 'builder.config.json')
  if (existsSync(builderConfigPath)) {
    const builderConfig = JSON.parse(readFileSync(builderConfigPath, 'utf-8'))
    
    // 转换构建器配置
    const envVars = extractBuilderConfigToEnv(builderConfig)
    updateEnvFile(envVars)
    
    console.log('✅ 构建器配置已迁移')
  }
  
  // 迁移用户配置
  const userConfigPath = join(sourceDir, 'config.json')
  if (existsSync(userConfigPath)) {
    const userConfig = JSON.parse(readFileSync(userConfigPath, 'utf-8'))
    
    const envVars = extractUserConfigToEnv(userConfig)
    updateEnvFile(envVars)
    
    console.log('✅ 用户配置已迁移')
  }
}

async function migrateAssets(sourceDir: string): Promise<void> {
  console.log('📁 迁移静态资源...')
  
  const assetsDir = join(rootDir, 'assets')
  if (!existsSync(assetsDir)) {
    mkdirSync(assetsDir, { recursive: true })
  }
  
  // 迁移 logo 和图标
  const logoPath = join(sourceDir, 'logo.jpg')
  if (existsSync(logoPath)) {
    copyFileSync(logoPath, join(assetsDir, 'logo.jpg'))
    console.log('✅ Logo 已迁移')
  }
  
  // 迁移本地化文件
  const localesDir = join(sourceDir, 'locales')
  if (existsSync(localesDir)) {
    const targetLocalesDir = join(rootDir, 'locales')
    execSync(`cp -r "${localesDir}" "${targetLocalesDir}"`)
    console.log('✅ 本地化文件已迁移')
  }
}

async function migratePhotoData(sourceDir: string, uploadToR2: boolean): Promise<void> {
  console.log('📸 迁移照片数据...')
  
  // 查找现有的照片清单
  const manifestPaths = [
    join(sourceDir, 'packages/data/src/photos-manifest.json'),
    join(sourceDir, 'apps/web/public/manifest.json'),
    join(sourceDir, 'manifest.json')
  ]
  
  let manifestPath = ''
  for (const path of manifestPaths) {
    if (existsSync(path)) {
      manifestPath = path
      break
    }
  }
  
  if (!manifestPath) {
    console.warn('⚠️ 未找到照片清单文件')
    return
  }
  
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  console.log(`📊 找到 ${manifest.photos?.length || 0} 张照片`)
  
  if (uploadToR2 && manifest.photos?.length > 0) {
    console.log('☁️ 上传照片到 R2...')
    
    // 这里需要实现照片上传逻辑
    // 由于涉及大量文件操作，建议用户手动上传或使用 rclone
    console.log('💡 建议使用以下命令手动上传照片:')
    console.log('   rclone copy /path/to/photos/ :r2:afilmory-photos/')
    console.log('   或使用 wrangler r2 object put 命令')
  }
  
  // 保存迁移后的清单
  const workersManifest = convertManifestFormat(manifest)
  writeFileSync(
    join(rootDir, 'migrated-manifest.json'),
    JSON.stringify(workersManifest, null, 2)
  )
  
  console.log('✅ 照片清单已转换并保存')
}

async function generateWorkersConfig(sourceDir: string): Promise<void> {
  console.log('📝 生成 Workers 配置...')
  
  // 生成 wrangler.toml
  const wranglerConfig = generateWranglerConfig()
  writeFileSync(join(rootDir, 'wrangler.toml'), wranglerConfig)
  
  // 生成部署脚本
  const deployScript = generateDeployScript()
  writeFileSync(join(rootDir, 'deploy.sh'), deployScript)
  execSync(`chmod +x ${join(rootDir, 'deploy.sh')}`)
  
  console.log('✅ Workers 配置文件已生成')
}

function extractSiteConfigToEnv(siteConfig: string): Record<string, string> {
  const envVars: Record<string, string> = {}
  
  // 简单的正则匹配提取配置
  const nameMatch = siteConfig.match(/name:\s*['"`]([^'"`]+)['"`]/)
  if (nameMatch) envVars.SITE_NAME = nameMatch[1]
  
  const titleMatch = siteConfig.match(/title:\s*['"`]([^'"`]+)['"`]/)
  if (titleMatch) envVars.SITE_TITLE = titleMatch[1]
  
  const descriptionMatch = siteConfig.match(/description:\s*['"`]([^'"`]+)['"`]/)
  if (descriptionMatch) envVars.SITE_DESCRIPTION = descriptionMatch[1]
  
  const urlMatch = siteConfig.match(/url:\s*['"`]([^'"`]+)['"`]/)
  if (urlMatch) envVars.SITE_URL = urlMatch[1]
  
  return envVars
}

function extractBuilderConfigToEnv(builderConfig: any): Record<string, string> {
  const envVars: Record<string, string> = {}
  
  if (builderConfig.storage) {
    const storage = builderConfig.storage
    if (storage.bucket) envVars.S3_BUCKET_NAME = storage.bucket
    if (storage.region) envVars.S3_REGION = storage.region
    if (storage.endpoint) envVars.S3_ENDPOINT = storage.endpoint
    if (storage.accessKeyId) envVars.S3_ACCESS_KEY_ID = storage.accessKeyId
    if (storage.secretAccessKey) envVars.S3_SECRET_ACCESS_KEY = storage.secretAccessKey
    if (storage.prefix) envVars.S3_PREFIX = storage.prefix
    if (storage.customDomain) envVars.S3_CUSTOM_DOMAIN = storage.customDomain
  }
  
  if (builderConfig.repo?.url) {
    envVars.GITHUB_REPO = builderConfig.repo.url.replace('https://github.com/', '')
  }
  
  return envVars
}

function extractUserConfigToEnv(userConfig: any): Record<string, string> {
  const envVars: Record<string, string> = {}
  
  if (userConfig.author) {
    if (userConfig.author.name) envVars.SITE_AUTHOR_NAME = userConfig.author.name
    if (userConfig.author.url) envVars.SITE_AUTHOR_URL = userConfig.author.url
    if (userConfig.author.avatar) envVars.SITE_AUTHOR_AVATAR = userConfig.author.avatar
  }
  
  if (userConfig.social) {
    if (userConfig.social.twitter) envVars.SOCIAL_TWITTER = userConfig.social.twitter
    if (userConfig.social.github) envVars.SOCIAL_GITHUB = userConfig.social.github
    if (userConfig.social.rss) envVars.SOCIAL_RSS = userConfig.social.rss.toString()
  }
  
  return envVars
}

function updateEnvFile(envVars: Record<string, string>): void {
  const envPath = join(rootDir, '.env')
  let envContent = ''
  
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8')
  }
  
  // 添加新的环境变量
  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    const line = `${key}=${value}`
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, line)
    } else {
      envContent += `\n${line}`
    }
  }
  
  writeFileSync(envPath, envContent.trim() + '\n')
}

function convertManifestFormat(oldManifest: any): any {
  // 转换旧格式的清单到新格式
  return {
    photos: oldManifest.photos || [],
    lastUpdated: new Date().toISOString(),
    totalCount: oldManifest.photos?.length || 0,
    version: '2.0.0'
  }
}

function generateWranglerConfig(): string {
  return `# Cloudflare Workers 配置 (自动生成)
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
`
}

function generateDeployScript(): string {
  return `#!/bin/bash
# 自动生成的部署脚本

echo "🚀 部署 Afilmory Workers..."

# 安装依赖
npm install

# 设置 Cloudflare 资源
npm run setup

# 构建和部署
npm run build
npm run deploy

echo "✅ 部署完成！"
`
}

function showPostMigrationSteps(): void {
  console.log('\n📋 迁移后的步骤:')
  console.log('1. 检查并更新 .env 文件中的配置')
  console.log('2. 运行: npm run setup (创建 Cloudflare 资源)')
  console.log('3. 上传照片到 R2 存储桶')
  console.log('4. 运行: npm run build && npm run deploy')
  console.log('5. 访问你的新 Workers 应用')
  console.log('\n💡 详细说明请参考 DEPLOYMENT-GUIDE.md')
}

// 运行迁移脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
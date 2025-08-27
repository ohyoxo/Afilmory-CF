#!/usr/bin/env tsx
/**
 * Cloudflare Workers 环境设置脚本
 * 创建必要的 R2 存储桶和 KV 命名空间
 */

import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface SetupConfig {
  environment: 'development' | 'production'
  createBuckets: boolean
  createKV: boolean
  updateConfig: boolean
}

async function main() {
  const config: SetupConfig = {
    environment: (process.env.NODE_ENV as any) || 'development',
    createBuckets: process.env.CREATE_BUCKETS !== 'false',
    createKV: process.env.CREATE_KV !== 'false',
    updateConfig: process.env.UPDATE_CONFIG !== 'false'
  }

  console.log('🔧 Setting up Cloudflare Workers environment...')
  console.log('Config:', config)

  try {
    let bucketNames: Record<string, string> = {}
    let kvNamespaces: Record<string, string> = {}

    // 1. 创建 R2 存储桶
    if (config.createBuckets) {
      bucketNames = await createR2Buckets(config.environment)
    }

    // 2. 创建 KV 命名空间
    if (config.createKV) {
      kvNamespaces = await createKVNamespaces(config.environment)
    }

    // 3. 更新 wrangler.toml 配置
    if (config.updateConfig) {
      await updateWranglerConfig(config.environment, bucketNames, kvNamespaces)
    }

    // 4. 生成环境变量模板
    await generateEnvTemplate(config.environment)

    console.log('✅ Setup completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Update your wrangler.toml with the correct bucket names and KV namespace IDs')
    console.log('2. Set up your environment variables in .env file')
    console.log('3. Upload your photos to the R2 bucket')
    console.log('4. Run: npm run build && npm run deploy')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

async function createR2Buckets(environment: string): Promise<Record<string, string>> {
  console.log('🪣 Creating R2 buckets...')
  
  const suffix = environment === 'production' ? '' : '-dev'
  const buckets = {
    photos: `afilmory-photos${suffix}`,
    cache: `afilmory-cache${suffix}`
  }

  for (const [key, bucketName] of Object.entries(buckets)) {
    try {
      execSync(`wrangler r2 bucket create ${bucketName}`, { stdio: 'inherit' })
      console.log(`✅ Created bucket: ${bucketName}`)
    } catch (error) {
      console.warn(`⚠️ Bucket ${bucketName} might already exist or creation failed`)
    }
  }

  return buckets
}

async function createKVNamespaces(environment: string): Promise<Record<string, string>> {
  console.log('🗄️ Creating KV namespaces...')
  
  const suffix = environment === 'production' ? '' : '-dev'
  const namespaces = {
    metadata: `METADATA1_KV${suffix}`
  }

  const kvIds: Record<string, string> = {}

  for (const [key, namespaceName] of Object.entries(namespaces)) {
    try {
      const output = execSync(`wrangler kv:namespace create ${namespaceName}`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      })
      
      // 解析输出获取 namespace ID
      const match = output.match(/id = "([^"]+)"/)
      if (match) {
        kvIds[key] = match[1]
        console.log(`✅ Created KV namespace: ${namespaceName} (${match[1]})`)
      }
    } catch (error) {
      console.warn(`⚠️ KV namespace ${namespaceName} creation failed:`, error)
    }
  }

  return kvIds
}

async function updateWranglerConfig(
  environment: string,
  bucketNames: Record<string, string>,
  kvNamespaces: Record<string, string>
): Promise<void> {
  console.log('📝 Updating wrangler.toml configuration...')
  
  const wranglerPath = join(rootDir, 'wrangler.toml')
  
  if (!existsSync(wranglerPath)) {
    console.warn('⚠️ wrangler.toml not found, skipping config update')
    return
  }

  let config = readFileSync(wranglerPath, 'utf-8')

  // 更新存储桶名称
  if (bucketNames.photos) {
    config = config.replace(
      /bucket_name = "afilmory-photos(-dev)?"/g,
      `bucket_name = "${bucketNames.photos}"`
    )
  }
  
  if (bucketNames.cache) {
    config = config.replace(
      /bucket_name = "afilmory-cache(-dev)?"/g,
      `bucket_name = "${bucketNames.cache}"`
    )
  }

  // 更新 KV namespace ID
  if (kvNamespaces.metadata) {
    config = config.replace(
      /id = "your(-dev)?-kv-namespace-id"/g,
      `id = "${kvNamespaces.metadata}"`
    )
  }

  writeFileSync(wranglerPath, config)
  console.log('✅ Updated wrangler.toml configuration')
}

async function generateEnvTemplate(environment: string): Promise<void> {
  console.log('📄 Generating environment template...')
  
  const envTemplate = `# Cloudflare Workers Environment Variables
# Copy this to .env and fill in your values

# Environment
NODE_ENV=${environment}

# External S3 Storage (optional)
# If you want to sync from an external S3-compatible storage
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET_NAME=your-source-bucket
S3_PREFIX=photos/
S3_CUSTOM_DOMAIN=https://your-cdn-domain.com

# GitHub Integration (optional)
# For syncing from GitHub repository
GITHUB_TOKEN=your-github-token
GITHUB_REPO=username/repo-name

# Site Configuration
SITE_NAME=My Photo Gallery
SITE_TITLE=My Photo Gallery
SITE_DESCRIPTION=A beautiful photo gallery powered by Cloudflare Workers
SITE_URL=https://your-domain.com
SITE_AUTHOR_NAME=Your Name
SITE_AUTHOR_URL=https://your-website.com
`

  const envPath = join(rootDir, `.env.${environment}.example`)
  writeFileSync(envPath, envTemplate)
  
  console.log(`✅ Generated environment template: ${envPath}`)
}

// 运行设置脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
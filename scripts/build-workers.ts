#!/usr/bin/env tsx
/**
 * Cloudflare Workers 构建脚本
 * 构建前端应用并上传静态资源到 R2
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

interface BuildConfig {
  environment: 'development' | 'production'
  uploadStatic: boolean
  buildFrontend: boolean
}

async function main() {
  const config: BuildConfig = {
    environment: (process.env.NODE_ENV as any) || 'production',
    uploadStatic: process.env.UPLOAD_STATIC !== 'false',
    buildFrontend: process.env.BUILD_FRONTEND !== 'false'
  }

  console.log('🚀 Building Afilmory for Cloudflare Workers...')
  console.log('Config:', config)

  try {
    // 1. 构建前端应用
    if (config.buildFrontend) {
      await buildFrontend()
    }

    // 2. 上传静态资源到 R2
    if (config.uploadStatic) {
      await uploadStaticAssets()
    }

    // 3. 部署 Worker
    await deployWorker(config.environment)

    console.log('✅ Build completed successfully!')
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

async function buildFrontend(): Promise<void> {
  console.log('📦 Building frontend application...')
  
  const webDir = join(rootDir, 'apps/web')
  
  // 安装依赖
  execSync('pnpm install', { cwd: webDir, stdio: 'inherit' })
  
  // 构建应用
  execSync('pnpm run build', { cwd: webDir, stdio: 'inherit' })
  
  console.log('✅ Frontend build completed')
}

async function uploadStaticAssets(): Promise<void> {
  console.log('☁️ Uploading static assets to R2...')
  
  const distDir = join(rootDir, 'apps/web/dist')
  
  if (!existsSync(distDir)) {
    throw new Error('Frontend dist directory not found. Please build frontend first.')
  }

  // 使用 wrangler 上传静态资源
  try {
    execSync(`wrangler r2 object put CACHE_BUCKET/static --file=${distDir} --recursive`, {
      cwd: rootDir,
      stdio: 'inherit'
    })
    console.log('✅ Static assets uploaded to R2')
  } catch (error) {
    console.warn('⚠️ Failed to upload static assets via wrangler, trying alternative method...')
    
    // 备用方案：生成上传脚本
    await generateUploadScript(distDir)
  }
}

async function generateUploadScript(distDir: string): Promise<void> {
  const uploadScript = `
#!/bin/bash
# Auto-generated upload script for static assets

echo "Uploading static assets to R2..."

# Upload all files in dist directory
find "${distDir}" -type f | while read file; do
  relative_path=\${file#${distDir}/}
  echo "Uploading: \$relative_path"
  wrangler r2 object put CACHE_BUCKET/static/\$relative_path --file="\$file"
done

echo "Upload completed!"
`

  const scriptPath = join(rootDir, 'upload-static.sh')
  writeFileSync(scriptPath, uploadScript)
  execSync(`chmod +x ${scriptPath}`)
  
  console.log(`📝 Generated upload script: ${scriptPath}`)
  console.log('Please run this script manually to upload static assets.')
}

async function deployWorker(environment: string): Promise<void> {
  console.log(`🚀 Deploying Worker to ${environment}...`)
  
  const deployCmd = environment === 'production' 
    ? 'wrangler deploy --env production'
    : 'wrangler deploy --env development'
  
  execSync(deployCmd, { cwd: rootDir, stdio: 'inherit' })
  
  console.log('✅ Worker deployed successfully')
}

// 运行构建脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
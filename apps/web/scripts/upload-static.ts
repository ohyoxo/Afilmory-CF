#!/usr/bin/env tsx
/**
 * 上传静态资源到 R2 的脚本
 * 在构建完成后将前端资源上传到 Cloudflare R2
 */

import { execSync } from 'node:child_process'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = new URL('.', import.meta.url).pathname
const webDir = join(__dirname, '..')
const distDir = join(webDir, 'dist')

interface UploadOptions {
  bucketBinding: string
  prefix: string
  dryRun: boolean
}

async function main() {
  const options: UploadOptions = {
    bucketBinding: process.env.BUCKET_BINDING || 'CACHE_BUCKET',
    prefix: process.env.UPLOAD_PREFIX || 'static',
    dryRun: process.env.DRY_RUN === 'true'
  }

  console.log('📤 Uploading static assets to R2...')
  console.log('Options:', options)

  try {
    const files = await collectFiles(distDir)
    console.log(`Found ${files.length} files to upload`)

    for (const file of files) {
      await uploadFile(file, options)
    }

    console.log('✅ All files uploaded successfully!')
  } catch (error) {
    console.error('❌ Upload failed:', error)
    process.exit(1)
  }
}

async function collectFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  
  function walkDir(currentDir: string) {
    const items = readdirSync(currentDir)
    
    for (const item of items) {
      const fullPath = join(currentDir, item)
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        walkDir(fullPath)
      } else {
        files.push(fullPath)
      }
    }
  }
  
  walkDir(dir)
  return files
}

async function uploadFile(filePath: string, options: UploadOptions): Promise<void> {
  const relativePath = relative(distDir, filePath)
  const r2Key = `${options.prefix}/${relativePath}`.replace(/\\/g, '/')
  
  const contentType = getContentType(filePath)
  const cacheControl = getCacheControl(filePath)
  
  console.log(`Uploading: ${relativePath} -> ${r2Key}`)
  
  if (options.dryRun) {
    console.log(`[DRY RUN] Would upload ${filePath} to ${r2Key}`)
    return
  }

  try {
    const cmd = [
      'wrangler r2 object put',
      `${options.bucketBinding}/${r2Key}`,
      `--file="${filePath}"`,
      `--content-type="${contentType}"`,
      `--cache-control="${cacheControl}"`
    ].join(' ')

    execSync(cmd, { stdio: 'pipe' })
  } catch (error) {
    console.error(`Failed to upload ${relativePath}:`, error)
    throw error
  }
}

function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.webmanifest': 'application/manifest+json'
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

function getCacheControl(filePath: string): string {
  const filename = filePath.split('/').pop() || ''
  
  // HTML 文件短期缓存
  if (filename.endsWith('.html')) {
    return 'public, max-age=300' // 5分钟
  }
  
  // 带哈希的资源文件长期缓存
  if (filename.includes('.') && filename.match(/\.[a-f0-9]{8,}\./)) {
    return 'public, max-age=31536000' // 1年
  }
  
  // JS/CSS 文件
  if (filename.endsWith('.js') || filename.endsWith('.css')) {
    return 'public, max-age=86400' // 1天
  }
  
  // 字体文件
  if (filename.match(/\.(woff2?|ttf|eot)$/)) {
    return 'public, max-age=31536000' // 1年
  }
  
  // 图片文件
  if (filename.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    return 'public, max-age=86400' // 1天
  }
  
  // 默认缓存
  return 'public, max-age=3600' // 1小时
}

// 运行上传脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}
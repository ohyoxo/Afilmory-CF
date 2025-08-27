/**
 * 清单服务
 * 管理照片清单的缓存和更新
 */

import type { WorkerContext } from '../lib/context'
import type { PhotoManifest } from '../types/photo'

export class ManifestService {
  private context: WorkerContext
  private cacheKey = 'photos-manifest'
  private cacheTTL = 300 // 5分钟缓存

  constructor(context: WorkerContext) {
    this.context = context
  }

  async getManifest(): Promise<PhotoManifest> {
    // 尝试从 KV 缓存获取
    const cached = await this.context.env.METADATA1_KV.get(this.cacheKey, 'json')
    if (cached && this.isCacheValid(cached)) {
      return cached.data
    }

    // 从 R2 获取清单文件
    const manifestObject = await this.context.env.PHOTOS_BUCKET.get('manifest.json')
    if (!manifestObject) {
      return { photos: [], lastUpdated: new Date().toISOString() }
    }

    const manifest = await manifestObject.json() as PhotoManifest

    // 缓存到 KV
    await this.cacheManifest(manifest)

    return manifest
  }

  async updateManifest(manifest: PhotoManifest): Promise<void> {
    // 更新时间戳
    manifest.lastUpdated = new Date().toISOString()

    // 保存到 R2
    await this.context.env.PHOTOS_BUCKET.put(
      'manifest.json',
      JSON.stringify(manifest, null, 2),
      {
        httpMetadata: {
          contentType: 'application/json'
        }
      }
    )

    // 更新缓存
    await this.cacheManifest(manifest)
  }

  private async cacheManifest(manifest: PhotoManifest): Promise<void> {
    const cacheData = {
      data: manifest,
      timestamp: Date.now()
    }

    await this.context.env.METADATA1_KV.put(
      this.cacheKey,
      JSON.stringify(cacheData),
      { expirationTtl: this.cacheTTL }
    )
  }

  private isCacheValid(cached: any): boolean {
    if (!cached.timestamp) return false
    return (Date.now() - cached.timestamp) < (this.cacheTTL * 1000)
  }

  async invalidateCache(): Promise<void> {
    await this.context.env.METADATA1_KV.delete(this.cacheKey)
  }
}
/**
 * 同步服务
 * 处理照片同步、EXIF 提取和清单更新
 * 针对 Cloudflare Workers 环境优化
 */

import type { WorkerContext } from '../lib/context'
import type { Photo, PhotoManifest } from '../types/photo'
import { ManifestService } from './manifest-service'
import { ImageService } from './image-service'

export class SyncService {
  private context: WorkerContext
  private manifestService: ManifestService
  private imageService: ImageService

  constructor(context: WorkerContext) {
    this.context = context
    this.manifestService = new ManifestService(context)
    this.imageService = new ImageService(context)
  }

  async syncPhotos(): Promise<void> {
    try {
      console.log('Starting photo sync...')
      
      // 获取当前清单
      const currentManifest = await this.manifestService.getManifest()
      const existingPhotos = new Map(
        currentManifest.photos?.map(photo => [photo.path, photo]) || []
      )

      // 获取存储中的所有图片文件
      const imageFiles = await this.listImageFiles()
      const newPhotos: Photo[] = []
      const updatedPhotos: Photo[] = []

      // 处理每个图片文件
      for (const file of imageFiles) {
        const existingPhoto = existingPhotos.get(file.key)
        
        // 检查文件是否有更新
        if (existingPhoto && existingPhoto.lastModified === file.lastModified) {
          updatedPhotos.push(existingPhoto)
          continue
        }

        // 处理新文件或更新的文件
        const photo = await this.processImageFile(file)
        if (photo) {
          if (existingPhoto) {
            // 保留现有的 ID 和用户数据
            photo.id = existingPhoto.id
            photo.title = existingPhoto.title || photo.title
            photo.description = existingPhoto.description || photo.description
            photo.tags = existingPhoto.tags || photo.tags
          }
          newPhotos.push(photo)
        }
      }

      // 合并照片列表
      const allPhotos = [...updatedPhotos, ...newPhotos]
      
      // 按拍摄时间排序
      allPhotos.sort((a, b) => {
        const dateA = new Date(a.dateTaken || a.lastModified).getTime()
        const dateB = new Date(b.dateTaken || b.lastModified).getTime()
        return dateB - dateA // 最新的在前
      })

      // 更新清单
      const updatedManifest: PhotoManifest = {
        photos: allPhotos,
        lastUpdated: new Date().toISOString(),
        totalCount: allPhotos.length
      }

      await this.manifestService.updateManifest(updatedManifest)
      
      console.log(`Sync completed. Processed ${newPhotos.length} new/updated photos, total: ${allPhotos.length}`)
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    }
  }

  private async listImageFiles(): Promise<Array<{ key: string; lastModified: string; size: number }>> {
    const files: Array<{ key: string; lastModified: string; size: number }> = []
    
    try {
      // 列出 R2 存储桶中的所有对象
      const objects = await this.context.env.PHOTOS_BUCKET.list()
      
      for (const object of objects.objects) {
        if (this.isImageFile(object.key)) {
          files.push({
            key: object.key,
            lastModified: object.uploaded.toISOString(),
            size: object.size
          })
        }
      }

      // 如果配置了外部 S3，也从那里获取
      if (this.context.env.S3_BUCKET_NAME) {
        const s3Files = await this.listS3ImageFiles()
        files.push(...s3Files)
      }
    } catch (error) {
      console.error('Failed to list image files:', error)
    }

    return files
  }

  private async listS3ImageFiles(): Promise<Array<{ key: string; lastModified: string; size: number }>> {
    // 这里需要实现 S3 API 调用
    // 由于 Workers 环境限制，这里简化处理
    return []
  }

  private isImageFile(filename: string): boolean {
    const { isSupportedImageFormat } = require('../utils/image-processing')
    return isSupportedImageFormat(filename)
  }

  private async processImageFile(file: { key: string; lastModified: string; size: number }): Promise<Photo | null> {
    try {
      // 生成照片 ID
      const photoId = this.generatePhotoId(file.key)
      
      // 获取图片 buffer 用于 EXIF 提取
      const imageBuffer = await this.imageService.getImage(file.key)
      if (!imageBuffer) {
        console.warn(`Failed to get image buffer for ${file.key}`)
        return null
      }

      // 提取 EXIF 数据
      const exifData = await this.extractExifData(imageBuffer)
      
      // 生成缩略图哈希
      const blurhash = await this.generateBlurhash(imageBuffer)
      
      // 从文件路径生成标签
      const tags = this.generateTagsFromPath(file.key)

      const photo: Photo = {
        id: photoId,
        path: file.key,
        filename: file.key.split('/').pop() || file.key,
        size: file.size,
        lastModified: file.lastModified,
        dateTaken: exifData?.dateTaken || file.lastModified,
        exif: exifData,
        blurhash,
        tags,
        thumbnails: {
          small: `/thumbnails/300x200/${file.key}`,
          medium: `/thumbnails/600x400/${file.key}`,
          large: `/thumbnails/1200x800/${file.key}`
        },
        url: `/images/${file.key}`
      }

      return photo
    } catch (error) {
      console.error(`Failed to process image ${file.key}:`, error)
      return null
    }
  }

  private generatePhotoId(path: string): string {
    // 使用路径生成唯一 ID
    return btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }

  private async extractExifData(imageBuffer: ArrayBuffer): Promise<any> {
    try {
      const { parseExifData } = await import('../utils/exif-parser')
      return await parseExifData(imageBuffer)
    } catch (error) {
      console.error('Failed to extract EXIF:', error)
      return null
    }
  }

  private async generateBlurhash(imageBuffer: ArrayBuffer): Promise<string | undefined> {
    try {
      const { generateSimpleBlurhash } = await import('../utils/image-processing')
      return generateSimpleBlurhash(imageBuffer)
    } catch (error) {
      console.error('Failed to generate blurhash:', error)
      return undefined
    }
  }

  private generateTagsFromPath(path: string): string[] {
    const tags: string[] = []
    const pathParts = path.split('/')
    
    // 从路径中提取标签
    pathParts.forEach(part => {
      if (part && part !== path.split('/').pop()) { // 排除文件名
        tags.push(part)
      }
    })

    // 从文件名提取年份
    const yearMatch = path.match(/(\d{4})/g)
    if (yearMatch) {
      tags.push(...yearMatch)
    }

    return [...new Set(tags)] // 去重
  }
}
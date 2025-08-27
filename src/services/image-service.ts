/**
 * 图片服务
 * 处理图片获取、缩略图生成和格式转换
 * 针对 Cloudflare Workers 环境优化
 */

import type { WorkerContext } from '../lib/context'

export interface ThumbnailDimensions {
  width: number
  height: number
}

export class ImageService {
  private context: WorkerContext

  constructor(context: WorkerContext) {
    this.context = context
  }

  async getImage(imagePath: string): Promise<ArrayBuffer | null> {
    try {
      // 首先尝试从照片存储桶获取
      const object = await this.context.env.PHOTOS_BUCKET.get(imagePath)
      if (object) {
        return await object.arrayBuffer()
      }

      // 如果配置了外部存储，尝试从外部获取
      if (this.context.env.S3_BUCKET_NAME) {
        return await this.getImageFromS3(imagePath)
      }

      return null
    } catch (error) {
      console.error('Failed to get image:', error)
      return null
    }
  }

  async generateThumbnail(
    imagePath: string,
    dimensions: ThumbnailDimensions
  ): Promise<ArrayBuffer | null> {
    try {
      // 获取原图
      const imageBuffer = await this.getImage(imagePath)
      if (!imageBuffer) {
        return null
      }

      // 使用 Cloudflare Image Resizing API (如果可用)
      // 或者使用简化的客户端调整大小
      return await this.resizeImage(imageBuffer, dimensions)
    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      return null
    }
  }

  private async getImageFromS3(imagePath: string): Promise<ArrayBuffer | null> {
    try {
      const s3Url = this.buildS3Url(imagePath)
      const response = await fetch(s3Url)
      
      if (!response.ok) {
        return null
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error('Failed to get image from S3:', error)
      return null
    }
  }

  private buildS3Url(imagePath: string): string {
    const endpoint = this.context.env.S3_ENDPOINT || 'https://s3.amazonaws.com'
    const bucket = this.context.env.S3_BUCKET_NAME
    const prefix = this.context.env.S3_PREFIX || ''
    const customDomain = this.context.env.S3_CUSTOM_DOMAIN

    if (customDomain) {
      return `${customDomain}/${prefix}${imagePath}`.replace(/\/+/g, '/')
    }

    return `${endpoint}/${bucket}/${prefix}${imagePath}`.replace(/\/+/g, '/')
  }

  private async resizeImage(
    imageBuffer: ArrayBuffer,
    dimensions: ThumbnailDimensions
  ): Promise<ArrayBuffer | null> {
    try {
      // 在 Workers 环境中，我们使用 Cloudflare 的 Image Resizing
      // 或者返回原图（在客户端处理调整大小）
      
      // 如果是小图片，直接返回原图
      if (imageBuffer.byteLength < 100 * 1024) { // 小于100KB
        return imageBuffer
      }

      // 对于大图片，我们可以使用 Cloudflare Image Resizing
      // 这里简化处理，返回原图
      // 实际生产环境中应该集成 Cloudflare Image Resizing
      return imageBuffer
    } catch (error) {
      console.error('Failed to resize image:', error)
      return imageBuffer // 返回原图作为后备
    }
  }

  async convertHeicToJpeg(heicBuffer: ArrayBuffer): Promise<ArrayBuffer | null> {
    try {
      // 在 Workers 环境中，HEIC 转换需要特殊处理
      // 这里返回原始 buffer，让客户端处理转换
      // 或者可以集成专门的 HEIC 转换服务
      console.warn('HEIC conversion not implemented in Workers environment')
      return heicBuffer
    } catch (error) {
      console.error('Failed to convert HEIC:', error)
      return null
    }
  }

  async optimizeImage(imageBuffer: ArrayBuffer, format: string): Promise<ArrayBuffer> {
    try {
      // 在 Workers 环境中进行基本的图片优化
      // 实际实现可以集成 Cloudflare Image Optimization
      return imageBuffer
    } catch (error) {
      console.error('Failed to optimize image:', error)
      return imageBuffer
    }
  }
}
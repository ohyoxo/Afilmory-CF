/**
 * 图片处理路由
 * 处理图片请求、缩略图生成和图片优化
 */

import type { WorkerContext } from '../lib/context'
import { ImageService } from '../services/image-service'
import { errorResponse } from '../lib/response'

class ImageRouter {
  async handle(request: Request, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      // /images/:path - 原图
      if (pathname.startsWith('/images/')) {
        const imagePath = pathname.replace('/images/', '')
        return this.serveImage(imagePath, request, context)
      }

      // /thumbnails/:size/:path - 缩略图
      if (pathname.startsWith('/thumbnails/')) {
        const parts = pathname.replace('/thumbnails/', '').split('/')
        const size = parts[0]
        const imagePath = parts.slice(1).join('/')
        return this.serveThumbnail(imagePath, size, request, context)
      }

      return errorResponse('Not Found', 404)
    } catch (error) {
      console.error('Image router error:', error)
      return errorResponse('Internal Server Error', 500)
    }
  }

  private async serveImage(
    imagePath: string,
    request: Request,
    context: WorkerContext
  ): Promise<Response> {
    const imageService = new ImageService(context)
    
    // 检查缓存
    const cacheKey = `image:${imagePath}`
    const cached = await context.env.CACHE_BUCKET.get(cacheKey)
    
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': this.getContentType(imagePath),
          'Cache-Control': 'public, max-age=31536000', // 1年缓存
          'ETag': cached.etag || ''
        }
      })
    }

    // 从存储获取图片
    const imageBuffer = await imageService.getImage(imagePath)
    if (!imageBuffer) {
      return errorResponse('Image not found', 404)
    }

    // 缓存图片
    context.ctx.waitUntil(
      context.env.CACHE_BUCKET.put(cacheKey, imageBuffer, {
        httpMetadata: {
          contentType: this.getContentType(imagePath)
        }
      })
    )

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': this.getContentType(imagePath),
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  }

  private async serveThumbnail(
    imagePath: string,
    size: string,
    request: Request,
    context: WorkerContext
  ): Promise<Response> {
    const imageService = new ImageService(context)
    
    // 解析尺寸参数
    const dimensions = this.parseThumbnailSize(size)
    if (!dimensions) {
      return errorResponse('Invalid thumbnail size', 400)
    }

    // 检查缓存
    const cacheKey = `thumbnail:${size}:${imagePath}`
    const cached = await context.env.CACHE_BUCKET.get(cacheKey)
    
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000',
          'ETag': cached.etag || ''
        }
      })
    }

    // 生成缩略图
    const thumbnail = await imageService.generateThumbnail(imagePath, dimensions)
    if (!thumbnail) {
      return errorResponse('Failed to generate thumbnail', 500)
    }

    // 缓存缩略图
    context.ctx.waitUntil(
      context.env.CACHE_BUCKET.put(cacheKey, thumbnail, {
        httpMetadata: {
          contentType: 'image/webp'
        }
      })
    )

    return new Response(thumbnail, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000'
      }
    })
  }

  private getContentType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'heic': 'image/heic',
      'heif': 'image/heif',
      'tiff': 'image/tiff',
      'tif': 'image/tiff'
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  private parseThumbnailSize(size: string): { width: number; height: number } | null {
    // 支持格式: 300x200, 300, 300x (宽度固定), x200 (高度固定)
    const match = size.match(/^(\d+)?x?(\d+)?$/)
    if (!match) return null

    const width = match[1] ? parseInt(match[1]) : undefined
    const height = match[2] ? parseInt(match[2]) : undefined

    if (!width && !height) return null

    return {
      width: width || 0,
      height: height || 0
    }
  }
}

export const imageRouter = new ImageRouter()
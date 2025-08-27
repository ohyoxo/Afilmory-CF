/**
 * API 路由处理器
 * 处理所有 /api/* 请求
 */

import type { WorkerContext } from '../lib/context'
import { PhotoService } from '../services/photo-service'
import { ManifestService } from '../services/manifest-service'
import { SyncService } from '../services/sync-service'
import { jsonResponse, errorResponse } from '../lib/response'

class ApiRouter {
  async handle(request: Request, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname
    const method = request.method

    try {
      // GET /api/photos - 获取照片列表
      if (pathname === '/api/photos' && method === 'GET') {
        return this.getPhotos(request, context)
      }

      // GET /api/photos/:id - 获取单张照片详情
      if (pathname.match(/^\/api\/photos\/[^/]+$/) && method === 'GET') {
        const photoId = pathname.split('/').pop()!
        return this.getPhoto(photoId, context)
      }

      // GET /api/manifest - 获取照片清单
      if (pathname === '/api/manifest' && method === 'GET') {
        return this.getManifest(context)
      }

      // POST /api/sync - 同步照片
      if (pathname === '/api/sync' && method === 'POST') {
        return this.syncPhotos(request, context)
      }

      // GET /api/stats - 获取统计信息
      if (pathname === '/api/stats' && method === 'GET') {
        return this.getStats(context)
      }

      return errorResponse('Not Found', 404)
    } catch (error) {
      console.error('API error:', error)
      return errorResponse('Internal Server Error', 500)
    }
  }

  private async getPhotos(request: Request, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const tag = url.searchParams.get('tag')
    const search = url.searchParams.get('search')

    const photoService = new PhotoService(context)
    const result = await photoService.getPhotos({
      page,
      limit,
      tag,
      search
    })

    return jsonResponse(result)
  }

  private async getPhoto(photoId: string, context: WorkerContext): Promise<Response> {
    const photoService = new PhotoService(context)
    const photo = await photoService.getPhoto(photoId)

    if (!photo) {
      return errorResponse('Photo not found', 404)
    }

    return jsonResponse(photo)
  }

  private async getManifest(context: WorkerContext): Promise<Response> {
    const manifestService = new ManifestService(context)
    const manifest = await manifestService.getManifest()

    return jsonResponse(manifest)
  }

  private async syncPhotos(request: Request, context: WorkerContext): Promise<Response> {
    const syncService = new SyncService(context)
    
    // 在后台执行同步，立即返回响应
    context.ctx.waitUntil(syncService.syncPhotos())

    return jsonResponse({ message: 'Sync started' })
  }

  private async getStats(context: WorkerContext): Promise<Response> {
    const photoService = new PhotoService(context)
    const stats = await photoService.getStats()

    return jsonResponse(stats)
  }
}

export const apiRouter = new ApiRouter()
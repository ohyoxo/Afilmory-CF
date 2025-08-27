/**
 * 清单文件路由
 * 处理照片清单和元数据请求
 */

import type { WorkerContext } from '../lib/context'
import { ManifestService } from '../services/manifest-service'
import { jsonResponse, errorResponse } from '../lib/response'

class ManifestRouter {
  async handle(request: Request, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      if (pathname === '/manifest.json' || pathname === '/photos-manifest.json') {
        return this.getManifest(context)
      }

      return errorResponse('Not Found', 404)
    } catch (error) {
      console.error('Manifest router error:', error)
      return errorResponse('Internal Server Error', 500)
    }
  }

  private async getManifest(context: WorkerContext): Promise<Response> {
    const manifestService = new ManifestService(context)
    const manifest = await manifestService.getManifest()

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 5分钟缓存
      }
    })
  }
}

export const manifestRouter = new ManifestRouter()
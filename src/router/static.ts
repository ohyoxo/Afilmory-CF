/**
 * 静态文件路由
 * 处理前端应用的静态资源和 SPA 路由
 */

import type { WorkerContext } from '../lib/context'
import { errorResponse } from '../lib/response'

class StaticRouter {
  async handle(request: Request, context: WorkerContext): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      // 处理静态资源
      if (this.isStaticAsset(pathname)) {
        return this.serveStaticAsset(pathname, context)
      }

      // 处理 SPA 路由 - 返回 index.html
      return this.serveIndexHtml(context)
    } catch (error) {
      console.error('Static router error:', error)
      return errorResponse('Internal Server Error', 500)
    }
  }

  private isStaticAsset(pathname: string): boolean {
    const staticExtensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.xml', '.txt'
    ]
    
    return staticExtensions.some(ext => pathname.endsWith(ext))
  }

  private async serveStaticAsset(pathname: string, context: WorkerContext): Promise<Response> {
    // 从 R2 获取静态资源
    const key = pathname.startsWith('/') ? pathname.slice(1) : pathname
    const object = await context.env.CACHE_BUCKET.get(`static/${key}`)

    if (!object) {
      return errorResponse('Static asset not found', 404)
    }

    const contentType = this.getContentType(pathname)
    const cacheControl = this.getCacheControl(pathname)

    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'ETag': object.etag || ''
      }
    })
  }

  private async serveIndexHtml(context: WorkerContext): Promise<Response> {
    // 从 R2 获取 index.html
    const object = await context.env.CACHE_BUCKET.get('static/index.html')

    if (!object) {
      return errorResponse('Application not found', 404)
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300' // 5分钟缓存
      }
    })
  }

  private getContentType(pathname: string): string {
    const ext = pathname.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject',
      'xml': 'application/xml',
      'txt': 'text/plain'
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  private getCacheControl(pathname: string): string {
    // 静态资源长期缓存
    if (pathname.includes('/assets/') || pathname.match(/\.(js|css|woff2?|ttf|eot)$/)) {
      return 'public, max-age=31536000' // 1年
    }
    
    // 图片资源
    if (pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
      return 'public, max-age=86400' // 1天
    }
    
    // 其他文件
    return 'public, max-age=3600' // 1小时
  }
}

export const staticRouter = new StaticRouter()
/**
 * 路由处理器
 * 根据请求路径分发到不同的处理器
 */

import type { WorkerContext } from '../lib/context'
import { apiRouter } from './api'
import { staticRouter } from './static'
import { manifestRouter } from './manifest'
import { imageRouter } from './image'

export class Router {
  private context: WorkerContext

  constructor(context: WorkerContext) {
    this.context = context
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname

    // API 路由
    if (pathname.startsWith('/api/')) {
      return apiRouter.handle(request, this.context)
    }

    // 图片处理路由
    if (pathname.startsWith('/images/') || pathname.startsWith('/thumbnails/')) {
      return imageRouter.handle(request, this.context)
    }

    // 清单文件路由
    if (pathname === '/manifest.json' || pathname === '/photos-manifest.json') {
      return manifestRouter.handle(request, this.context)
    }

    // 静态文件路由
    return staticRouter.handle(request, this.context)
  }
}

export function createRouter(context: WorkerContext): Router {
  return new Router(context)
}
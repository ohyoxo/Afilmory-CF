/**
 * Cloudflare Workers 主入口文件
 * 处理所有 HTTP 请求并路由到相应的处理器
 */

import { createRouter } from './router'
import { createContext } from './lib/context'
import { handleError } from './lib/error-handler'
import { corsHeaders } from './lib/cors'

export interface Env {
  // R2 存储绑定
  PHOTOS_BUCKET: R2Bucket
  CACHE_BUCKET: R2Bucket
  
  // KV 存储绑定
  METADATA1_KV: KVNamespace
  
  // 环境变量
  ENVIRONMENT: string
  S3_REGION?: string
  S3_ACCESS_KEY_ID?: string
  S3_SECRET_ACCESS_KEY?: string
  S3_ENDPOINT?: string
  S3_BUCKET_NAME?: string
  S3_PREFIX?: string
  S3_CUSTOM_DOMAIN?: string
  GITHUB_TOKEN?: string
  GITHUB_REPO?: string
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // 创建上下文
      const context = createContext(env, ctx)
      
      // 处理 CORS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: corsHeaders
        })
      }
      
      // 创建路由器并处理请求
      const router = createRouter(context)
      const response = await router.handle(request)
      
      // 添加 CORS 头
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    } catch (error) {
      console.error('Worker error:', error)
      return handleError(error)
    }
  }
}
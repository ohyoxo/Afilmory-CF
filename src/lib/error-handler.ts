/**
 * 错误处理器
 * 统一处理 Worker 中的错误
 */

import { errorResponse } from './response'

export function handleError(error: unknown): Response {
  console.error('Worker error:', error)
  
  if (error instanceof Error) {
    // 开发环境返回详细错误信息
    if (process.env.NODE_ENV === 'development') {
      return errorResponse(`${error.name}: ${error.message}`, 500)
    }
  }
  
  return errorResponse('Internal Server Error', 500)
}
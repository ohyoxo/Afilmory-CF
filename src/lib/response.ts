/**
 * 响应工具函数
 * 提供统一的响应格式和错误处理
 */

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({
    error: message,
    status
  }, status)
}

export function textResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html'
    }
  })
}
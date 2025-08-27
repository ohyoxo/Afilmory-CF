/**
 * API 客户端 - Cloudflare Workers 版本
 * 适配 Workers 环境的 API 调用
 */

import type { Photo, PhotosResponse, PhotoStats, PhotoManifest } from '../../../src/types/photo'

export interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
}

export class ApiClient {
  private baseUrl: string
  private timeout: number

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ''
    this.timeout = options.timeout || 10000
  }

  async getPhotos(params: {
    page?: number
    limit?: number
    tag?: string
    search?: string
  } = {}): Promise<PhotosResponse> {
    const searchParams = new URLSearchParams()
    
    if (params.page) searchParams.set('page', params.page.toString())
    if (params.limit) searchParams.set('limit', params.limit.toString())
    if (params.tag) searchParams.set('tag', params.tag)
    if (params.search) searchParams.set('search', params.search)

    const url = `${this.baseUrl}/api/photos?${searchParams.toString()}`
    const response = await this.fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch photos: ${response.statusText}`)
    }
    
    return response.json()
  }

  async getPhoto(photoId: string): Promise<Photo> {
    const url = `${this.baseUrl}/api/photos/${photoId}`
    const response = await this.fetch(url)
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Photo not found')
      }
      throw new Error(`Failed to fetch photo: ${response.statusText}`)
    }
    
    return response.json()
  }

  async getManifest(): Promise<PhotoManifest> {
    const url = `${this.baseUrl}/api/manifest`
    const response = await this.fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`)
    }
    
    return response.json()
  }

  async getStats(): Promise<PhotoStats> {
    const url = `${this.baseUrl}/api/stats`
    const response = await this.fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`)
    }
    
    return response.json()
  }

  async syncPhotos(): Promise<{ message: string }> {
    const url = `${this.baseUrl}/api/sync`
    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to sync photos: ${response.statusText}`)
    }
    
    return response.json()
  }

  private async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers
        }
      })
      
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      
      throw error
    }
  }

  // 图片 URL 辅助方法
  getImageUrl(photo: Photo, size?: 'small' | 'medium' | 'large'): string {
    if (size && photo.thumbnails[size]) {
      return `${this.baseUrl}${photo.thumbnails[size]}`
    }
    return `${this.baseUrl}${photo.url}`
  }

  getThumbnailUrl(imagePath: string, size: string): string {
    return `${this.baseUrl}/thumbnails/${size}/${imagePath}`
  }
}

// 默认客户端实例
export const apiClient = new ApiClient()
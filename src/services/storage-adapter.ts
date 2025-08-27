/**
 * 存储适配器
 * 统一不同存储后端的接口
 */

import type { WorkerContext } from '../lib/context'

export interface StorageObject {
  key: string
  size: number
  lastModified: string
  etag?: string
}

export interface StorageAdapter {
  listObjects(prefix?: string): Promise<StorageObject[]>
  getObject(key: string): Promise<ArrayBuffer | null>
  putObject(key: string, data: ArrayBuffer, metadata?: Record<string, string>): Promise<void>
  deleteObject(key: string): Promise<void>
  objectExists(key: string): Promise<boolean>
}

export class R2StorageAdapter implements StorageAdapter {
  private bucket: R2Bucket

  constructor(bucket: R2Bucket) {
    this.bucket = bucket
  }

  async listObjects(prefix?: string): Promise<StorageObject[]> {
    const options: R2ListOptions = {}
    if (prefix) {
      options.prefix = prefix
    }

    const result = await this.bucket.list(options)
    
    return result.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      lastModified: obj.uploaded.toISOString(),
      etag: obj.etag
    }))
  }

  async getObject(key: string): Promise<ArrayBuffer | null> {
    const object = await this.bucket.get(key)
    if (!object) return null
    
    return await object.arrayBuffer()
  }

  async putObject(
    key: string, 
    data: ArrayBuffer, 
    metadata?: Record<string, string>
  ): Promise<void> {
    const options: R2PutOptions = {}
    
    if (metadata) {
      options.httpMetadata = {}
      if (metadata.contentType) {
        options.httpMetadata.contentType = metadata.contentType
      }
      if (metadata.cacheControl) {
        options.httpMetadata.cacheControl = metadata.cacheControl
      }
    }

    await this.bucket.put(key, data, options)
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key)
  }

  async objectExists(key: string): Promise<boolean> {
    const object = await this.bucket.head(key)
    return object !== null
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private context: WorkerContext
  private bucketName: string
  private region: string
  private endpoint: string
  private accessKeyId: string
  private secretAccessKey: string
  private prefix: string

  constructor(context: WorkerContext) {
    this.context = context
    this.bucketName = context.env.S3_BUCKET_NAME || ''
    this.region = context.env.S3_REGION || 'us-east-1'
    this.endpoint = context.env.S3_ENDPOINT || 'https://s3.amazonaws.com'
    this.accessKeyId = context.env.S3_ACCESS_KEY_ID || ''
    this.secretAccessKey = context.env.S3_SECRET_ACCESS_KEY || ''
    this.prefix = context.env.S3_PREFIX || ''
  }

  async listObjects(prefix?: string): Promise<StorageObject[]> {
    // 在 Workers 环境中实现 S3 API 调用
    // 这里简化实现，实际需要完整的 S3 API 集成
    const fullPrefix = this.prefix + (prefix || '')
    
    try {
      const url = this.buildS3Url('', { 'list-type': '2', prefix: fullPrefix })
      const response = await this.signedFetch(url, 'GET')
      
      if (!response.ok) {
        throw new Error(`S3 list failed: ${response.statusText}`)
      }
      
      // 解析 XML 响应 (简化实现)
      const text = await response.text()
      return this.parseS3ListResponse(text)
    } catch (error) {
      console.error('S3 list objects failed:', error)
      return []
    }
  }

  async getObject(key: string): Promise<ArrayBuffer | null> {
    try {
      const url = this.buildS3Url(this.prefix + key)
      const response = await this.signedFetch(url, 'GET')
      
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`S3 get failed: ${response.statusText}`)
      }
      
      return await response.arrayBuffer()
    } catch (error) {
      console.error('S3 get object failed:', error)
      return null
    }
  }

  async putObject(
    key: string, 
    data: ArrayBuffer, 
    metadata?: Record<string, string>
  ): Promise<void> {
    try {
      const url = this.buildS3Url(this.prefix + key)
      const headers: Record<string, string> = {}
      
      if (metadata?.contentType) {
        headers['Content-Type'] = metadata.contentType
      }
      
      const response = await this.signedFetch(url, 'PUT', data, headers)
      
      if (!response.ok) {
        throw new Error(`S3 put failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('S3 put object failed:', error)
      throw error
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const url = this.buildS3Url(this.prefix + key)
      const response = await this.signedFetch(url, 'DELETE')
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`S3 delete failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('S3 delete object failed:', error)
      throw error
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      const url = this.buildS3Url(this.prefix + key)
      const response = await this.signedFetch(url, 'HEAD')
      return response.ok
    } catch (error) {
      return false
    }
  }

  private buildS3Url(key: string, params?: Record<string, string>): string {
    let url = `${this.endpoint}/${this.bucketName}/${key}`
    
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }
    
    return url
  }

  private async signedFetch(
    url: string, 
    method: string, 
    body?: ArrayBuffer, 
    headers: Record<string, string> = {}
  ): Promise<Response> {
    // 在 Workers 环境中实现 AWS Signature V4
    // 这里简化实现，实际需要完整的签名算法
    
    const requestHeaders = {
      ...headers,
      'Authorization': `AWS ${this.accessKeyId}:${this.secretAccessKey}`,
      'Date': new Date().toUTCString()
    }

    return fetch(url, {
      method,
      headers: requestHeaders,
      body
    })
  }

  private parseS3ListResponse(xml: string): StorageObject[] {
    // 简化的 XML 解析实现
    // 实际应该使用完整的 XML 解析器
    const objects: StorageObject[] = []
    
    // 这里需要实现完整的 S3 XML 响应解析
    // 暂时返回空数组
    
    return objects
  }
}

export function createStorageAdapter(
  context: WorkerContext, 
  type: 'r2' | 's3' = 'r2'
): StorageAdapter {
  switch (type) {
    case 'r2':
      return new R2StorageAdapter(context.env.PHOTOS_BUCKET)
    case 's3':
      return new S3StorageAdapter(context)
    default:
      throw new Error(`Unsupported storage type: ${type}`)
  }
}
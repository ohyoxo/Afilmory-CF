/**
 * 照片服务
 * 处理照片数据的获取、搜索和统计
 */

import type { WorkerContext } from '../lib/context'
import type { Photo, PhotosResponse, PhotoStats } from '../types/photo'
import { ManifestService } from './manifest-service'

export interface GetPhotosOptions {
  page: number
  limit: number
  tag?: string
  search?: string
}

export class PhotoService {
  private context: WorkerContext
  private manifestService: ManifestService

  constructor(context: WorkerContext) {
    this.context = context
    this.manifestService = new ManifestService(context)
  }

  async getPhotos(options: GetPhotosOptions): Promise<PhotosResponse> {
    const manifest = await this.manifestService.getManifest()
    let photos = manifest.photos || []

    // 应用过滤器
    if (options.tag) {
      photos = photos.filter(photo => 
        photo.tags?.some(tag => 
          tag.toLowerCase().includes(options.tag!.toLowerCase())
        )
      )
    }

    if (options.search) {
      const searchTerm = options.search.toLowerCase()
      photos = photos.filter(photo => 
        photo.title?.toLowerCase().includes(searchTerm) ||
        photo.description?.toLowerCase().includes(searchTerm) ||
        photo.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        photo.exif?.camera?.toLowerCase().includes(searchTerm) ||
        photo.exif?.lens?.toLowerCase().includes(searchTerm)
      )
    }

    // 分页
    const total = photos.length
    const startIndex = (options.page - 1) * options.limit
    const endIndex = startIndex + options.limit
    const paginatedPhotos = photos.slice(startIndex, endIndex)

    return {
      photos: paginatedPhotos,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit)
      }
    }
  }

  async getPhoto(photoId: string): Promise<Photo | null> {
    const manifest = await this.manifestService.getManifest()
    return manifest.photos?.find(photo => photo.id === photoId) || null
  }

  async getStats(): Promise<PhotoStats> {
    const manifest = await this.manifestService.getManifest()
    const photos = manifest.photos || []

    // 统计相机使用情况
    const cameraStats: Record<string, number> = {}
    const lensStats: Record<string, number> = {}
    const tagStats: Record<string, number> = {}
    
    let totalSize = 0
    let withGPS = 0

    photos.forEach(photo => {
      if (photo.exif?.camera) {
        cameraStats[photo.exif.camera] = (cameraStats[photo.exif.camera] || 0) + 1
      }
      
      if (photo.exif?.lens) {
        lensStats[photo.exif.lens] = (lensStats[photo.exif.lens] || 0) + 1
      }
      
      photo.tags?.forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1
      })
      
      if (photo.size) {
        totalSize += photo.size
      }
      
      if (photo.exif?.gps) {
        withGPS++
      }
    })

    return {
      totalPhotos: photos.length,
      totalSize,
      withGPS,
      cameras: Object.entries(cameraStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      lenses: Object.entries(lensStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      tags: Object.entries(tagStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([name, count]) => ({ name, count }))
    }
  }
}
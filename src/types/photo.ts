/**
 * 照片相关类型定义
 */

export interface Photo {
  id: string
  path: string
  filename: string
  title?: string
  description?: string
  size: number
  lastModified: string
  dateTaken: string
  exif?: ExifData
  blurhash?: string
  thumbhash?: string
  tags?: string[]
  thumbnails: {
    small: string
    medium: string
    large: string
  }
  url: string
  livePhoto?: {
    video: string
    image: string
  }
}

export interface ExifData {
  camera?: string
  lens?: string
  dateTaken?: string
  settings?: {
    iso?: number
    aperture?: string
    shutterSpeed?: string
    focalLength?: string
  }
  gps?: {
    latitude: number
    longitude: number
    altitude?: number
  }
  dimensions?: {
    width: number
    height: number
  }
  fujifilm?: {
    filmSimulation?: string
    recipe?: string
  }
}

export interface PhotoManifest {
  photos: Photo[]
  lastUpdated: string
  totalCount?: number
  version?: string
}

export interface PhotosResponse {
  photos: Photo[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PhotoStats {
  totalPhotos: number
  totalSize: number
  withGPS: number
  cameras: Array<{ name: string; count: number }>
  lenses: Array<{ name: string; count: number }>
  tags: Array<{ name: string; count: number }>
}
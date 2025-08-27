/**
 * 图片处理工具
 * 在 Cloudflare Workers 环境中进行图片处理
 */

export interface ImageDimensions {
  width: number
  height: number
}

export interface ResizeOptions {
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill'
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

/**
 * 获取图片基本信息
 */
export async function getImageInfo(buffer: ArrayBuffer): Promise<ImageDimensions | null> {
  try {
    // 简单的图片尺寸检测
    const uint8Array = new Uint8Array(buffer)
    
    // JPEG 格式检测
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
      return getJpegDimensions(uint8Array)
    }
    
    // PNG 格式检测
    if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && 
        uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      return getPngDimensions(uint8Array)
    }
    
    // WebP 格式检测
    if (uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && 
        uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
      return getWebpDimensions(uint8Array)
    }
    
    return null
  } catch (error) {
    console.error('Failed to get image info:', error)
    return null
  }
}

/**
 * 获取 JPEG 图片尺寸
 */
function getJpegDimensions(data: Uint8Array): ImageDimensions | null {
  let offset = 2
  
  while (offset < data.length) {
    if (data[offset] !== 0xFF) break
    
    const marker = data[offset + 1]
    
    // SOF0, SOF1, SOF2 markers
    if (marker >= 0xC0 && marker <= 0xC2) {
      const height = (data[offset + 5] << 8) | data[offset + 6]
      const width = (data[offset + 7] << 8) | data[offset + 8]
      return { width, height }
    }
    
    // Skip to next marker
    const length = (data[offset + 2] << 8) | data[offset + 3]
    offset += 2 + length
  }
  
  return null
}

/**
 * 获取 PNG 图片尺寸
 */
function getPngDimensions(data: Uint8Array): ImageDimensions | null {
  try {
    const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19]
    const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23]
    return { width, height }
  } catch {
    return null
  }
}

/**
 * 获取 WebP 图片尺寸
 */
function getWebpDimensions(data: Uint8Array): ImageDimensions | null {
  try {
    // VP8 format
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38) {
      const width = ((data[26] | (data[27] << 8)) & 0x3fff) + 1
      const height = ((data[28] | (data[29] << 8)) & 0x3fff) + 1
      return { width, height }
    }
    
    // VP8L format
    if (data[12] === 0x56 && data[13] === 0x50 && data[14] === 0x38 && data[15] === 0x4C) {
      const bits = (data[21] << 16) | (data[22] << 8) | data[23]
      const width = (bits & 0x3FFF) + 1
      const height = ((bits >> 14) & 0x3FFF) + 1
      return { width, height }
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * 计算缩略图尺寸
 */
export function calculateThumbnailSize(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  fit: 'cover' | 'contain' | 'fill' = 'cover'
): ImageDimensions {
  if (!targetWidth && !targetHeight) {
    return { width: originalWidth, height: originalHeight }
  }
  
  if (fit === 'fill') {
    return {
      width: targetWidth || originalWidth,
      height: targetHeight || originalHeight
    }
  }
  
  const aspectRatio = originalWidth / originalHeight
  
  if (!targetHeight) {
    return {
      width: targetWidth!,
      height: Math.round(targetWidth! / aspectRatio)
    }
  }
  
  if (!targetWidth) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight
    }
  }
  
  const targetAspectRatio = targetWidth / targetHeight
  
  if (fit === 'contain') {
    if (aspectRatio > targetAspectRatio) {
      return {
        width: targetWidth,
        height: Math.round(targetWidth / aspectRatio)
      }
    } else {
      return {
        width: Math.round(targetHeight * aspectRatio),
        height: targetHeight
      }
    }
  } else { // cover
    if (aspectRatio > targetAspectRatio) {
      return {
        width: Math.round(targetHeight * aspectRatio),
        height: targetHeight
      }
    } else {
      return {
        width: targetWidth,
        height: Math.round(targetWidth / aspectRatio)
      }
    }
  }
}

/**
 * 生成简单的 Blurhash (占位符实现)
 */
export function generateSimpleBlurhash(buffer: ArrayBuffer): string {
  // 这是一个简化的实现，返回一个基于文件内容的固定 blurhash
  // 实际实现需要图片解码和颜色分析
  
  const hash = Array.from(new Uint8Array(buffer.slice(0, 32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
  
  // 生成一个基于内容的 blurhash 格式字符串
  const colors = ['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'
  
  let blurhash = colors[parseInt(hash[0], 16) % colors.length]
  
  for (let i = 1; i < 32; i++) {
    const charIndex = parseInt(hash[i % 16], 16) * 4 + (i % 4)
    blurhash += chars[charIndex % chars.length]
  }
  
  return blurhash.slice(0, 32)
}

/**
 * 检测图片格式
 */
export function detectImageFormat(buffer: ArrayBuffer): string | null {
  const uint8Array = new Uint8Array(buffer)
  
  // JPEG
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
    return 'jpeg'
  }
  
  // PNG
  if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && 
      uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
    return 'png'
  }
  
  // WebP
  if (uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && 
      uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
    return 'webp'
  }
  
  // GIF
  if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
    return 'gif'
  }
  
  // BMP
  if (uint8Array[0] === 0x42 && uint8Array[1] === 0x4D) {
    return 'bmp'
  }
  
  // TIFF
  if ((uint8Array[0] === 0x49 && uint8Array[1] === 0x49) ||
      (uint8Array[0] === 0x4D && uint8Array[1] === 0x4D)) {
    return 'tiff'
  }
  
  // HEIC/HEIF
  if (uint8Array[4] === 0x66 && uint8Array[5] === 0x74 && uint8Array[6] === 0x79 && uint8Array[7] === 0x70) {
    const brand = String.fromCharCode(...uint8Array.slice(8, 12))
    if (brand === 'heic' || brand === 'heix' || brand === 'hevc' || brand === 'hevx') {
      return 'heic'
    }
  }
  
  return null
}

/**
 * 检查是否为支持的图片格式
 */
export function isSupportedImageFormat(filename: string): boolean {
  const supportedFormats = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
    '.heic', '.heif', '.tiff', '.tif'
  ]
  
  const ext = filename.toLowerCase().split('.').pop()
  return supportedFormats.includes(`.${ext}`)
}
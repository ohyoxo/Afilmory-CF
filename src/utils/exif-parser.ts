/**
 * EXIF 数据解析器
 * 在 Cloudflare Workers 环境中解析图片 EXIF 信息
 */

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

/**
 * 解析 EXIF 数据
 */
export async function parseExifData(buffer: ArrayBuffer): Promise<ExifData | null> {
  try {
    const uint8Array = new Uint8Array(buffer)
    
    // 检查是否为 JPEG 格式
    if (uint8Array[0] !== 0xFF || uint8Array[1] !== 0xD8) {
      return null
    }
    
    // 查找 EXIF 段
    const exifData = findExifSegment(uint8Array)
    if (!exifData) {
      return null
    }
    
    // 解析 EXIF 数据
    return parseExifSegment(exifData)
  } catch (error) {
    console.error('Failed to parse EXIF data:', error)
    return null
  }
}

/**
 * 查找 EXIF 段
 */
function findExifSegment(data: Uint8Array): Uint8Array | null {
  let offset = 2 // 跳过 JPEG SOI
  
  while (offset < data.length - 1) {
    if (data[offset] !== 0xFF) break
    
    const marker = data[offset + 1]
    
    // APP1 段 (通常包含 EXIF)
    if (marker === 0xE1) {
      const length = (data[offset + 2] << 8) | data[offset + 3]
      const segmentData = data.slice(offset + 4, offset + 2 + length)
      
      // 检查 EXIF 标识
      if (segmentData[0] === 0x45 && segmentData[1] === 0x78 && 
          segmentData[2] === 0x69 && segmentData[3] === 0x66) {
        return segmentData.slice(6) // 跳过 "Exif\0\0"
      }
    }
    
    // 跳到下一个段
    if (marker === 0xD9) break // EOI
    const length = (data[offset + 2] << 8) | data[offset + 3]
    offset += 2 + length
  }
  
  return null
}

/**
 * 解析 EXIF 段
 */
function parseExifSegment(data: Uint8Array): ExifData | null {
  try {
    // 检查字节序
    const isLittleEndian = data[0] === 0x49 && data[1] === 0x49
    
    // 读取 IFD 偏移
    const ifdOffset = readUint32(data, 4, isLittleEndian)
    
    // 解析主 IFD
    const exifData: ExifData = {}
    parseIFD(data, ifdOffset, isLittleEndian, exifData)
    
    return exifData
  } catch (error) {
    console.error('Failed to parse EXIF segment:', error)
    return null
  }
}

/**
 * 解析 IFD (Image File Directory)
 */
function parseIFD(data: Uint8Array, offset: number, isLittleEndian: boolean, exifData: ExifData): void {
  const entryCount = readUint16(data, offset, isLittleEndian)
  let entryOffset = offset + 2
  
  for (let i = 0; i < entryCount; i++) {
    const tag = readUint16(data, entryOffset, isLittleEndian)
    const type = readUint16(data, entryOffset + 2, isLittleEndian)
    const count = readUint32(data, entryOffset + 4, isLittleEndian)
    const valueOffset = readUint32(data, entryOffset + 8, isLittleEndian)
    
    parseExifTag(data, tag, type, count, valueOffset, isLittleEndian, exifData)
    
    entryOffset += 12
  }
  
  // 检查是否有下一个 IFD
  const nextIfdOffset = readUint32(data, entryOffset, isLittleEndian)
  if (nextIfdOffset !== 0) {
    parseIFD(data, nextIfdOffset, isLittleEndian, exifData)
  }
}

/**
 * 解析 EXIF 标签
 */
function parseExifTag(
  data: Uint8Array,
  tag: number,
  type: number,
  count: number,
  valueOffset: number,
  isLittleEndian: boolean,
  exifData: ExifData
): void {
  try {
    switch (tag) {
      case 0x010F: // Make (相机制造商)
        exifData.camera = readString(data, valueOffset, count)
        break
        
      case 0x0110: // Model (相机型号)
        const model = readString(data, valueOffset, count)
        if (exifData.camera) {
          exifData.camera += ' ' + model
        } else {
          exifData.camera = model
        }
        break
        
      case 0x0132: // DateTime (拍摄时间)
        exifData.dateTaken = readString(data, valueOffset, count)
        break
        
      case 0x0100: // ImageWidth
        if (!exifData.dimensions) exifData.dimensions = { width: 0, height: 0 }
        exifData.dimensions.width = readUint32(data, valueOffset, isLittleEndian)
        break
        
      case 0x0101: // ImageHeight
        if (!exifData.dimensions) exifData.dimensions = { width: 0, height: 0 }
        exifData.dimensions.height = readUint32(data, valueOffset, isLittleEndian)
        break
        
      case 0x8769: // ExifIFD (EXIF 子 IFD)
        parseExifSubIFD(data, valueOffset, isLittleEndian, exifData)
        break
        
      case 0x8825: // GPSIFD (GPS 子 IFD)
        parseGpsIFD(data, valueOffset, isLittleEndian, exifData)
        break
    }
  } catch (error) {
    // 忽略单个标签解析错误
  }
}

/**
 * 解析 EXIF 子 IFD
 */
function parseExifSubIFD(data: Uint8Array, offset: number, isLittleEndian: boolean, exifData: ExifData): void {
  const entryCount = readUint16(data, offset, isLittleEndian)
  let entryOffset = offset + 2
  
  for (let i = 0; i < entryCount; i++) {
    const tag = readUint16(data, entryOffset, isLittleEndian)
    const type = readUint16(data, entryOffset + 2, isLittleEndian)
    const count = readUint32(data, entryOffset + 4, isLittleEndian)
    const valueOffset = readUint32(data, entryOffset + 8, isLittleEndian)
    
    if (!exifData.settings) exifData.settings = {}
    
    switch (tag) {
      case 0x8827: // ISO
        exifData.settings.iso = readUint16(data, valueOffset, isLittleEndian)
        break
        
      case 0x829D: // F-Number (光圈)
        const aperture = readRational(data, valueOffset, isLittleEndian)
        exifData.settings.aperture = `f/${aperture.toFixed(1)}`
        break
        
      case 0x829A: // ExposureTime (快门速度)
        const exposureTime = readRational(data, valueOffset, isLittleEndian)
        if (exposureTime < 1) {
          exifData.settings.shutterSpeed = `1/${Math.round(1 / exposureTime)}`
        } else {
          exifData.settings.shutterSpeed = `${exposureTime}s`
        }
        break
        
      case 0x920A: // FocalLength (焦距)
        const focalLength = readRational(data, valueOffset, isLittleEndian)
        exifData.settings.focalLength = `${focalLength.toFixed(0)}mm`
        break
        
      case 0xA405: // FocalLengthIn35mmFilm
        const focalLength35 = readUint16(data, valueOffset, isLittleEndian)
        if (focalLength35) {
          exifData.settings.focalLength = `${focalLength35}mm`
        }
        break
    }
    
    entryOffset += 12
  }
}

/**
 * 解析 GPS IFD
 */
function parseGpsIFD(data: Uint8Array, offset: number, isLittleEndian: boolean, exifData: ExifData): void {
  const entryCount = readUint16(data, offset, isLittleEndian)
  let entryOffset = offset + 2
  
  const gpsData: any = {}
  
  for (let i = 0; i < entryCount; i++) {
    const tag = readUint16(data, entryOffset, isLittleEndian)
    const type = readUint16(data, entryOffset + 2, isLittleEndian)
    const count = readUint32(data, entryOffset + 4, isLittleEndian)
    const valueOffset = readUint32(data, entryOffset + 8, isLittleEndian)
    
    switch (tag) {
      case 0x0001: // GPSLatitudeRef
        gpsData.latRef = readString(data, valueOffset, count)
        break
        
      case 0x0002: // GPSLatitude
        gpsData.lat = readGpsCoordinate(data, valueOffset, isLittleEndian)
        break
        
      case 0x0003: // GPSLongitudeRef
        gpsData.lonRef = readString(data, valueOffset, count)
        break
        
      case 0x0004: // GPSLongitude
        gpsData.lon = readGpsCoordinate(data, valueOffset, isLittleEndian)
        break
        
      case 0x0006: // GPSAltitude
        gpsData.alt = readRational(data, valueOffset, isLittleEndian)
        break
    }
    
    entryOffset += 12
  }
  
  // 转换 GPS 坐标
  if (gpsData.lat && gpsData.lon) {
    exifData.gps = {
      latitude: gpsData.latRef === 'S' ? -gpsData.lat : gpsData.lat,
      longitude: gpsData.lonRef === 'W' ? -gpsData.lon : gpsData.lon
    }
    
    if (gpsData.alt) {
      exifData.gps.altitude = gpsData.alt
    }
  }
}

/**
 * 读取 GPS 坐标
 */
function readGpsCoordinate(data: Uint8Array, offset: number, isLittleEndian: boolean): number {
  const degrees = readRational(data, offset, isLittleEndian)
  const minutes = readRational(data, offset + 8, isLittleEndian)
  const seconds = readRational(data, offset + 16, isLittleEndian)
  
  return degrees + minutes / 60 + seconds / 3600
}

/**
 * 读取有理数
 */
function readRational(data: Uint8Array, offset: number, isLittleEndian: boolean): number {
  const numerator = readUint32(data, offset, isLittleEndian)
  const denominator = readUint32(data, offset + 4, isLittleEndian)
  
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * 读取字符串
 */
function readString(data: Uint8Array, offset: number, length: number): string {
  const bytes = data.slice(offset, offset + length)
  return new TextDecoder().decode(bytes).replace(/\0/g, '')
}

/**
 * 读取 16 位无符号整数
 */
function readUint16(data: Uint8Array, offset: number, isLittleEndian: boolean): number {
  if (isLittleEndian) {
    return data[offset] | (data[offset + 1] << 8)
  } else {
    return (data[offset] << 8) | data[offset + 1]
  }
}

/**
 * 读取 32 位无符号整数
 */
function readUint32(data: Uint8Array, offset: number, isLittleEndian: boolean): number {
  if (isLittleEndian) {
    return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
  } else {
    return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]
  }
}
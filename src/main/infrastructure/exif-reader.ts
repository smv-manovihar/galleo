import fs from 'fs/promises';
import ExifReader from 'exifreader';
import sharp from 'sharp';
import { type Result, ok } from '../../shared/types/results';

export interface ExtractedMetadata {
  dateOriginal?: string | null; // EXIF format
  width?: number | null;
  height?: number | null;
}

/**
 * Extracts EXIF tags from a file path using a high-performance partial read (first 128KB).
 */
export async function readExifMetadata(filePath: string): Promise<Result<ExtractedMetadata>> {
  let fileHandle: fs.FileHandle | null = null;
  try {
    fileHandle = await fs.open(filePath, 'r');
    
    // Read the first 128KB which contains the EXIF header.
    const bufferSize = 131072; // 128KB
    const buffer = Buffer.alloc(bufferSize);
    const { bytesRead } = await fileHandle.read(buffer, 0, bufferSize, 0);
    const slicedBuffer = buffer.subarray(0, bytesRead);
    
    // Parse using ExifReader with expanded: true to get nested tags cleanly
    const tags = ExifReader.load(slicedBuffer, { expanded: true }) as any;
    
    let dateOriginal: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    
    // Extract Date Original
    if (tags.exif?.DateTimeOriginal) {
      dateOriginal = tags.exif.DateTimeOriginal.description;
    } else if (tags.exif?.CreateDate) {
      dateOriginal = tags.exif.CreateDate.description;
    } else if (tags.image?.DateTime) {
      dateOriginal = tags.image.DateTime.description;
    }
    
    // Tier 1: EXIF pixel dimensions (JPEG/TIFF with full EXIF)
    if (tags.exif?.PixelXDimension) width = Number(tags.exif.PixelXDimension.value);
    if (tags.exif?.PixelYDimension) height = Number(tags.exif.PixelYDimension.value);
    
    // Tier 2: File structure tags (some JPEG, TIFF without full EXIF)
    if (!width && tags.file?.['Image Width']) width = Number(tags.file['Image Width'].value);
    if (!height && tags.file?.['Image Height']) height = Number(tags.file['Image Height'].value);

    // Tier 3: sharp reads the raw image header — covers PNG, WebP, GIF, BMP, AVIF, HEIC, etc.
    if (!width || !height) {
      try {
        const meta = await sharp(filePath).metadata();
        if (!width && meta.width && meta.width > 0) width = meta.width;
        if (!height && meta.height && meta.height > 0) height = meta.height;
      } catch {
        // sharp failed too — leave as null
      }
    }

    return ok({ dateOriginal, width, height });
  } catch {
    // If exif parsing fails entirely, return clean defaults so the scan pipeline continues.
    return ok({ dateOriginal: null, width: null, height: null });
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

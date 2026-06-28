import { readExifMetadata } from '../infrastructure/exif-reader';
import { readVideoMetadata } from '../infrastructure/video-processor';
import { getFileSyncStats } from '../infrastructure/file-system';
import { resolveTargetDate } from '../core/date-inference';
import { type Result, fail, ok } from '../../shared/types/results';
import type { MediaItem, MediaType } from '../../shared/types/media';

export interface ScanFileData {
  id: string;
  path: string;
  name: string;
  size: number;
  extension: string;
  mediaType: MediaType;
}

export class MetadataService {
  /**
   * Reads metadata (EXIF/video header, file stats) and resolves target dates.
   */
  public async extractMetadata(fileData: ScanFileData): Promise<Result<Partial<MediaItem>>> {
    try {
      const statsResult = getFileSyncStats(fileData.path);
      if (statsResult.ok === false) {
        return fail(statsResult.error);
      }
      
      const stats = statsResult.data;
      let dateOriginal: string | null = null;
      let width: number | null = null;
      let height: number | null = null;
      
      if (fileData.mediaType === 'photo') {
        const exifRes = await readExifMetadata(fileData.path);
        if (exifRes.ok) {
          dateOriginal = exifRes.data.dateOriginal ?? null;
          width = exifRes.data.width ?? null;
          height = exifRes.data.height ?? null;
        }
      } else {
        const videoRes = await readVideoMetadata(fileData.path);
        if (videoRes.ok) {
          width = videoRes.data.width;
          height = videoRes.data.height;
        }
      }

      // Resolve Target Date using fallback chain
      const dateRes = resolveTargetDate({
        exifDateOriginal: dateOriginal,
        filename: fileData.name,
        fsBirthTime: stats.birthtime,
        fsMTime: stats.mtime
      });

      return ok({
        width: width ?? undefined,
        height: height ?? undefined,
        dateOriginal: dateOriginal ?? undefined,
        dateFileSystem: stats.birthtime, // birthtime represents creation
        dateTarget: dateRes.targetDate,
        dateTargetSource: dateRes.source
      });
    } catch (e: any) {
      return fail({
        code: 'UNKNOWN',
        message: e.message || 'Metadata extraction failed'
      });
    }
  }
}

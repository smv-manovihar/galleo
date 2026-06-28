import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { existsSync } from 'fs';
import { type Result, fail, ok } from '../../shared/types/results';
import { getThumbnailCacheDir } from './image-processor';

// Set static path for ffmpeg
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Extracts a thumbnail frame from a video file at the 1-second mark and saves it to cache.
 */
export function generateVideoThumbnail(
  videoPath: string,
  mediaId: string
): Promise<Result<string>> {
  return new Promise((resolve) => {
    try {
      const cacheDir = getThumbnailCacheDir();
      const outputFilename = `${mediaId}_v2.webp`;
      const outputPath = path.join(cacheDir, outputFilename);

      // Check if thumbnail is already cached
      if (existsSync(outputPath)) {
        return resolve(ok(outputPath));
      }

      ffmpeg(videoPath)
        .on('end', () => {
          resolve(ok(outputPath));
        })
        .on('error', (err) => {
          resolve(
            fail({
              code: 'THUMBNAIL_FAILED',
              path: videoPath,
              reason: err.message || 'ffmpeg extraction failed'
            })
          );
        })
        .screenshots({
          count: 1,
          timestamps: [1], // extract frame at 1s
          filename: outputFilename,
          folder: cacheDir,
          size: '1080x?' // resize keeping aspect ratio (high quality)
        });
    } catch (e: any) {
      resolve(
        fail({
          code: 'THUMBNAIL_FAILED',
          path: videoPath,
          reason: e.message || 'Video frame extraction failed'
        })
      );
    }
  });
}

/**
 * Extracts metadata for a video file (duration, dimensions).
 */
export function readVideoMetadata(
  videoPath: string
): Promise<Result<{ duration: number; width: number | null; height: number | null }>> {
  return new Promise((resolve) => {
    try {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err || !metadata || !metadata.streams) {
          return resolve(
            ok({
              duration: 0,
              width: null,
              height: null
            })
          );
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video'
        );
        const duration = metadata.format?.duration || 0;

        // Tier 1: primary display dimensions
        let width: number | null = (videoStream?.width && videoStream.width > 0) ? Number(videoStream.width) : null;
        let height: number | null = (videoStream?.height && videoStream.height > 0) ? Number(videoStream.height) : null;

        // Tier 2: coded dimensions (some codecs report 0 on width/height but not coded_*)
        if (!width && videoStream?.coded_width && Number(videoStream.coded_width) > 0) {
          width = Number(videoStream.coded_width);
        }
        if (!height && videoStream?.coded_height && Number(videoStream.coded_height) > 0) {
          height = Number(videoStream.coded_height);
        }

        // Tier 3: derive from display_aspect_ratio if one dimension is still missing
        if (videoStream?.display_aspect_ratio && (width || height)) {
          const ratio = videoStream.display_aspect_ratio as string;
          const parts = ratio.split(':').map(Number);
          if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
            if (width && !height) height = Math.round(width * parts[1] / parts[0]);
            if (height && !width) width = Math.round(height * parts[0] / parts[1]);
          }
        }

        resolve(
          ok({
            duration: Number(duration),
            width,
            height
          })
        );
      });
    } catch {
      // Return defaults on error so scan pipeline doesn't crash
      resolve(
        ok({
          duration: 0,
          width: null,
          height: null
        })
      );
    }
  });
}

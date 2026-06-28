import type { QualityMetrics } from '../../shared/types/media';

interface ScoreParams {
  blurScore: number;       // 0 - 100 (where 0 is completely blurry, 100 is maximum sharpness)
  brightness: number;      // 0 - 255 (average pixel brightness)
  width?: number;
  height?: number;
  size: number;            // bytes
  filename: string;
  thresholds: {
    blurThreshold: number;
    darknessThreshold: number;
    screenshotDetection: boolean;
    minResolution: number;
  };
}

/**
 * Checks if a filename is indicative of a screenshot.
 */
export function isScreenshotByName(filename: string): boolean {
  const name = filename.toLowerCase();
  return (
    name.includes('screenshot') ||
    name.includes('screen_shot') ||
    name.includes('capture') ||
    name.startsWith('ss_')
  );
}

/**
 * Computes QualityMetrics including checks for blur, dark, screenshot, and size.
 * Aggregates these signals into a final composite quality score (0 - 100).
 */
export function evaluateQuality(params: ScoreParams): QualityMetrics {
  const { blurScore, brightness, width, height, size, filename, thresholds } = params;

  const isBlurry = blurScore < thresholds.blurThreshold;
  const isDark = brightness < thresholds.darknessThreshold;
  
  const isScreenshot = thresholds.screenshotDetection && isScreenshotByName(filename);
  
  const resolution = (width && height) ? width * height : null;
  const isSmall = 
    (resolution !== null && resolution < thresholds.minResolution) || 
    size < 10240; // less than 10KB is also flagged as small

  // Calculate composite quality score (0 - 100)
  // We start at 100 and penalize based on various defect markers
  let compositeScore = 100;

  if (isBlurry) {
    // Blurriness penalty is scaled by how far below the threshold it is
    const severityFactor = (thresholds.blurThreshold - blurScore) / thresholds.blurThreshold;
    const penalty = 20 + Math.round(severityFactor * 35); // 20 - 55 penalty
    compositeScore -= penalty;
  } else {
    // Slight penalty if it's near the blur threshold, reward extreme sharpness
    // score 30-100. If blurScore is 100, no penalty. If it's near 30, tiny penalty.
    const margin = blurScore - thresholds.blurThreshold;
    if (margin < 20) {
      compositeScore -= Math.round((20 - margin) * 0.5); // 0 - 10 penalty
    }
  }

  if (isDark) {
    // Darkness penalty: how far below threshold (0 to darknessThreshold)
    const severityFactor = (thresholds.darknessThreshold - brightness) / thresholds.darknessThreshold;
    const penalty = 15 + Math.round(severityFactor * 20); // 15 - 35 penalty
    compositeScore -= penalty;
  }

  if (isSmall) {
    compositeScore -= 20;
  }

  if (isScreenshot) {
    // Screenshots are usually not "bad quality" but are highly likely to be clutter,
    // so we apply a slight penalty to rank them lower in keep-order.
    compositeScore -= 15;
  }

  // Ensure score is bounded between 0 and 100
  compositeScore = Math.max(0, Math.min(100, compositeScore));

  return {
    blurScore,
    brightness,
    isDark,
    isBlurry,
    isScreenshot,
    isSmall,
    compositeScore,
  };
}

import sharp, { Sharp } from "sharp";
import type { LoadedImage } from "./loader";

export interface PreparedImage {
  /** Float32Array of shape [height × width × 3], values in [0, 1] */
  data: Float32Array;
  width: number;
  height: number;
  /** Original (pre-resize) buffer, used for cropping during OCR */
  originalBuffer: Buffer;
  originalWidth: number;
  originalHeight: number;
  /** Scale factor applied: originalWidth / width */
  scaleX: number;
  /** Scale factor applied: originalHeight / height */
  scaleY: number;
}

/**
 * Resize the image so its longer side is at most maxDim pixels,
 * preserving aspect ratio.
 */
function resizeIfNeeded(image: Sharp, width: number, height: number, maxDim: number): Sharp {
  if (width <= maxDim && height <= maxDim) return image;
  if (width >= height) {
    return image.resize(maxDim, null, { fit: "inside", withoutEnlargement: true });
  }
  return image.resize(null, maxDim, { fit: "inside", withoutEnlargement: true });
}

/**
 * Apply CLAHE contrast enhancement with gentle sharpening.
 * CLAHE preserves local contrast within each section tile while
 * suppressing the global color dominance of colored venue maps.
 * Tile size 256x256 matches ~1/8 of max image dimension (2048),
 * roughly the size of an individual seating section.
 */
function enhanceContrast(image: Sharp): Sharp {
  return image
    .clahe({ width: 256, height: 256, maxSlope: 2 })
    .sharpen({ sigma: 0.3, m1: 0, m2: 2 });
}

/**
 * Preprocess a loaded venue map image for the detection pipeline:
 *   1. Resize so longer dimension ≤ maxDim
 *   2. Convert to RGB (strip alpha if present)
 *   3. Enhance contrast (histogram normalisation)
 *   4. Return Float32Array pixel data in [0, 1] + metadata
 */
export async function prepareImage(
  loaded: LoadedImage,
  maxDim: number = 2048
): Promise<PreparedImage> {
  const { buffer, width: origW, height: origH } = loaded;

  let pipeline = sharp(buffer).removeAlpha().toColorspace("srgb");
  pipeline = enhanceContrast(pipeline);
  pipeline = resizeIfNeeded(pipeline, origW, origH, maxDim);

  const { data: rawData, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  if (channels !== 3) {
    throw new Error(`Expected 3 channels after preprocessing, got ${channels}`);
  }

  // Normalise uint8 [0, 255] → float32 [0, 1]
  const float32 = new Float32Array(width * height * 3);
  for (let i = 0; i < rawData.length; i++) {
    float32[i] = rawData[i] / 255.0;
  }

  return {
    data: float32,
    width,
    height,
    originalBuffer: buffer,
    originalWidth: origW,
    originalHeight: origH,
    scaleX: origW / width,
    scaleY: origH / height,
  };
}

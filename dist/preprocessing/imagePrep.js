"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareImage = prepareImage;
const sharp_1 = __importDefault(require("sharp"));
/**
 * Resize the image so its longer side is at most maxDim pixels,
 * preserving aspect ratio.
 */
function resizeIfNeeded(image, width, height, maxDim) {
    if (width <= maxDim && height <= maxDim)
        return image;
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
function enhanceContrast(image) {
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
async function prepareImage(loaded, maxDim = 2048) {
    const { buffer, width: origW, height: origH } = loaded;
    let pipeline = (0, sharp_1.default)(buffer).removeAlpha().toColorspace("srgb");
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
//# sourceMappingURL=imagePrep.js.map
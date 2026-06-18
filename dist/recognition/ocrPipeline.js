"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOcrPipeline = runOcrPipeline;
const sharp_1 = __importDefault(require("sharp"));
/**
 * Crop a region from the original (pre-resize) image buffer,
 * accounting for the scale difference between the processed image
 * (where bounding boxes were detected) and the original.
 *
 * The crop is preprocessed for OCR: greyscale → CLAHE → sharpen →
 * contrast boost → Otsu binarization → conditional negate.
 */
async function cropRegion(prepared, region) {
    const { originalBuffer, originalWidth, originalHeight, scaleX, scaleY } = prepared;
    const { bbox } = region;
    // Convert normalised coords → pixel coords in the original image
    const left = Math.floor(bbox.x1 * prepared.width * scaleX);
    const top = Math.floor(bbox.y1 * prepared.height * scaleY);
    const right = Math.ceil(bbox.x2 * prepared.width * scaleX);
    const bottom = Math.ceil(bbox.y2 * prepared.height * scaleY);
    const cropWidth = Math.max(1, Math.min(right - left, originalWidth - left));
    const cropHeight = Math.max(1, Math.min(bottom - top, originalHeight - top));
    // Step 1: extract raw crop for luminance analysis
    const rawCrop = await (0, sharp_1.default)(originalBuffer)
        .extract({
        left: Math.max(0, left),
        top: Math.max(0, top),
        width: cropWidth,
        height: cropHeight,
    })
        .png()
        .toBuffer();
    // Step 2: determine background luminance to decide negate direction
    const stats = await (0, sharp_1.default)(rawCrop).greyscale().stats();
    const darkBackground = stats.channels[0].mean < 128;
    // Step 3: build processing pipeline on the raw crop
    let pipeline = (0, sharp_1.default)(rawCrop);
    // Rotate the crop to correct for text angle if significant
    if (Math.abs(bbox.angle) > 1) {
        pipeline = pipeline.rotate(-bbox.angle, { background: { r: 255, g: 255, b: 255 } });
    }
    // Scale up small crops — Tesseract struggles with very small text
    const MIN_HEIGHT = 32;
    if (cropHeight < MIN_HEIGHT) {
        const scaleFactor = MIN_HEIGHT / cropHeight;
        pipeline = pipeline.resize(Math.round(cropWidth * scaleFactor), MIN_HEIGHT, { fit: "fill" });
    }
    // Step 4: OCR preprocessing — strip color, enhance contrast, binarize
    pipeline = pipeline
        .greyscale()
        .clahe({ width: 16, height: 16, maxSlope: 3 })
        .sharpen({ sigma: 0.5, m1: 0, m2: 3, x1: 2, y2: 10, y3: 20 })
        .linear(1.3, -15)
        .threshold(0); // Otsu auto-threshold binarization
    // Ensure black text on white background (Tesseract's preferred polarity)
    if (darkBackground) {
        pipeline = pipeline.negate();
    }
    return pipeline.png().toBuffer();
}
/**
 * Run OCR on all detected regions and populate recognizedText +
 * recognitionConfidence on each DetectedRegion in-place.
 *
 * Regions that produce empty text are kept (with confidence 0) so the
 * downstream pipeline can decide whether to drop or flag them.
 */
async function runOcrPipeline(prepared, regions, recognizer, onProgress) {
    for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        try {
            const cropBuffer = await cropRegion(prepared, region);
            region.rawCrop = cropBuffer;
            const { text, confidence } = await recognizer.recognize(cropBuffer);
            region.recognizedText = text;
            region.recognitionConfidence = confidence;
        }
        catch (err) {
            // Log but don't abort — mark region as unrecognised
            region.recognizedText = "";
            region.recognitionConfidence = 0;
        }
        if (onProgress)
            onProgress(i + 1, regions.length);
    }
    return regions;
}
//# sourceMappingURL=ocrPipeline.js.map
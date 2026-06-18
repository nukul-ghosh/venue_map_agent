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
 * Preprocess a loaded venue map image for the detection pipeline:
 *   1. Resize so longer dimension ≤ maxDim
 *   2. Convert to RGB (strip alpha if present)
 *   3. Enhance contrast (histogram normalisation)
 *   4. Return Float32Array pixel data in [0, 1] + metadata
 */
export declare function prepareImage(loaded: LoadedImage, maxDim?: number): Promise<PreparedImage>;
//# sourceMappingURL=imagePrep.d.ts.map
/**
 * A bounding box in normalised coordinates [0, 1] relative to the
 * preprocessed image dimensions.  angle is the rotation in degrees
 * (EAST produces rotated bounding boxes for skewed text).
 */
export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    /** Rotation angle in degrees (0 = upright) */
    angle: number;
}
/**
 * A single text region returned by the detector.
 * recognizedText and recognitionConfidence are populated later by the OCR
 * pipeline; they are empty/zero at detection time.
 */
export interface DetectedRegion {
    bbox: BoundingBox;
    detectionScore: number;
    /** Raw pixel crop (populated by ocrPipeline before recognition) */
    rawCrop?: Buffer;
    recognizedText: string;
    recognitionConfidence: number;
}
/** Centroid of a bounding box in normalised coordinates */
export declare function centroid(bbox: BoundingBox): [number, number];
//# sourceMappingURL=regionModels.d.ts.map
import type { PreparedImage } from "../preprocessing/imagePrep";
import type { DetectedRegion } from "../detection/regionModels";
import { TextRecognizer } from "./textRecognizer";
/**
 * Run OCR on all detected regions and populate recognizedText +
 * recognitionConfidence on each DetectedRegion in-place.
 *
 * Regions that produce empty text are kept (with confidence 0) so the
 * downstream pipeline can decide whether to drop or flag them.
 */
export declare function runOcrPipeline(prepared: PreparedImage, regions: DetectedRegion[], recognizer: TextRecognizer, onProgress?: (done: number, total: number) => void): Promise<DetectedRegion[]>;
//# sourceMappingURL=ocrPipeline.d.ts.map
import type { PreparedImage } from "../preprocessing/imagePrep";
import type { DetectedRegion } from "./regionModels";
/**
 * Wraps a TF.js EAST text-detection model.
 *
 * The EAST model must be available in TF.js GraphModel format under
 * `modelDir/model.json`.  Convert from a SavedModel once using:
 *   tensorflowjs_converter --input_format=tf_saved_model \
 *     ./east_saved_model ./models/east
 *
 * If the model directory does not exist the detector falls back to a
 * heuristic grid-split mode that treats the whole image as a single
 * region (useful for development without a trained model).
 */
export declare class TextRegionDetector {
    private model;
    private readonly modelDir;
    private readonly detectionThreshold;
    private useFallback;
    constructor(modelDir: string, detectionThreshold?: number);
    load(): Promise<void>;
    /**
     * Detect text regions in a preprocessed image.
     * Returns an array of DetectedRegion sorted by detection score descending.
     */
    detect(prepared: PreparedImage): Promise<DetectedRegion[]>;
    private eastDetect;
    /**
     * Fallback: divide the image into a 12x12 grid and score each cell
     * by its greyscale standard deviation (a proxy for text presence).
     * Cells with low variance (uniform color blocks) are filtered out.
     */
    private fallbackDetect;
    /**
     * Estimate whether a grid cell contains text by measuring greyscale
     * standard deviation. High stdev = edges/contrast = likely text.
     */
    private estimateCellTextScore;
    dispose(): void;
}
//# sourceMappingURL=textRegionDetector.d.ts.map
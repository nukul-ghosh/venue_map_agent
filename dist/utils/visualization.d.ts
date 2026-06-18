import type { DetectedRegion } from "../detection/regionModels";
import type { PreparedImage } from "../preprocessing/imagePrep";
/**
 * Draw bounding boxes onto the original image and save as a debug PNG.
 * Each box is coloured by detection score (green = high, red = low).
 */
export declare function saveDebugImage(prepared: PreparedImage, regions: DetectedRegion[], outputDir: string, stem: string): Promise<string>;
//# sourceMappingURL=visualization.d.ts.map
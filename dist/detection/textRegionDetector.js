"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextRegionDetector = void 0;
const tf = __importStar(require("@tensorflow/tfjs-node"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
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
class TextRegionDetector {
    model = null;
    modelDir;
    detectionThreshold;
    useFallback = false;
    constructor(modelDir, detectionThreshold = 0.3) {
        this.modelDir = modelDir;
        this.detectionThreshold = detectionThreshold;
    }
    async load() {
        const modelJson = path.join(this.modelDir, "model.json");
        if (!fs.existsSync(modelJson)) {
            console.warn(`[TextRegionDetector] Model not found at "${modelJson}". ` +
                "Falling back to full-image single-region mode.");
            this.useFallback = true;
            return;
        }
        this.model = await tf.loadGraphModel(`file://${modelJson}`);
    }
    /**
     * Detect text regions in a preprocessed image.
     * Returns an array of DetectedRegion sorted by detection score descending.
     */
    async detect(prepared) {
        if (this.useFallback || !this.model) {
            return this.fallbackDetect(prepared);
        }
        return this.eastDetect(prepared);
    }
    async eastDetect(prepared) {
        const { data, width, height } = prepared;
        // EAST expects input shape [1, H, W, 3] with values in [0, 1]
        const inputTensor = tf.tensor4d(data, [1, height, width, 3]);
        let outputMap;
        try {
            outputMap = this.model.execute(inputTensor);
        }
        finally {
            inputTensor.dispose();
        }
        // EAST output tensors: "feature_fusion/Conv_7/Sigmoid" (scores) and
        // "feature_fusion/concat_3" (geometry: 5 channels — 4 distances + angle)
        const scoreTensor = outputMap["feature_fusion/Conv_7/Sigmoid"];
        const geoTensor = outputMap["feature_fusion/concat_3"];
        const scores = (await scoreTensor.array());
        const geometry = (await geoTensor.array());
        scoreTensor.dispose();
        geoTensor.dispose();
        const regions = [];
        const mapH = scores[0].length;
        const mapW = scores[0][0].length;
        for (let row = 0; row < mapH; row++) {
            for (let col = 0; col < mapW; col++) {
                const score = scores[0][row][col][0];
                if (score < this.detectionThreshold)
                    continue;
                // Geometry: [top, right, bottom, left, angle]
                const top = geometry[0][row][col][0];
                const right = geometry[0][row][col][1];
                const bottom = geometry[0][row][col][2];
                const left = geometry[0][row][col][3];
                const angle = geometry[0][row][col][4];
                // Convert feature-map coordinates back to image coordinates
                const offsetX = col * 4;
                const offsetY = row * 4;
                const x1 = Math.max(0, (offsetX - left) / width);
                const y1 = Math.max(0, (offsetY - top) / height);
                const x2 = Math.min(1, (offsetX + right) / width);
                const y2 = Math.min(1, (offsetY + bottom) / height);
                if (x2 <= x1 || y2 <= y1)
                    continue;
                regions.push({
                    bbox: { x1, y1, x2, y2, angle: (angle * 180) / Math.PI },
                    detectionScore: score,
                    recognizedText: "",
                    recognitionConfidence: 0,
                });
            }
        }
        // Non-maximum suppression: remove highly overlapping boxes
        return nms(regions, 0.3).sort((a, b) => b.detectionScore - a.detectionScore);
    }
    /**
     * Fallback: divide the image into a 12x12 grid and score each cell
     * by its greyscale standard deviation (a proxy for text presence).
     * Cells with low variance (uniform color blocks) are filtered out.
     */
    async fallbackDetect(prepared) {
        const gridRows = 12;
        const gridCols = 12;
        const regions = [];
        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const x1 = c / gridCols;
                const y1 = r / gridRows;
                const x2 = (c + 1) / gridCols;
                const y2 = (r + 1) / gridRows;
                const score = await this.estimateCellTextScore(prepared, x1, y1, x2, y2);
                // Only include cells with likely text content
                if (score > 0.2) {
                    regions.push({
                        bbox: { x1, y1, x2, y2, angle: 0 },
                        detectionScore: score,
                        recognizedText: "",
                        recognitionConfidence: 0,
                    });
                }
            }
        }
        return regions;
    }
    /**
     * Estimate whether a grid cell contains text by measuring greyscale
     * standard deviation. High stdev = edges/contrast = likely text.
     */
    async estimateCellTextScore(prepared, x1, y1, x2, y2) {
        const { originalBuffer, originalWidth: W, originalHeight: H } = prepared;
        const left = Math.floor(x1 * W);
        const top = Math.floor(y1 * H);
        const width = Math.max(1, Math.min(Math.ceil((x2 - x1) * W), W - left));
        const height = Math.max(1, Math.min(Math.ceil((y2 - y1) * H), H - top));
        try {
            const stats = await (0, sharp_1.default)(originalBuffer)
                .extract({ left, top, width, height })
                .greyscale()
                .stats();
            const stdev = stats.channels[0].stdev;
            // Normalize: stdev 0–80 → score 0.2–0.9
            return Math.min(0.9, Math.max(0.2, stdev / 80));
        }
        catch {
            return 0.5;
        }
    }
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}
exports.TextRegionDetector = TextRegionDetector;
/** Intersection-over-Union of two bounding boxes */
function iou(a, b) {
    const ix1 = Math.max(a.bbox.x1, b.bbox.x1);
    const iy1 = Math.max(a.bbox.y1, b.bbox.y1);
    const ix2 = Math.min(a.bbox.x2, b.bbox.x2);
    const iy2 = Math.min(a.bbox.y2, b.bbox.y2);
    const interW = Math.max(0, ix2 - ix1);
    const interH = Math.max(0, iy2 - iy1);
    const interArea = interW * interH;
    const aArea = (a.bbox.x2 - a.bbox.x1) * (a.bbox.y2 - a.bbox.y1);
    const bArea = (b.bbox.x2 - b.bbox.x1) * (b.bbox.y2 - b.bbox.y1);
    return interArea / (aArea + bArea - interArea + 1e-6);
}
/** Greedy non-maximum suppression */
function nms(regions, iouThreshold) {
    const sorted = [...regions].sort((a, b) => b.detectionScore - a.detectionScore);
    const kept = [];
    for (const candidate of sorted) {
        const overlaps = kept.some((k) => iou(k, candidate) > iouThreshold);
        if (!overlaps)
            kept.push(candidate);
    }
    return kept;
}
//# sourceMappingURL=textRegionDetector.js.map
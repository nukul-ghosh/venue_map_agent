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
exports.saveDebugImage = saveDebugImage;
const sharp_1 = __importDefault(require("sharp"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Draw bounding boxes onto the original image and save as a debug PNG.
 * Each box is coloured by detection score (green = high, red = low).
 */
async function saveDebugImage(prepared, regions, outputDir, stem) {
    fs.mkdirSync(outputDir, { recursive: true });
    const { originalBuffer, originalWidth: w, originalHeight: h, scaleX, scaleY } = prepared;
    // Build an SVG overlay with rectangles for each detected region
    const rects = regions
        .map((r) => {
        const { x1, y1, x2, y2 } = r.bbox;
        // Convert normalised coords → original image pixels
        const rx = Math.floor(x1 * prepared.width * scaleX);
        const ry = Math.floor(y1 * prepared.height * scaleY);
        const rw = Math.max(1, Math.ceil((x2 - x1) * prepared.width * scaleX));
        const rh = Math.max(1, Math.ceil((y2 - y1) * prepared.height * scaleY));
        // Colour: green for high confidence, red for low
        const score = r.detectionScore;
        const red = Math.round((1 - score) * 255);
        const green = Math.round(score * 255);
        const colour = `rgb(${red},${green},0)`;
        const label = r.recognizedText
            ? r.recognizedText.slice(0, 20).replace(/[<>&"]/g, "")
            : "";
        return `
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}"
              fill="none" stroke="${colour}" stroke-width="2"/>
        <text x="${rx + 2}" y="${Math.max(ry - 2, 10)}"
              font-size="12" fill="${colour}">${label}</text>`;
    })
        .join("\n");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
    const outPath = path.join(outputDir, `${stem}_debug.png`);
    await (0, sharp_1.default)(originalBuffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .png()
        .toFile(outPath);
    return outPath;
}
//# sourceMappingURL=visualization.js.map
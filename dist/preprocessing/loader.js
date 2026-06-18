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
exports.loadVenueMap = loadVenueMap;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf2pic_1 = require("pdf2pic");
const sharp_1 = __importDefault(require("sharp"));
const SUPPORTED_FORMATS = ["png", "jpg", "jpeg", "pdf"];
function getExtension(filePath) {
    return path.extname(filePath).toLowerCase().replace(".", "");
}
function assertSupportedFormat(ext, filePath) {
    if (!SUPPORTED_FORMATS.includes(ext)) {
        throw new Error(`Unsupported file format ".${ext}" for "${filePath}". Supported formats: ${SUPPORTED_FORMATS.join(", ")}`);
    }
}
async function loadImageFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    const metadata = await (0, sharp_1.default)(buffer).metadata();
    if (!metadata.width || !metadata.height) {
        throw new Error(`Could not read image dimensions from "${filePath}"`);
    }
    return [
        {
            buffer,
            width: metadata.width,
            height: metadata.height,
            pageIndex: 0,
            sourcePath: filePath,
        },
    ];
}
async function loadPdfFile(filePath, dpi) {
    const convert = (0, pdf2pic_1.fromPath)(filePath, {
        density: dpi,
        saveFilename: "page",
        savePath: "/tmp/venue_map_agent_pdf_pages",
        format: "png",
        width: undefined,
        height: undefined,
    });
    // Get page count by attempting conversion of page 1 and catching bulk
    // pdf2pic does not expose page count directly; we convert all pages via bulk()
    const results = await convert.bulk(-1, { responseType: "buffer" });
    const images = [];
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (!result.buffer) {
            throw new Error(`PDF page ${i + 1} conversion produced no buffer`);
        }
        const buf = result.buffer;
        const metadata = await (0, sharp_1.default)(buf).metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error(`Could not read dimensions from PDF page ${i + 1}`);
        }
        images.push({
            buffer: buf,
            width: metadata.width,
            height: metadata.height,
            pageIndex: i,
            sourcePath: filePath,
        });
    }
    return images;
}
/**
 * Loads a venue map file (PNG, JPEG, JPG, or PDF) and returns
 * one LoadedImage per page/frame.
 */
async function loadVenueMap(filePath, dpi = 300) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: "${filePath}"`);
    }
    const ext = getExtension(filePath);
    assertSupportedFormat(ext, filePath);
    if (ext === "pdf") {
        return loadPdfFile(filePath, dpi);
    }
    return loadImageFile(filePath);
}
//# sourceMappingURL=loader.js.map
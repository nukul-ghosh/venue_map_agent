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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const path = __importStar(require("path"));
const loader_1 = require("./preprocessing/loader");
const imagePrep_1 = require("./preprocessing/imagePrep");
const textRegionDetector_1 = require("./detection/textRegionDetector");
const textRecognizer_1 = require("./recognition/textRecognizer");
const ocrPipeline_1 = require("./recognition/ocrPipeline");
const sectionExtractor_1 = require("./extraction/sectionExtractor");
const fieldDeriver_1 = require("./extraction/fieldDeriver");
const csvGenerator_1 = require("./manifest/csvGenerator");
const confidenceReporter_1 = require("./manifest/confidenceReporter");
const dataStore_1 = require("./learning/dataStore");
const heuristicsLearner_1 = require("./learning/heuristicsLearner");
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)("Agent");
/**
 * Run the full venue map → AVAIL CSV pipeline.
 */
async function runAgent(options) {
    const { input, outputDir, modelDir, minConfidence, detectionThreshold, dpi, maxImageDim, learningDataDir, } = options;
    const inputStem = path.basename(input, path.extname(input));
    // --- Load learned overrides from the DB ---
    const dataStore = new dataStore_1.DataStore(learningDataDir);
    dataStore.open();
    const learner = new heuristicsLearner_1.HeuristicsLearner(dataStore);
    const learnedOverrides = learner.loadOverrides();
    logger.info(`Loaded ${learnedOverrides.length} learned heuristic override(s)`);
    // --- Preprocessing ---
    logger.info(`Loading "${input}"…`);
    const loadedImages = await (0, loader_1.loadVenueMap)(input, dpi);
    logger.info(`Loaded ${loadedImages.length} page(s)`);
    // Process first page only for single-map venues; iterate for multi-page
    const allRecords = [];
    const detector = new textRegionDetector_1.TextRegionDetector(modelDir, detectionThreshold);
    await detector.load();
    const recognizer = new textRecognizer_1.TextRecognizer();
    await recognizer.load();
    for (const loaded of loadedImages) {
        logger.info(`Preprocessing page ${loaded.pageIndex + 1}…`);
        const prepared = await (0, imagePrep_1.prepareImage)(loaded, maxImageDim);
        // --- Detection ---
        logger.info("Detecting text regions…");
        const regions = await detector.detect(prepared);
        logger.info(`Detected ${regions.length} region(s)`);
        // --- Recognition ---
        logger.info("Running OCR on detected regions…");
        await (0, ocrPipeline_1.runOcrPipeline)(prepared, regions, recognizer, (done, total) => {
            if (done % 10 === 0 || done === total) {
                logger.debug(`OCR progress: ${done}/${total}`);
            }
        });
        const recognizedCount = regions.filter((r) => r.recognizedText).length;
        logger.info(`Recognised text in ${recognizedCount}/${regions.length} region(s)`);
        // --- Extraction ---
        const candidates = (0, sectionExtractor_1.extractSections)(regions);
        logger.info(`Grouped into ${candidates.length} section candidate(s)`);
        for (const candidate of candidates) {
            const record = (0, fieldDeriver_1.deriveFields)(candidate, learnedOverrides);
            allRecords.push(record);
            // Persist raw detection data for learning
            dataStore.insertDetection({
                inputFile: input,
                pageIndex: loaded.pageIndex,
                clusterId: candidate.clusterId,
                recognizedText: candidate.combinedText,
                derivedSection: record.section,
                derivedRows: record.rows.join(","),
                derivedSeats: record.seats.join(","),
                derivedSecnam: record.secnam,
                derivedType: record.type,
                sectionConfidence: record.sectionConfidence,
            });
        }
    }
    detector.dispose();
    await recognizer.terminate();
    dataStore.close();
    // --- Manifest generation ---
    const imageReadabilityScore = allRecords.length > 0
        ? allRecords.reduce((s, r) => s + r.sectionConfidence, 0) / allRecords.length
        : 0;
    logger.info(`Image readability score: ${imageReadabilityScore.toFixed(3)}`);
    const confidencePath = (0, confidenceReporter_1.generateConfidenceReport)(allRecords, input, outputDir, inputStem);
    logger.info(`Confidence report → ${confidencePath}`);
    if (imageReadabilityScore < minConfidence) {
        logger.warn(`Readability score ${imageReadabilityScore.toFixed(3)} is below ` +
            `--min-confidence ${minConfidence}. No CSV written.`);
        return {
            csvPath: null,
            confidencePath,
            imageReadabilityScore,
            sections: allRecords,
            exitCode: 1,
        };
    }
    const csvPath = (0, csvGenerator_1.generateAvailCsv)(allRecords, outputDir, inputStem);
    logger.info(`AVAIL CSV → ${csvPath}`);
    return {
        csvPath,
        confidencePath,
        imageReadabilityScore,
        sections: allRecords,
        exitCode: 0,
    };
}
//# sourceMappingURL=agent.js.map
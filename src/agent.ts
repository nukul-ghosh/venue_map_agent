import * as path from "path";
import { loadVenueMap } from "./preprocessing/loader";
import { prepareImage } from "./preprocessing/imagePrep";
import { TextRegionDetector } from "./detection/textRegionDetector";
import { TextRecognizer } from "./recognition/textRecognizer";
import { runOcrPipeline } from "./recognition/ocrPipeline";
import { extractSections } from "./extraction/sectionExtractor";
import { deriveFields, type SectionRecord } from "./extraction/fieldDeriver";
import { generateAvailCsv } from "./manifest/csvGenerator";
import { generateConfidenceReport } from "./manifest/confidenceReporter";
import { DataStore } from "./learning/dataStore";
import { HeuristicsLearner } from "./learning/heuristicsLearner";
import type { HeuristicsOverride } from "./extraction/heuristics";
import { createLogger } from "./utils/logger";

const logger = createLogger("Agent");

export interface AgentOptions {
  input: string;
  outputDir: string;
  modelDir: string;
  minConfidence: number;
  detectionThreshold: number;
  dpi: number;
  maxImageDim: number;
  debug: boolean;
  visualize: boolean;
  learningDataDir: string;
}

export interface AgentResult {
  csvPath: string | null;
  confidencePath: string;
  imageReadabilityScore: number;
  sections: SectionRecord[];
  /** Exit code: 0 = success, 1 = below threshold */
  exitCode: 0 | 1;
}

/**
 * Run the full venue map → AVAIL CSV pipeline.
 */
export async function runAgent(options: AgentOptions): Promise<AgentResult> {
  const {
    input,
    outputDir,
    modelDir,
    minConfidence,
    detectionThreshold,
    dpi,
    maxImageDim,
    learningDataDir,
  } = options;

  const inputStem = path.basename(input, path.extname(input));

  // --- Load learned overrides from the DB ---
  const dataStore = new DataStore(learningDataDir);
  dataStore.open();
  const learner = new HeuristicsLearner(dataStore);
  const learnedOverrides: HeuristicsOverride[] = learner.loadOverrides();
  logger.info(`Loaded ${learnedOverrides.length} learned heuristic override(s)`);

  // --- Preprocessing ---
  logger.info(`Loading "${input}"…`);
  const loadedImages = await loadVenueMap(input, dpi);
  logger.info(`Loaded ${loadedImages.length} page(s)`);

  // Process first page only for single-map venues; iterate for multi-page
  const allRecords: SectionRecord[] = [];

  const detector = new TextRegionDetector(modelDir, detectionThreshold);
  await detector.load();

  const recognizer = new TextRecognizer();
  await recognizer.load();

  for (const loaded of loadedImages) {
    logger.info(`Preprocessing page ${loaded.pageIndex + 1}…`);
    const prepared = await prepareImage(loaded, maxImageDim);

    // --- Detection ---
    logger.info("Detecting text regions…");
    const regions = await detector.detect(prepared);
    logger.info(`Detected ${regions.length} region(s)`);

    // --- Recognition ---
    logger.info("Running OCR on detected regions…");
    await runOcrPipeline(prepared, regions, recognizer, (done, total) => {
      if (done % 10 === 0 || done === total) {
        logger.debug(`OCR progress: ${done}/${total}`);
      }
    });

    const recognizedCount = regions.filter((r) => r.recognizedText).length;
    logger.info(`Recognised text in ${recognizedCount}/${regions.length} region(s)`);

    // --- Extraction ---
    const candidates = extractSections(regions);
    logger.info(`Grouped into ${candidates.length} section candidate(s)`);

    for (const candidate of candidates) {
      const record = deriveFields(candidate, learnedOverrides);
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
  const imageReadabilityScore =
    allRecords.length > 0
      ? allRecords.reduce((s, r) => s + r.sectionConfidence, 0) / allRecords.length
      : 0;

  logger.info(`Image readability score: ${imageReadabilityScore.toFixed(3)}`);

  const confidencePath = generateConfidenceReport(
    allRecords,
    input,
    outputDir,
    inputStem
  );
  logger.info(`Confidence report → ${confidencePath}`);

  if (imageReadabilityScore < minConfidence) {
    logger.warn(
      `Readability score ${imageReadabilityScore.toFixed(3)} is below ` +
        `--min-confidence ${minConfidence}. No CSV written.`
    );
    return {
      csvPath: null,
      confidencePath,
      imageReadabilityScore,
      sections: allRecords,
      exitCode: 1,
    };
  }

  const csvPath = generateAvailCsv(allRecords, outputDir, inputStem);
  logger.info(`AVAIL CSV → ${csvPath}`);

  return {
    csvPath,
    confidencePath,
    imageReadabilityScore,
    sections: allRecords,
    exitCode: 0,
  };
}

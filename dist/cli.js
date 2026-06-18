#!/usr/bin/env node
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
const commander_1 = require("commander");
const path = __importStar(require("path"));
const agent_1 = require("./agent");
const dataStore_1 = require("./learning/dataStore");
const feedbackCollector_1 = require("./learning/feedbackCollector");
const heuristicsLearner_1 = require("./learning/heuristicsLearner");
const modelFinetuner_1 = require("./learning/modelFinetuner");
const logger_1 = require("./utils/logger");
const logger = (0, logger_1.createLogger)("CLI");
const program = new commander_1.Command();
program
    .name("venue-map-agent")
    .description("Parse a venue seating map image or PDF and generate an AVAIL CSV manifest")
    .version("1.0.0");
program
    .command("run", { isDefault: true })
    .description("Process a venue map and generate the AVAIL CSV")
    .requiredOption("-i, --input <path>", "Input file (.png, .jpg, .jpeg, .pdf)")
    .option("-o, --output <dir>", "Output directory", "./output")
    .option("--min-confidence <float>", "Min image readability score to write CSV", parseFloat, 0.25)
    .option("--detection-threshold <float>", "Min detection score to keep a box", parseFloat, 0.30)
    .option("--dpi <int>", "DPI for PDF conversion", parseInt, 300)
    .option("--max-image-dim <int>", "Cap longer image dimension in pixels", parseInt, 2048)
    .option("--debug", "Enable debug logging", false)
    .option("--visualize", "Save debug image with bounding boxes drawn", false)
    .option("--model-dir <path>", "TF.js EAST model directory", "./models/east")
    .option("--learning-data-dir <path>", "Learning data directory", "./learning_data")
    .option("--review", "After generation, interactively review and correct CSV rows", false)
    .action(async (opts) => {
    if (opts.debug) {
        process.env.LOG_LEVEL = "debug";
    }
    try {
        const result = await (0, agent_1.runAgent)({
            input: path.resolve(opts.input),
            outputDir: path.resolve(opts.output),
            modelDir: path.resolve(opts.modelDir),
            minConfidence: opts.minConfidence,
            detectionThreshold: opts.detectionThreshold,
            dpi: opts.dpi,
            maxImageDim: opts.maxImageDim,
            debug: opts.debug,
            visualize: opts.visualize,
            learningDataDir: path.resolve(opts.learningDataDir),
        });
        if (opts.review && result.sections.length > 0) {
            const dataStore = new dataStore_1.DataStore(path.resolve(opts.learningDataDir));
            dataStore.open();
            const learner = new heuristicsLearner_1.HeuristicsLearner(dataStore);
            const collector = new feedbackCollector_1.FeedbackCollector(dataStore, learner);
            await collector.review(result.sections);
            dataStore.close();
        }
        process.exit(result.exitCode);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("File not found") || message.includes("Unsupported file format")) {
            logger.error(message);
            process.exit(2);
        }
        if (message.includes("model") || message.includes("loadGraphModel")) {
            logger.error(`Model load failure: ${message}`);
            process.exit(3);
        }
        logger.error(`Unexpected error: ${message}`);
        process.exit(1);
    }
});
program
    .command("fine-tune")
    .description("Fine-tune the TF.js model on accumulated corrections")
    .option("--model-dir <path>", "TF.js EAST model directory", "./models/east")
    .option("--learning-data-dir <path>", "Learning data directory", "./learning_data")
    .option("--min-samples <int>", "Minimum corrections required before fine-tuning", parseInt, 50)
    .action(async (opts) => {
    const dataStore = new dataStore_1.DataStore(path.resolve(opts.learningDataDir));
    dataStore.open();
    const finetuner = new modelFinetuner_1.ModelFinetuner(dataStore, path.resolve(opts.modelDir), opts.minSamples);
    await finetuner.run();
    dataStore.close();
});
program
    .command("reset-learning")
    .description("Clear the learning database and start fresh (destructive)")
    .option("--learning-data-dir <path>", "Learning data directory", "./learning_data")
    .action(async (opts) => {
    const { default: enquirer } = await Promise.resolve().then(() => __importStar(require("enquirer")));
    const response = await enquirer.prompt({
        type: "confirm",
        name: "confirm",
        message: "This will permanently delete all learned corrections and overrides. Continue?",
        initial: false,
    });
    if (response.confirm) {
        const dataStore = new dataStore_1.DataStore(path.resolve(opts.learningDataDir));
        dataStore.open();
        dataStore.reset();
        dataStore.close();
        logger.info("Learning database cleared.");
    }
    else {
        logger.info("Cancelled.");
    }
});
program.parse(process.argv);
//# sourceMappingURL=cli.js.map
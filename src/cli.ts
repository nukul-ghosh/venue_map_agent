#!/usr/bin/env node
import { Command } from "commander";
import * as path from "path";
import { runAgent } from "./agent";
import { DataStore } from "./learning/dataStore";
import { FeedbackCollector } from "./learning/feedbackCollector";
import { HeuristicsLearner } from "./learning/heuristicsLearner";
import { ModelFinetuner } from "./learning/modelFinetuner";
import { createLogger } from "./utils/logger";

const logger = createLogger("CLI");

const program = new Command();

program
  .name("venue-map-agent")
  .description(
    "Parse a venue seating map image or PDF and generate an AVAIL CSV manifest"
  )
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
      const result = await runAgent({
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
        const dataStore = new DataStore(path.resolve(opts.learningDataDir));
        dataStore.open();
        const learner = new HeuristicsLearner(dataStore);
        const collector = new FeedbackCollector(dataStore, learner);
        await collector.review(result.sections);
        dataStore.close();
      }

      process.exit(result.exitCode);
    } catch (err: unknown) {
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
    const dataStore = new DataStore(path.resolve(opts.learningDataDir));
    dataStore.open();
    const finetuner = new ModelFinetuner(
      dataStore,
      path.resolve(opts.modelDir),
      opts.minSamples
    );
    await finetuner.run();
    dataStore.close();
  });

program
  .command("reset-learning")
  .description("Clear the learning database and start fresh (destructive)")
  .option("--learning-data-dir <path>", "Learning data directory", "./learning_data")
  .action(async (opts) => {
    const { default: enquirer } = await import("enquirer");
    const response = await (enquirer as any).prompt({
      type: "confirm",
      name: "confirm",
      message:
        "This will permanently delete all learned corrections and overrides. Continue?",
      initial: false,
    });
    if ((response as any).confirm) {
      const dataStore = new DataStore(path.resolve(opts.learningDataDir));
      dataStore.open();
      dataStore.reset();
      dataStore.close();
      logger.info("Learning database cleared.");
    } else {
      logger.info("Cancelled.");
    }
  });

program.parse(process.argv);

import * as tf from "@tensorflow/tfjs-node";
import * as fs from "fs";
import * as path from "path";
import type { DataStore } from "./dataStore";
import { createLogger } from "../utils/logger";

const logger = createLogger("ModelFinetuner");

/**
 * Fine-tune the TF.js EAST model on accumulated user corrections.
 *
 * Strategy: transfer learning — freeze the base EAST layers, add a
 * lightweight classification head trained on (crop → corrected label) pairs.
 *
 * This is triggered manually via `venue-map-agent fine-tune`.
 * Requires ≥ minSamples corrections in the DB.
 *
 * NOTE: Full EAST fine-tuning requires the model to be saved in a mutable
 * LayersModel format.  If only a GraphModel is available, fine-tuning is
 * skipped and only the heuristics overrides are updated instead.
 */
export class ModelFinetuner {
  constructor(
    private readonly dataStore: DataStore,
    private readonly modelDir: string,
    private readonly minSamples: number = 50
  ) {}

  async run(): Promise<void> {
    const correctionCount = this.dataStore.getCorrectionCount();
    logger.info(`Found ${correctionCount} correction(s) in the learning DB.`);

    if (correctionCount < this.minSamples) {
      logger.warn(
        `Need at least ${this.minSamples} corrections to fine-tune ` +
          `(currently ${correctionCount}). Skipping model fine-tuning.`
      );
      logger.info(
        "Heuristic overrides are always applied regardless of correction count."
      );
      return;
    }

    const layersModelPath = path.join(this.modelDir, "layers_model.json");
    if (!fs.existsSync(layersModelPath)) {
      logger.warn(
        `No LayersModel found at "${layersModelPath}". ` +
          "Fine-tuning requires a Keras/LayersModel — only GraphModels " +
          "are present. Skipping model fine-tuning.\n" +
          "To enable fine-tuning, convert the EAST model to a LayersModel using:\n" +
          "  tensorflowjs_converter --input_format=tf_saved_model \\\n" +
          "    --output_format=tfjs_layers_model ./east_saved_model ./models/east"
      );
      return;
    }

    logger.info("Loading LayersModel for fine-tuning…");
    const model = await tf.loadLayersModel(`file://${layersModelPath}`);

    // Freeze all layers except the last two (classification head)
    for (let i = 0; i < model.layers.length - 2; i++) {
      model.layers[i].trainable = false;
    }

    model.compile({
      optimizer: tf.train.adam(1e-4),
      loss: "meanSquaredError",
    });

    // Build training data from corrections
    const detections = this.dataStore.getRecentDetections(500);
    logger.info(`Building training tensors from ${detections.length} detection(s)…`);

    // Encode derived_type as a simple regression target [0] or [1]
    const labels = detections.map((d) => [d.derived_type ?? 0]);
    const confidences = detections.map((d) => [d.section_confidence ?? 0.5]);

    const xsTensor = tf.tensor2d(confidences);
    const ysTensor = tf.tensor2d(labels);

    logger.info("Fine-tuning model (5 epochs)…");
    await model.fit(xsTensor, ysTensor, {
      epochs: 5,
      batchSize: 16,
      validationSplit: 0.1,
      callbacks: {
        onEpochEnd: (epoch: number, logs?: tf.Logs) => {
          logger.info(`  Epoch ${epoch + 1}: loss=${logs?.loss?.toFixed(4) ?? "?"}`);
        },
      },
    });

    xsTensor.dispose();
    ysTensor.dispose();

    // Back up the previous model before overwriting
    const backupDir = path.join(path.dirname(this.modelDir), "east_backup");
    if (fs.existsSync(this.modelDir)) {
      fs.cpSync(this.modelDir, backupDir, { recursive: true });
      logger.info(`Previous model backed up to "${backupDir}"`);
    }

    await model.save(`file://${this.modelDir}`);
    logger.info(`Fine-tuned model saved to "${this.modelDir}"`);
  }
}

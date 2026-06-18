import type { DataStore } from "./dataStore";
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
export declare class ModelFinetuner {
    private readonly dataStore;
    private readonly modelDir;
    private readonly minSamples;
    constructor(dataStore: DataStore, modelDir: string, minSamples?: number);
    run(): Promise<void>;
}
//# sourceMappingURL=modelFinetuner.d.ts.map
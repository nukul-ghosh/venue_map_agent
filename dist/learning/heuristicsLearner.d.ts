import type { DataStore } from "./dataStore";
import type { HeuristicsOverride, SectionType } from "../extraction/heuristics";
/**
 * Reads and writes learned heuristic overrides in the DataStore.
 *
 * Each time the user corrects or accepts a section, we extract the
 * section ID prefix and store it alongside the confirmed secnam and type.
 * On the next run, these overrides take priority over the default rules.
 */
export declare class HeuristicsLearner {
    private readonly dataStore;
    constructor(dataStore: DataStore);
    /**
     * Load all learned overrides from the DB and return them as
     * HeuristicsOverride objects consumable by fieldDeriver.ts.
     */
    loadOverrides(): HeuristicsOverride[];
    /**
     * Record a confirmed section → secnam/type mapping.
     * Extracts the section ID prefix (letters at the start) and upserts it.
     */
    recordCorrection(sectionId: string, secnam: string, type: SectionType): void;
}
//# sourceMappingURL=heuristicsLearner.d.ts.map
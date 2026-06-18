import type { DataStore } from "./dataStore";
import type { HeuristicsOverride, SectionType } from "../extraction/heuristics";
import { createLogger } from "../utils/logger";

const logger = createLogger("HeuristicsLearner");

/**
 * Reads and writes learned heuristic overrides in the DataStore.
 *
 * Each time the user corrects or accepts a section, we extract the
 * section ID prefix and store it alongside the confirmed secnam and type.
 * On the next run, these overrides take priority over the default rules.
 */
export class HeuristicsLearner {
  constructor(private readonly dataStore: DataStore) {}

  /**
   * Load all learned overrides from the DB and return them as
   * HeuristicsOverride objects consumable by fieldDeriver.ts.
   */
  loadOverrides(): HeuristicsOverride[] {
    const rows = this.dataStore.getAllHeuristicsOverrides();
    return rows.map((row) => ({
      sectionIdPrefix: row.section_id_prefix,
      secnam: row.secnam,
      type: row.type as SectionType,
    }));
  }

  /**
   * Record a confirmed section → secnam/type mapping.
   * Extracts the section ID prefix (letters at the start) and upserts it.
   */
  recordCorrection(sectionId: string, secnam: string, type: SectionType): void {
    // Extract letter prefix from section ID (e.g. "SEC101" → "SEC", "GA3" → "GA", "101" → "101")
    const prefixMatch = sectionId.match(/^([A-Za-z]+)/);
    const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : sectionId.toUpperCase();

    this.dataStore.upsertHeuristicsOverride(prefix, secnam, type);
    logger.debug(`Learned override: prefix="${prefix}" → secnam="${secnam}", type=${type}`);
  }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeuristicsLearner = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)("HeuristicsLearner");
/**
 * Reads and writes learned heuristic overrides in the DataStore.
 *
 * Each time the user corrects or accepts a section, we extract the
 * section ID prefix and store it alongside the confirmed secnam and type.
 * On the next run, these overrides take priority over the default rules.
 */
class HeuristicsLearner {
    dataStore;
    constructor(dataStore) {
        this.dataStore = dataStore;
    }
    /**
     * Load all learned overrides from the DB and return them as
     * HeuristicsOverride objects consumable by fieldDeriver.ts.
     */
    loadOverrides() {
        const rows = this.dataStore.getAllHeuristicsOverrides();
        return rows.map((row) => ({
            sectionIdPrefix: row.section_id_prefix,
            secnam: row.secnam,
            type: row.type,
        }));
    }
    /**
     * Record a confirmed section → secnam/type mapping.
     * Extracts the section ID prefix (letters at the start) and upserts it.
     */
    recordCorrection(sectionId, secnam, type) {
        // Extract letter prefix from section ID (e.g. "SEC101" → "SEC", "GA3" → "GA", "101" → "101")
        const prefixMatch = sectionId.match(/^([A-Za-z]+)/);
        const prefix = prefixMatch ? prefixMatch[1].toUpperCase() : sectionId.toUpperCase();
        this.dataStore.upsertHeuristicsOverride(prefix, secnam, type);
        logger.debug(`Learned override: prefix="${prefix}" → secnam="${secnam}", type=${type}`);
    }
}
exports.HeuristicsLearner = HeuristicsLearner;
//# sourceMappingURL=heuristicsLearner.js.map
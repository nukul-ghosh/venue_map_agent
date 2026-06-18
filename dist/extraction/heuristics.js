"use strict";
/**
 * Keyword-based heuristics for deriving `secnam` and `type` from
 * detected text.  All comparisons are case-insensitive.
 *
 * The keyword tables and overrides can be augmented by the learning
 * system (learning/heuristicsLearner.ts) without changing this file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECNAM_RULES = exports.GA_KEYWORDS = void 0;
exports.deriveType = deriveType;
exports.deriveSecnam = deriveSecnam;
/** Keywords that indicate General Admission (type = 1) */
exports.GA_KEYWORDS = [
    "GA",
    "GENERAL ADMISSION",
    "GENERAL",
    "STANDING",
    "FLOOR",
    "PIT",
    "LAWN",
    "FIELD",
    "OPEN",
];
/** Color names used as section identifiers on color-coded venue maps */
const COLOR_SECTION_IDS = new Set([
    "PINK", "RED", "GREEN", "YELLOW", "CYAN", "BLUE",
    "ORANGE", "PURPLE", "GOLD", "SILVER",
]);
/** secnam mapping: each entry = [keyword(s), secnam value] */
exports.SECNAM_RULES = [
    { keywords: ["VIP", "BOX"], secnam: "VIP" },
    { keywords: ["SUITE"], secnam: "SUITE" },
    { keywords: ["FLOOR", "PIT"], secnam: "FLOOR" },
    { keywords: ["LOGE", "MEZZANINE"], secnam: "LOGE" },
    { keywords: ["BALCONY"], secnam: "BALC" },
    { keywords: ["ORCHESTRA", "ORCH"], secnam: "ORCH" },
];
/**
 * Determine the `type` field (0 or 1) from combined section text
 * and the section identifier.
 *
 * Returns [type, confidenceScore].
 * confidenceScore: 1.0 = keyword match, 0.7 = ID pattern, 0.5 = seat inference, 0.3 = default
 */
function deriveType(combinedText, sectionId, hasNumericSeats, learnedOverrides = []) {
    const upper = combinedText.toUpperCase();
    // Check learned overrides first
    for (const override of learnedOverrides) {
        if (sectionId.toUpperCase().startsWith(override.sectionIdPrefix.toUpperCase())) {
            return [override.type, 0.9];
        }
    }
    // Explicit keyword match in text
    for (const kw of exports.GA_KEYWORDS) {
        if (upper.includes(kw))
            return [1, 1.0];
    }
    // Section ID pattern: /^GA\d*$/i
    if (/^GA\d*$/i.test(sectionId))
        return [1, 0.7];
    // Color-named sections are reserved seating with lettered rows
    if (COLOR_SECTION_IDS.has(sectionId.toUpperCase()))
        return [0, 0.8];
    // Structural inference: no numeric seats → likely GA
    if (!hasNumericSeats)
        return [1, 0.5];
    // Numeric seats present → reserved/numbered seating
    return [0, 0.6];
}
/**
 * Determine the `secnam` short label from combined section text and
 * the section identifier.
 *
 * Returns [secnam, confidenceScore].
 */
function deriveSecnam(combinedText, sectionId, sectionType, learnedOverrides = []) {
    const upper = combinedText.toUpperCase();
    // Check learned overrides first
    for (const override of learnedOverrides) {
        if (sectionId.toUpperCase().startsWith(override.sectionIdPrefix.toUpperCase())) {
            return [override.secnam, 0.9];
        }
    }
    if (sectionType === 1)
        return ["GA", 1.0];
    for (const rule of exports.SECNAM_RULES) {
        for (const kw of rule.keywords) {
            if (upper.includes(kw))
                return [rule.secnam, 1.0];
        }
    }
    // Purely numeric section ID  e.g. "101", "202"
    if (/^\d+$/.test(sectionId))
        return ["SEC", 0.6];
    // Letter-prefixed ID  e.g. "P3" → "P", "AA2" → "AA"
    const prefixMatch = sectionId.match(/^([A-Za-z]+)/);
    if (prefixMatch)
        return [prefixMatch[1].toUpperCase(), 0.5];
    // Fallback
    return [sectionId.slice(0, 4).toUpperCase(), 0.3];
}
//# sourceMappingURL=heuristics.js.map
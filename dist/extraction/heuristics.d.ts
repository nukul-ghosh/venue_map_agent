/**
 * Keyword-based heuristics for deriving `secnam` and `type` from
 * detected text.  All comparisons are case-insensitive.
 *
 * The keyword tables and overrides can be augmented by the learning
 * system (learning/heuristicsLearner.ts) without changing this file.
 */
export type SectionType = 0 | 1;
export interface HeuristicsOverride {
    /** Section ID prefix (e.g. "GA", "FLOOR") — case-insensitive */
    sectionIdPrefix: string;
    secnam: string;
    type: SectionType;
}
/** Keywords that indicate General Admission (type = 1) */
export declare const GA_KEYWORDS: string[];
/** secnam mapping: each entry = [keyword(s), secnam value] */
export declare const SECNAM_RULES: Array<{
    keywords: string[];
    secnam: string;
}>;
/**
 * Determine the `type` field (0 or 1) from combined section text
 * and the section identifier.
 *
 * Returns [type, confidenceScore].
 * confidenceScore: 1.0 = keyword match, 0.7 = ID pattern, 0.5 = seat inference, 0.3 = default
 */
export declare function deriveType(combinedText: string, sectionId: string, hasNumericSeats: boolean, learnedOverrides?: HeuristicsOverride[]): [SectionType, number];
/**
 * Determine the `secnam` short label from combined section text and
 * the section identifier.
 *
 * Returns [secnam, confidenceScore].
 */
export declare function deriveSecnam(combinedText: string, sectionId: string, sectionType: SectionType, learnedOverrides?: HeuristicsOverride[]): [string, number];
//# sourceMappingURL=heuristics.d.ts.map
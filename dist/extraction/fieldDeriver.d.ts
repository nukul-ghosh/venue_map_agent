import type { SectionCandidate } from "./sectionExtractor";
import { type HeuristicsOverride, type SectionType } from "./heuristics";
export interface FieldConfidences {
    sectionId: number;
    rows: number;
    seats: number;
    capacity: number;
    secnam: number;
    type: number;
}
export interface SectionRecord {
    section: string;
    rows: string[];
    seats: string[];
    capacity: number;
    secnam: string;
    type: SectionType;
    /** Rolled-up confidence score [0, 1] for this section */
    sectionConfidence: number;
    fieldConfidences: FieldConfidences;
    warnings: string[];
}
/**
 * Derive all AVAIL CSV fields from a SectionCandidate.
 */
export declare function deriveFields(candidate: SectionCandidate, learnedOverrides?: HeuristicsOverride[]): SectionRecord;
//# sourceMappingURL=fieldDeriver.d.ts.map
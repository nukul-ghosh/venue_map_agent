import type { SectionRecord } from "../extraction/fieldDeriver";
export type SectionStatus = "OK" | "PARTIAL" | "LOW";
export interface SectionConfidenceEntry {
    section: string;
    sectionConfidence: number;
    status: SectionStatus;
    fieldConfidences: SectionRecord["fieldConfidences"];
    warnings: string[];
}
export interface ConfidenceReport {
    inputFile: string;
    processedAt: string;
    imageReadabilityScore: number;
    overallStatus: SectionStatus;
    sections: SectionConfidenceEntry[];
}
/**
 * Write a companion JSON confidence report alongside the AVAIL CSV.
 * Returns the path of the written file.
 */
export declare function generateConfidenceReport(records: SectionRecord[], inputFile: string, outputDir: string, inputStem: string): string;
//# sourceMappingURL=confidenceReporter.d.ts.map
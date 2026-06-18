import type { SectionType } from "../extraction/heuristics";
export interface DetectionRow {
    inputFile: string;
    pageIndex: number;
    clusterId: number;
    recognizedText: string;
    derivedSection: string;
    derivedRows: string;
    derivedSeats: string;
    derivedSecnam: string;
    derivedType: SectionType;
    sectionConfidence: number;
}
export interface CorrectionRow {
    detectionId: number;
    correctedSection: string;
    correctedRows: string;
    correctedSeats: string;
    correctedSecnam: string;
    correctedType: SectionType;
}
export interface HeuristicsOverrideRow {
    sectionIdPrefix: string;
    secnam: string;
    type: SectionType;
    /** How many times this override has been confirmed by the user */
    confirmCount: number;
}
/**
 * SQLite-backed store for detections, corrections, and learned overrides.
 * All writes are synchronous (better-sqlite3) for simplicity.
 */
export declare class DataStore {
    private db;
    private readonly dbPath;
    constructor(learningDataDir: string);
    open(): void;
    close(): void;
    private get conn();
    private migrate;
    insertDetection(row: DetectionRow): number;
    insertCorrection(row: CorrectionRow): void;
    upsertHeuristicsOverride(prefix: string, secnam: string, type: SectionType): void;
    getAllHeuristicsOverrides(): HeuristicsOverrideRow[];
    getRecentDetections(limit?: number): DetectionRow[];
    getCorrectionCount(): number;
    /** Destructive — clears all tables */
    reset(): void;
}
//# sourceMappingURL=dataStore.d.ts.map
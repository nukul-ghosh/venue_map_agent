import * as fs from "fs";
import * as path from "path";
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

function statusFromScore(score: number): SectionStatus {
  if (score >= 0.6) return "OK";
  if (score >= 0.4) return "PARTIAL";
  return "LOW";
}

/**
 * Write a companion JSON confidence report alongside the AVAIL CSV.
 * Returns the path of the written file.
 */
export function generateConfidenceReport(
  records: SectionRecord[],
  inputFile: string,
  outputDir: string,
  inputStem: string
): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const sectionEntries: SectionConfidenceEntry[] = records.map((r) => ({
    section: r.section,
    sectionConfidence: parseFloat(r.sectionConfidence.toFixed(4)),
    status: statusFromScore(r.sectionConfidence),
    fieldConfidences: r.fieldConfidences,
    warnings: r.warnings,
  }));

  const imageReadabilityScore =
    records.length > 0
      ? records.reduce((acc, r) => acc + r.sectionConfidence, 0) / records.length
      : 0;

  const report: ConfidenceReport = {
    inputFile,
    processedAt: new Date().toISOString(),
    imageReadabilityScore: parseFloat(imageReadabilityScore.toFixed(4)),
    overallStatus: statusFromScore(imageReadabilityScore),
    sections: sectionEntries,
  };

  const outPath = path.join(outputDir, `${inputStem}_confidence.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  return outPath;
}

import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { generateAvailCsv } from "../src/manifest/csvGenerator";
import { generateConfidenceReport } from "../src/manifest/confidenceReporter";
import type { SectionRecord } from "../src/extraction/fieldDeriver";

const TMP_DIR = path.join("/tmp", "venue_map_agent_tests");

const sampleRecords: SectionRecord[] = [
  {
    section: "SEC1",
    rows: ["A", "B", "C", "D"],
    seats: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    capacity: 40,
    secnam: "P1",
    type: 0,
    sectionConfidence: 0.85,
    fieldConfidences: {
      sectionId: 1.0,
      rows: 0.8,
      seats: 1.0,
      capacity: 0.8,
      secnam: 0.9,
      type: 0.7,
    },
    warnings: [],
  },
  {
    section: "GA1",
    rows: ["GA0"],
    seats: [],
    capacity: 0,
    secnam: "GA",
    type: 1,
    sectionConfidence: 0.72,
    fieldConfidences: {
      sectionId: 1.0,
      rows: 0.2,
      seats: 0.0,
      capacity: 0.0,
      secnam: 1.0,
      type: 1.0,
    },
    warnings: ["no seat numbers detected"],
  },
];

afterEach(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true });
  }
});

describe("manifest/csvGenerator", () => {
  it("writes a CSV with the correct header and rows", () => {
    const outPath = generateAvailCsv(sampleRecords, TMP_DIR, "test");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines[0]).toBe("section,rows,seats,capacity,secnam,type");
    expect(lines[1]).toContain("SEC1");
    expect(lines[1]).toContain("A,B,C,D");
    expect(lines[2]).toContain("GA1");
    expect(lines[2]).toContain("GA");
  });
});

describe("manifest/confidenceReporter", () => {
  it("writes a JSON report with correct structure", () => {
    const outPath = generateConfidenceReport(
      sampleRecords,
      "/input/test.png",
      TMP_DIR,
      "test"
    );
    expect(fs.existsSync(outPath)).toBe(true);

    const report = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(report).toHaveProperty("imageReadabilityScore");
    expect(report).toHaveProperty("overallStatus");
    expect(report.sections).toHaveLength(2);
    expect(report.sections[0].section).toBe("SEC1");
    expect(report.sections[0].status).toBe("OK");
    expect(report.sections[1].warnings).toContain("no seat numbers detected");
  });
});

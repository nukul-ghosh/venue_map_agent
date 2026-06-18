import { describe, it, expect } from "vitest";
import { deriveType, deriveSecnam } from "../src/extraction/heuristics";
import { extractSections } from "../src/extraction/sectionExtractor";
import { deriveFields } from "../src/extraction/fieldDeriver";
import type { DetectedRegion } from "../src/detection/regionModels";

describe("heuristics/deriveType", () => {
  it("returns type=1 for GA keyword", () => {
    const [type, conf] = deriveType("SECTION GA1", "GA1", true);
    expect(type).toBe(1);
    expect(conf).toBeGreaterThanOrEqual(0.7);
  });

  it("returns type=1 for section ID matching GA pattern", () => {
    const [type] = deriveType("SECTION 42", "GA3", true);
    expect(type).toBe(1);
  });

  it("returns type=0 by default for reserved numbered sections", () => {
    const [type] = deriveType("SEC101 ROW A", "SEC101", true);
    expect(type).toBe(0);
  });

  it("learned overrides take priority", () => {
    const overrides = [{ sectionIdPrefix: "P", secnam: "P1", type: 0 as const }];
    const [type, conf] = deriveType("P3 ROW A 1 2 3", "P3", true, overrides);
    expect(type).toBe(0);
    expect(conf).toBe(0.9);
  });
});

describe("heuristics/deriveSecnam", () => {
  it("returns GA for GA section type", () => {
    const [secnam] = deriveSecnam("GA FLOOR", "GA1", 1);
    expect(secnam).toBe("GA");
  });

  it("returns VIP for VIP keyword", () => {
    const [secnam] = deriveSecnam("VIP LOUNGE", "VIP1", 0);
    expect(secnam).toBe("VIP");
  });

  it("returns SEC for purely numeric section ID", () => {
    const [secnam] = deriveSecnam("101 ROW A", "101", 0);
    expect(secnam).toBe("SEC");
  });

  it("returns letter prefix for letter-prefixed section ID", () => {
    const [secnam] = deriveSecnam("P3 ROW A", "P3", 0);
    expect(secnam).toBe("P");
  });
});

describe("extraction/sectionExtractor", () => {
  function makeRegion(
    cx: number,
    cy: number,
    text: string
  ): DetectedRegion {
    const half = 0.02;
    return {
      bbox: { x1: cx - half, y1: cy - half, x2: cx + half, y2: cy + half, angle: 0 },
      detectionScore: 0.9,
      recognizedText: text,
      recognitionConfidence: 0.8,
    };
  }

  it("groups nearby regions into one cluster", () => {
    const regions = [
      makeRegion(0.1, 0.1, "SEC1"),
      makeRegion(0.11, 0.1, "ROW A"),
      makeRegion(0.12, 0.1, "1"),
    ];
    const candidates = extractSections(regions, 0.05, 1);
    expect(candidates.length).toBe(1);
    expect(candidates[0].combinedText).toContain("SEC1");
  });

  it("separates distant regions into different clusters", () => {
    const regions = [
      makeRegion(0.1, 0.1, "SEC1"),
      makeRegion(0.9, 0.9, "SEC2"),
    ];
    const candidates = extractSections(regions, 0.05, 1);
    expect(candidates.length).toBe(2);
  });

  it("returns empty array for no regions", () => {
    expect(extractSections([])).toEqual([]);
  });
});

describe("extraction/fieldDeriver", () => {
  it("derives a complete SectionRecord from recognised text", () => {
    const region: DetectedRegion = {
      bbox: { x1: 0.1, y1: 0.1, x2: 0.3, y2: 0.2, angle: 0 },
      detectionScore: 0.85,
      recognizedText: "SEC1 ROW A ROW B 1 2 3 4 5",
      recognitionConfidence: 0.9,
    };
    const candidate = {
      clusterId: 0,
      regions: [region],
      combinedText: region.recognizedText,
      centroidX: 0.2,
      centroidY: 0.15,
    };
    const record = deriveFields(candidate);
    expect(record.section).toBe("SEC1");
    expect(record.rows.length).toBeGreaterThan(0);
    expect(record.seats.length).toBeGreaterThan(0);
    expect(record.type).toBe(0); // SEC1 is reserved
    expect(record.sectionConfidence).toBeGreaterThan(0);
  });
});

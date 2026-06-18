import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { DataStore } from "../src/learning/dataStore";
import { HeuristicsLearner } from "../src/learning/heuristicsLearner";

const TMP_DIR = path.join("/tmp", "venue_map_agent_learning_tests");

let dataStore: DataStore;

beforeEach(() => {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  dataStore = new DataStore(TMP_DIR);
  dataStore.open();
});

afterEach(() => {
  dataStore.close();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("DataStore", () => {
  it("inserts and retrieves a detection", () => {
    dataStore.insertDetection({
      inputFile: "map.png",
      pageIndex: 0,
      clusterId: 0,
      recognizedText: "SEC1 ROW A 1 2 3",
      derivedSection: "SEC1",
      derivedRows: "A",
      derivedSeats: "1,2,3",
      derivedSecnam: "SEC",
      derivedType: 0,
      sectionConfidence: 0.8,
    });
    const rows = dataStore.getRecentDetections(10);
    expect(rows.length).toBe(1);
    expect(rows[0].derivedSection).toBe("SEC1");
  });

  it("upserts heuristics overrides and increments confirm_count", () => {
    dataStore.upsertHeuristicsOverride("GA", "GA", 1);
    dataStore.upsertHeuristicsOverride("GA", "GA", 1);
    const overrides = dataStore.getAllHeuristicsOverrides();
    expect(overrides.length).toBe(1);
    expect(overrides[0].confirm_count).toBe(2);
  });

  it("reset clears all tables", () => {
    dataStore.insertDetection({
      inputFile: "map.png",
      pageIndex: 0,
      clusterId: 0,
      recognizedText: "x",
      derivedSection: "X",
      derivedRows: "",
      derivedSeats: "",
      derivedSecnam: "X",
      derivedType: 0,
      sectionConfidence: 0.5,
    });
    dataStore.reset();
    expect(dataStore.getRecentDetections(10)).toHaveLength(0);
    expect(dataStore.getAllHeuristicsOverrides()).toHaveLength(0);
  });
});

describe("HeuristicsLearner", () => {
  it("stores and loads overrides", () => {
    const learner = new HeuristicsLearner(dataStore);
    learner.recordCorrection("P3", "P1", 0);
    learner.recordCorrection("GA2", "GA", 1);

    const overrides = learner.loadOverrides();
    expect(overrides.some((o) => o.sectionIdPrefix === "P" && o.secnam === "P1")).toBe(true);
    expect(overrides.some((o) => o.sectionIdPrefix === "GA" && o.type === 1)).toBe(true);
  });
});

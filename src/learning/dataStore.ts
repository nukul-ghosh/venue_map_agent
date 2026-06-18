import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
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
export class DataStore {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor(learningDataDir: string) {
    fs.mkdirSync(learningDataDir, { recursive: true });
    this.dbPath = path.join(learningDataDir, "agent.db");
  }

  open(): void {
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private get conn(): Database.Database {
    if (!this.db) throw new Error("DataStore not open. Call open() first.");
    return this.db;
  }

  private migrate(): void {
    this.conn.exec(`
      CREATE TABLE IF NOT EXISTS detections (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        input_file  TEXT    NOT NULL,
        page_index  INTEGER NOT NULL DEFAULT 0,
        cluster_id  INTEGER NOT NULL,
        recognized_text    TEXT,
        derived_section    TEXT,
        derived_rows       TEXT,
        derived_seats      TEXT,
        derived_secnam     TEXT,
        derived_type       INTEGER,
        section_confidence REAL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS corrections (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        detection_id      INTEGER NOT NULL REFERENCES detections(id),
        corrected_section TEXT,
        corrected_rows    TEXT,
        corrected_seats   TEXT,
        corrected_secnam  TEXT,
        corrected_type    INTEGER,
        created_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS heuristics_overrides (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        section_id_prefix   TEXT    NOT NULL UNIQUE,
        secnam              TEXT    NOT NULL,
        type                INTEGER NOT NULL,
        confirm_count       INTEGER NOT NULL DEFAULT 1,
        updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  insertDetection(row: DetectionRow): number {
    const stmt = this.conn.prepare(`
      INSERT INTO detections
        (input_file, page_index, cluster_id, recognized_text,
         derived_section, derived_rows, derived_seats, derived_secnam,
         derived_type, section_confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      row.inputFile,
      row.pageIndex,
      row.clusterId,
      row.recognizedText,
      row.derivedSection,
      row.derivedRows,
      row.derivedSeats,
      row.derivedSecnam,
      row.derivedType,
      row.sectionConfidence
    );
    return result.lastInsertRowid as number;
  }

  insertCorrection(row: CorrectionRow): void {
    const stmt = this.conn.prepare(`
      INSERT INTO corrections
        (detection_id, corrected_section, corrected_rows, corrected_seats,
         corrected_secnam, corrected_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      row.detectionId,
      row.correctedSection,
      row.correctedRows,
      row.correctedSeats,
      row.correctedSecnam,
      row.correctedType
    );
  }

  upsertHeuristicsOverride(prefix: string, secnam: string, type: SectionType): void {
    const stmt = this.conn.prepare(`
      INSERT INTO heuristics_overrides (section_id_prefix, secnam, type, confirm_count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(section_id_prefix) DO UPDATE SET
        secnam        = excluded.secnam,
        type          = excluded.type,
        confirm_count = confirm_count + 1,
        updated_at    = datetime('now')
    `);
    stmt.run(prefix, secnam, type);
  }

  getAllHeuristicsOverrides(): HeuristicsOverrideRow[] {
    return this.conn
      .prepare(
        `SELECT section_id_prefix AS section_id_prefix,
                secnam,
                type,
                confirm_count
         FROM heuristics_overrides ORDER BY confirm_count DESC`
      )
      .all() as HeuristicsOverrideRow[];
  }

  getRecentDetections(limit: number = 200): DetectionRow[] {
    return this.conn
      .prepare(
        `SELECT input_file        AS inputFile,
                page_index        AS pageIndex,
                cluster_id        AS clusterId,
                recognized_text   AS recognizedText,
                derived_section   AS derivedSection,
                derived_rows      AS derivedRows,
                derived_seats     AS derivedSeats,
                derived_secnam    AS derivedSecnam,
                derived_type      AS derivedType,
                section_confidence AS sectionConfidence
         FROM detections ORDER BY id DESC LIMIT ?`
      )
      .all(limit) as DetectionRow[];
  }

  getCorrectionCount(): number {
    const row = this.conn
      .prepare("SELECT COUNT(*) as cnt FROM corrections")
      .get() as { cnt: number };
    return row.cnt;
  }

  /** Destructive — clears all tables */
  reset(): void {
    this.conn.exec(
      "DELETE FROM corrections; DELETE FROM detections; DELETE FROM heuristics_overrides;"
    );
  }
}

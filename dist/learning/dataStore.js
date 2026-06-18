"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStore = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * SQLite-backed store for detections, corrections, and learned overrides.
 * All writes are synchronous (better-sqlite3) for simplicity.
 */
class DataStore {
    db = null;
    dbPath;
    constructor(learningDataDir) {
        fs.mkdirSync(learningDataDir, { recursive: true });
        this.dbPath = path.join(learningDataDir, "agent.db");
    }
    open() {
        this.db = new better_sqlite3_1.default(this.dbPath);
        this.db.pragma("journal_mode = WAL");
        this.migrate();
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    get conn() {
        if (!this.db)
            throw new Error("DataStore not open. Call open() first.");
        return this.db;
    }
    migrate() {
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
    insertDetection(row) {
        const stmt = this.conn.prepare(`
      INSERT INTO detections
        (input_file, page_index, cluster_id, recognized_text,
         derived_section, derived_rows, derived_seats, derived_secnam,
         derived_type, section_confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(row.inputFile, row.pageIndex, row.clusterId, row.recognizedText, row.derivedSection, row.derivedRows, row.derivedSeats, row.derivedSecnam, row.derivedType, row.sectionConfidence);
        return result.lastInsertRowid;
    }
    insertCorrection(row) {
        const stmt = this.conn.prepare(`
      INSERT INTO corrections
        (detection_id, corrected_section, corrected_rows, corrected_seats,
         corrected_secnam, corrected_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        stmt.run(row.detectionId, row.correctedSection, row.correctedRows, row.correctedSeats, row.correctedSecnam, row.correctedType);
    }
    upsertHeuristicsOverride(prefix, secnam, type) {
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
    getAllHeuristicsOverrides() {
        return this.conn
            .prepare(`SELECT section_id_prefix AS section_id_prefix,
                secnam,
                type,
                confirm_count
         FROM heuristics_overrides ORDER BY confirm_count DESC`)
            .all();
    }
    getRecentDetections(limit = 200) {
        return this.conn
            .prepare(`SELECT input_file        AS inputFile,
                page_index        AS pageIndex,
                cluster_id        AS clusterId,
                recognized_text   AS recognizedText,
                derived_section   AS derivedSection,
                derived_rows      AS derivedRows,
                derived_seats     AS derivedSeats,
                derived_secnam    AS derivedSecnam,
                derived_type      AS derivedType,
                section_confidence AS sectionConfidence
         FROM detections ORDER BY id DESC LIMIT ?`)
            .all(limit);
    }
    getCorrectionCount() {
        const row = this.conn
            .prepare("SELECT COUNT(*) as cnt FROM corrections")
            .get();
        return row.cnt;
    }
    /** Destructive — clears all tables */
    reset() {
        this.conn.exec("DELETE FROM corrections; DELETE FROM detections; DELETE FROM heuristics_overrides;");
    }
}
exports.DataStore = DataStore;
//# sourceMappingURL=dataStore.js.map
import type { SectionCandidate } from "./sectionExtractor";
import {
  deriveType,
  deriveSecnam,
  type HeuristicsOverride,
  type SectionType,
} from "./heuristics";

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

// Tiered regexes for section ID extraction (most specific → least)
const SECTION_ID_RE_ALPHANUM = /\b([A-Z]{1,3}\d{1,3}|\d{1,3}[A-Z]{0,2})\b/gi;
const SECTION_ID_RE_COLOR =
  /\b(PINK|RED|GREEN|YELLOW|CYAN|BLUE|ORANGE|PURPLE|GOLD|SILVER|WHITE|BLACK)\b/gi;
const SECTION_ID_RE_ALPHA = /\b([A-Z]{2,4})\b/gi;
const SECTION_ID_RE_NUM = /\b(\d{1,3})\b/gi;

/** Words to ignore when matching standalone alpha section IDs */
const STOP_WORDS = new Set([
  "AN", "THE", "IN", "OF", "TO", "AT", "BY", "ON", "OR", "DO", "GO",
  "ROW", "SEAT", "SEC", "AND", "FOR", "NOT", "BUT", "NOR", "SO", "YET",
]);

const ROW_RE = /\b(ROW\s*[A-Z0-9]+|[A-Z]{1,2})\b/gi;
const SEAT_RE = /\b(\d{1,3}[A-Z]?)\b/gi;

function uniqueOrdered(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Extract the best section ID candidate from combined text using a
 * tiered fallback chain (most specific patterns first).
 * Returns [sectionId, confidenceScore].
 */
function extractSectionId(
  combinedText: string,
  clusterId: number
): [string, number] {
  // Tier 1: alphanumeric combos like "SEC101", "2A" (highest specificity)
  const alphanumMatches = [...combinedText.matchAll(SECTION_ID_RE_ALPHANUM)].map(
    (m) => m[0].toUpperCase()
  );
  if (alphanumMatches.length > 0) return [alphanumMatches[0], 1.0];

  // Tier 2: color names used as section identifiers on colored venue maps
  const colorMatches = [...combinedText.matchAll(SECTION_ID_RE_COLOR)].map(
    (m) => m[0].toUpperCase()
  );
  if (colorMatches.length > 0) return [colorMatches[0], 0.85];

  // Tier 3: multi-letter standalone alpha like "GA", "VIP", "ORCH"
  const alphaMatches = [...combinedText.matchAll(SECTION_ID_RE_ALPHA)]
    .map((m) => m[0].toUpperCase())
    .filter((m) => !STOP_WORDS.has(m));
  if (alphaMatches.length > 0) return [alphaMatches[0], 0.65];

  // Tier 4: standalone numbers like "101", "5"
  const numMatches = [...combinedText.matchAll(SECTION_ID_RE_NUM)].map(
    (m) => m[0]
  );
  if (numMatches.length > 0) return [numMatches[0], 0.5];

  return [`UNKNOWN_${clusterId}`, 0.0];
}

/**
 * Extract row names from combined text, excluding matches that look
 * like seat numbers (purely numeric).
 */
function extractRows(combinedText: string): [string[], number] {
  const matches = uniqueOrdered(
    [...combinedText.matchAll(ROW_RE)]
      .map((m) => m[0].replace(/\s+/g, "").toUpperCase())
      .filter((v) => !/^\d+$/.test(v)) // exclude purely numeric matches
  );

  if (matches.length === 0) return [[], 0.0];

  // Check if single-letter matches form a consecutive alphabetic sequence
  // (e.g. A, B, C, D) — a strong signal these are genuine row labels
  const singleLetters = matches
    .filter((m) => /^[A-Z]$/.test(m))
    .sort();
  const isConsecutive =
    singleLetters.length >= 2 &&
    singleLetters.every(
      (letter, i) =>
        i === 0 ||
        letter.charCodeAt(0) === singleLetters[i - 1].charCodeAt(0) + 1
    );

  if (isConsecutive) {
    // Consecutive single-letter rows are highly reliable
    return [matches, Math.min(1.0, 0.4 + matches.length * 0.08)];
  }

  // Standard scoring: confidence proportional to count
  const conf = Math.min(1.0, matches.length / 5);
  return [matches, conf];
}

/**
 * Extract seat numbers/identifiers from combined text.
 */
function extractSeats(combinedText: string): [string[], number] {
  const matches = uniqueOrdered(
    [...combinedText.matchAll(SEAT_RE)].map((m) => m[0].toUpperCase())
  );
  const conf = matches.length > 0 ? Math.min(1.0, matches.length / 10) : 0.0;
  return [matches, conf];
}

/**
 * Compute the section-level rolled-up confidence score.
 */
function rollupConfidence(
  detectionMean: number,
  recognitionMean: number,
  fieldConf: FieldConfidences
): number {
  return (
    0.3 * detectionMean +
    0.3 * recognitionMean +
    0.2 * fieldConf.sectionId +
    0.1 * fieldConf.rows +
    0.1 * fieldConf.type
  );
}

/**
 * Derive all AVAIL CSV fields from a SectionCandidate.
 */
export function deriveFields(
  candidate: SectionCandidate,
  learnedOverrides: HeuristicsOverride[] = []
): SectionRecord {
  const warnings: string[] = [];
  const { combinedText, regions, clusterId } = candidate;

  // Per-region scores
  const detectionMean =
    regions.reduce((s, r) => s + r.detectionScore, 0) / regions.length;
  const recognitionMean =
    regions.reduce((s, r) => s + r.recognitionConfidence, 0) / regions.length;

  const [sectionId, sectionIdConf] = extractSectionId(combinedText, clusterId);
  if (sectionIdConf === 0) {
    warnings.push(`section_id not detected — using fallback "${sectionId}"`);
  }

  const [rows, rowsConf] = extractRows(combinedText);
  if (rows.length === 0) warnings.push("no row labels detected");

  const [seats, seatsConf] = extractSeats(combinedText);
  if (seats.length === 0) warnings.push("no seat numbers detected");

  const capacity = rows.length > 0 && seats.length > 0
    ? rows.length * seats.length
    : seats.length;
  const capacityConf = capacity > 0 ? 0.8 : 0.0;
  if (capacity === 0) warnings.push("capacity defaulted to 0");

  const hasNumericSeats = seats.some((s) => /^\d+$/.test(s));
  const [sectionType, typeConf] = deriveType(
    combinedText,
    sectionId,
    hasNumericSeats,
    learnedOverrides
  );
  const [secnam, secnamConf] = deriveSecnam(
    combinedText,
    sectionId,
    sectionType,
    learnedOverrides
  );

  const fieldConf: FieldConfidences = {
    sectionId: sectionIdConf,
    rows: rowsConf,
    seats: seatsConf,
    capacity: capacityConf,
    secnam: secnamConf,
    type: typeConf,
  };

  const sectionConfidence = rollupConfidence(detectionMean, recognitionMean, fieldConf);

  return {
    section: sectionId,
    rows,
    seats,
    capacity,
    secnam,
    type: sectionType,
    sectionConfidence,
    fieldConfidences: fieldConf,
    warnings,
  };
}

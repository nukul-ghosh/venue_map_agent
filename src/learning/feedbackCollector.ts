import type { SectionRecord } from "../extraction/fieldDeriver";
import type { DataStore } from "./dataStore";
import type { HeuristicsLearner } from "./heuristicsLearner";
import type { SectionType } from "../extraction/heuristics";
import { createLogger } from "../utils/logger";

const logger = createLogger("FeedbackCollector");

/**
 * Interactive CLI session that walks the user through each detected section,
 * lets them accept or correct the derived fields, and stores the results.
 */
export class FeedbackCollector {
  constructor(
    private readonly dataStore: DataStore,
    private readonly learner: HeuristicsLearner
  ) {}

  async review(sections: SectionRecord[]): Promise<void> {
    // Dynamic import so enquirer is only loaded when --review is used
    const { default: enquirer } = await import("enquirer");

    logger.info(
      `\nReview mode: ${sections.length} section(s) detected. ` +
        "Press Enter to accept or type corrections.\n"
    );

    // We need the most recent detection IDs from the DB for linking corrections.
    // They were inserted in the same order as sections; fetch the last N.
    const recentDetections = this.dataStore.getRecentDetections(sections.length);
    // Reverse: getRecentDetections returns newest first
    const detectionIds = recentDetections.map((d) => 0).reverse(); // placeholder
    // Note: a production version would return IDs from insertDetection() calls in agent.ts

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      console.log(`\n─── Section ${i + 1} / ${sections.length} ───`);
      console.log(`  section : ${section.section}`);
      console.log(`  rows    : ${section.rows.join(", ") || "(none)"}`);
      console.log(`  seats   : ${section.seats.join(", ") || "(none)"}`);
      console.log(`  capacity: ${section.capacity}`);
      console.log(`  secnam  : ${section.secnam}`);
      console.log(`  type    : ${section.type} (${section.type === 1 ? "GA" : "Reserved"})`);
      console.log(`  confidence: ${(section.sectionConfidence * 100).toFixed(1)}%`);
      if (section.warnings.length > 0) {
        console.log(`  warnings: ${section.warnings.join("; ")}`);
      }

      const { action } = await (enquirer as any).prompt({
        type: "select",
        name: "action",
        message: "Action?",
        choices: ["Accept", "Edit fields", "Skip"],
      });

      if (action === "Skip") continue;

      if (action === "Accept") {
        // Record acceptance so heuristics can learn from it
        this.learner.recordCorrection(
          section.section,
          section.secnam,
          section.type
        );
        continue;
      }

      // Edit mode
      const { correctedSection } = await (enquirer as any).prompt({
        type: "input",
        name: "correctedSection",
        message: "Section ID",
        initial: section.section,
      });

      const { correctedSecnam } = await (enquirer as any).prompt({
        type: "input",
        name: "correctedSecnam",
        message: "secnam",
        initial: section.secnam,
      });

      const { correctedTypeStr } = await (enquirer as any).prompt({
        type: "select",
        name: "correctedTypeStr",
        message: "type",
        choices: [
          { name: "0", message: "0 — Reserved/Numbered" },
          { name: "1", message: "1 — General Admission" },
        ],
        initial: String(section.type),
      });

      const correctedType = parseInt(correctedTypeStr, 10) as SectionType;

      // Mutate the in-memory record so downstream code sees the correction
      section.section = correctedSection || section.section;
      section.secnam = correctedSecnam || section.secnam;
      section.type = correctedType;

      this.learner.recordCorrection(
        correctedSection || section.section,
        correctedSecnam || section.secnam,
        correctedType
      );

      logger.info(`Saved correction for section "${section.section}"`);
    }

    logger.info("\nReview complete. Learned overrides updated.");
  }
}

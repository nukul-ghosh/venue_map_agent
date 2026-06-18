import type { SectionRecord } from "../extraction/fieldDeriver";
import type { DataStore } from "./dataStore";
import type { HeuristicsLearner } from "./heuristicsLearner";
/**
 * Interactive CLI session that walks the user through each detected section,
 * lets them accept or correct the derived fields, and stores the results.
 */
export declare class FeedbackCollector {
    private readonly dataStore;
    private readonly learner;
    constructor(dataStore: DataStore, learner: HeuristicsLearner);
    review(sections: SectionRecord[]): Promise<void>;
}
//# sourceMappingURL=feedbackCollector.d.ts.map
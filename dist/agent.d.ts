import { type SectionRecord } from "./extraction/fieldDeriver";
export interface AgentOptions {
    input: string;
    outputDir: string;
    modelDir: string;
    minConfidence: number;
    detectionThreshold: number;
    dpi: number;
    maxImageDim: number;
    debug: boolean;
    visualize: boolean;
    learningDataDir: string;
}
export interface AgentResult {
    csvPath: string | null;
    confidencePath: string;
    imageReadabilityScore: number;
    sections: SectionRecord[];
    /** Exit code: 0 = success, 1 = below threshold */
    exitCode: 0 | 1;
}
/**
 * Run the full venue map → AVAIL CSV pipeline.
 */
export declare function runAgent(options: AgentOptions): Promise<AgentResult>;
//# sourceMappingURL=agent.d.ts.map
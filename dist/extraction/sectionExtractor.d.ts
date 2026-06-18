import type { DetectedRegion } from "../detection/regionModels";
export interface SectionCandidate {
    clusterId: number;
    regions: DetectedRegion[];
    /** All recognised text from member regions concatenated with a space */
    combinedText: string;
    /** Centroid of the cluster in normalised [0,1] coordinates */
    centroidX: number;
    centroidY: number;
}
/**
 * Group detected regions into section candidates using DBSCAN density clustering
 * on normalised centroid coordinates.
 *
 * eps: neighbourhood radius in normalised [0,1] coordinate space (default 0.05)
 * minPts: minimum points to form a core point (default 1, so single labels form clusters)
 */
export declare function extractSections(regions: DetectedRegion[], eps?: number, minPts?: number): SectionCandidate[];
//# sourceMappingURL=sectionExtractor.d.ts.map
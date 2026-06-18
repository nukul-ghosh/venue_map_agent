import { DBSCAN } from "density-clustering";
import type { DetectedRegion } from "../detection/regionModels";
import { centroid } from "../detection/regionModels";

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
export function extractSections(
  regions: DetectedRegion[],
  eps: number = 0.07,
  minPts: number = 1
): SectionCandidate[] {
  if (regions.length === 0) return [];

  // Only cluster regions that have recognised text, filtering out
  // single-character noise (likely artifacts from colored backgrounds)
  const textRegions = regions.filter((r) => {
    const text = r.recognizedText.trim();
    if (text.length === 0) return false;
    if (text.length === 1 && r.recognitionConfidence < 0.6) return false;
    return true;
  });
  if (textRegions.length === 0) return [];

  const points = textRegions.map((r) => centroid(r.bbox));

  const dbscan = new DBSCAN();
  const clusters: number[][] = dbscan.run(points, eps, minPts);

  const candidates: SectionCandidate[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const memberIndices = clusters[i];
    const memberRegions = memberIndices.map((idx) => textRegions[idx]);

    // Sort members left-to-right (ascending x centroid) for natural reading order
    memberRegions.sort((a, b) => centroid(a.bbox)[0] - centroid(b.bbox)[0]);

    const combinedText = memberRegions
      .map((r) => r.recognizedText.trim())
      .filter(Boolean)
      .join(" ");

    const cxSum = memberRegions.reduce((acc, r) => acc + centroid(r.bbox)[0], 0);
    const cySum = memberRegions.reduce((acc, r) => acc + centroid(r.bbox)[1], 0);

    candidates.push({
      clusterId: i,
      regions: memberRegions,
      combinedText,
      centroidX: cxSum / memberRegions.length,
      centroidY: cySum / memberRegions.length,
    });
  }

  // Sort clusters top-to-bottom then left-to-right (reading order)
  candidates.sort((a, b) =>
    a.centroidY !== b.centroidY ? a.centroidY - b.centroidY : a.centroidX - b.centroidX
  );

  return candidates;
}

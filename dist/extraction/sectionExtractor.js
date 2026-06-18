"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSections = extractSections;
const density_clustering_1 = require("density-clustering");
const regionModels_1 = require("../detection/regionModels");
/**
 * Group detected regions into section candidates using DBSCAN density clustering
 * on normalised centroid coordinates.
 *
 * eps: neighbourhood radius in normalised [0,1] coordinate space (default 0.05)
 * minPts: minimum points to form a core point (default 1, so single labels form clusters)
 */
function extractSections(regions, eps = 0.07, minPts = 1) {
    if (regions.length === 0)
        return [];
    // Only cluster regions that have recognised text, filtering out
    // single-character noise (likely artifacts from colored backgrounds)
    const textRegions = regions.filter((r) => {
        const text = r.recognizedText.trim();
        if (text.length === 0)
            return false;
        if (text.length === 1 && r.recognitionConfidence < 0.6)
            return false;
        return true;
    });
    if (textRegions.length === 0)
        return [];
    const points = textRegions.map((r) => (0, regionModels_1.centroid)(r.bbox));
    const dbscan = new density_clustering_1.DBSCAN();
    const clusters = dbscan.run(points, eps, minPts);
    const candidates = [];
    for (let i = 0; i < clusters.length; i++) {
        const memberIndices = clusters[i];
        const memberRegions = memberIndices.map((idx) => textRegions[idx]);
        // Sort members left-to-right (ascending x centroid) for natural reading order
        memberRegions.sort((a, b) => (0, regionModels_1.centroid)(a.bbox)[0] - (0, regionModels_1.centroid)(b.bbox)[0]);
        const combinedText = memberRegions
            .map((r) => r.recognizedText.trim())
            .filter(Boolean)
            .join(" ");
        const cxSum = memberRegions.reduce((acc, r) => acc + (0, regionModels_1.centroid)(r.bbox)[0], 0);
        const cySum = memberRegions.reduce((acc, r) => acc + (0, regionModels_1.centroid)(r.bbox)[1], 0);
        candidates.push({
            clusterId: i,
            regions: memberRegions,
            combinedText,
            centroidX: cxSum / memberRegions.length,
            centroidY: cySum / memberRegions.length,
        });
    }
    // Sort clusters top-to-bottom then left-to-right (reading order)
    candidates.sort((a, b) => a.centroidY !== b.centroidY ? a.centroidY - b.centroidY : a.centroidX - b.centroidX);
    return candidates;
}
//# sourceMappingURL=sectionExtractor.js.map
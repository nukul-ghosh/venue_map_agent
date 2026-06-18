"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.centroid = centroid;
/** Centroid of a bounding box in normalised coordinates */
function centroid(bbox) {
    return [(bbox.x1 + bbox.x2) / 2, (bbox.y1 + bbox.y2) / 2];
}
//# sourceMappingURL=regionModels.js.map
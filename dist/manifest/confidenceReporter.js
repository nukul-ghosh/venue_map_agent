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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfidenceReport = generateConfidenceReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function statusFromScore(score) {
    if (score >= 0.6)
        return "OK";
    if (score >= 0.4)
        return "PARTIAL";
    return "LOW";
}
/**
 * Write a companion JSON confidence report alongside the AVAIL CSV.
 * Returns the path of the written file.
 */
function generateConfidenceReport(records, inputFile, outputDir, inputStem) {
    fs.mkdirSync(outputDir, { recursive: true });
    const sectionEntries = records.map((r) => ({
        section: r.section,
        sectionConfidence: parseFloat(r.sectionConfidence.toFixed(4)),
        status: statusFromScore(r.sectionConfidence),
        fieldConfidences: r.fieldConfidences,
        warnings: r.warnings,
    }));
    const imageReadabilityScore = records.length > 0
        ? records.reduce((acc, r) => acc + r.sectionConfidence, 0) / records.length
        : 0;
    const report = {
        inputFile,
        processedAt: new Date().toISOString(),
        imageReadabilityScore: parseFloat(imageReadabilityScore.toFixed(4)),
        overallStatus: statusFromScore(imageReadabilityScore),
        sections: sectionEntries,
    };
    const outPath = path.join(outputDir, `${inputStem}_confidence.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
    return outPath;
}
//# sourceMappingURL=confidenceReporter.js.map
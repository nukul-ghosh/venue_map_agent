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
exports.generateAvailCsv = generateAvailCsv;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sync_1 = require("csv-stringify/sync");
/**
 * Write an AVAIL CSV file from a list of SectionRecords.
 *
 * Output format (matches MS_Sample_CSV_US.csv):
 *   section,rows,seats,capacity,secnam,type
 *   SEC1,"A,B,C,D","1,2,3,4,5,6,7,8,9,10",40,P1,0
 */
function generateAvailCsv(records, outputDir, inputStem) {
    fs.mkdirSync(outputDir, { recursive: true });
    const rows = records.map((r) => [
        r.section,
        r.rows.join(","),
        r.seats.join(","),
        r.capacity,
        r.secnam,
        r.type,
    ]);
    const csv = (0, sync_1.stringify)(rows, {
        header: true,
        columns: ["section", "rows", "seats", "capacity", "secnam", "type"],
        // Only quote cells that contain commas or special characters, not the headers
        quoted: false,
        quoted_string: false,
        cast: {
            string: (value) => ({
                value,
                // Quote only if the value contains a comma (i.e. the multi-value fields)
                quoted: value.includes(","),
            }),
        },
    });
    const outPath = path.join(outputDir, `${inputStem}_avail.csv`);
    fs.writeFileSync(outPath, csv, "utf-8");
    return outPath;
}
//# sourceMappingURL=csvGenerator.js.map
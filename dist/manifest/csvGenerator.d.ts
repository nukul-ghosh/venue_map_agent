import type { SectionRecord } from "../extraction/fieldDeriver";
/**
 * Write an AVAIL CSV file from a list of SectionRecords.
 *
 * Output format (matches MS_Sample_CSV_US.csv):
 *   section,rows,seats,capacity,secnam,type
 *   SEC1,"A,B,C,D","1,2,3,4,5,6,7,8,9,10",40,P1,0
 */
export declare function generateAvailCsv(records: SectionRecord[], outputDir: string, inputStem: string): string;
//# sourceMappingURL=csvGenerator.d.ts.map
import * as fs from "fs";
import * as path from "path";
import { stringify } from "csv-stringify/sync";
import type { SectionRecord } from "../extraction/fieldDeriver";

/**
 * Write an AVAIL CSV file from a list of SectionRecords.
 *
 * Output format (matches MS_Sample_CSV_US.csv):
 *   section,rows,seats,capacity,secnam,type
 *   SEC1,"A,B,C,D","1,2,3,4,5,6,7,8,9,10",40,P1,0
 */
export function generateAvailCsv(
  records: SectionRecord[],
  outputDir: string,
  inputStem: string
): string {
  fs.mkdirSync(outputDir, { recursive: true });

  const rows: Array<[string, string, string, number, string, number]> = records.map(
    (r) => [
      r.section,
      r.rows.join(","),
      r.seats.join(","),
      r.capacity,
      r.secnam,
      r.type,
    ]
  );

  const csv = stringify(rows, {
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

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import type { DetectedRegion } from "../detection/regionModels";
import type { PreparedImage } from "../preprocessing/imagePrep";

/**
 * Draw bounding boxes onto the original image and save as a debug PNG.
 * Each box is coloured by detection score (green = high, red = low).
 */
export async function saveDebugImage(
  prepared: PreparedImage,
  regions: DetectedRegion[],
  outputDir: string,
  stem: string
): Promise<string> {
  fs.mkdirSync(outputDir, { recursive: true });

  const { originalBuffer, originalWidth: w, originalHeight: h, scaleX, scaleY } = prepared;

  // Build an SVG overlay with rectangles for each detected region
  const rects = regions
    .map((r) => {
      const { x1, y1, x2, y2 } = r.bbox;
      // Convert normalised coords → original image pixels
      const rx = Math.floor(x1 * prepared.width * scaleX);
      const ry = Math.floor(y1 * prepared.height * scaleY);
      const rw = Math.max(1, Math.ceil((x2 - x1) * prepared.width * scaleX));
      const rh = Math.max(1, Math.ceil((y2 - y1) * prepared.height * scaleY));

      // Colour: green for high confidence, red for low
      const score = r.detectionScore;
      const red = Math.round((1 - score) * 255);
      const green = Math.round(score * 255);
      const colour = `rgb(${red},${green},0)`;

      const label = r.recognizedText
        ? r.recognizedText.slice(0, 20).replace(/[<>&"]/g, "")
        : "";

      return `
        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}"
              fill="none" stroke="${colour}" stroke-width="2"/>
        <text x="${rx + 2}" y="${Math.max(ry - 2, 10)}"
              font-size="12" fill="${colour}">${label}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;

  const outPath = path.join(outputDir, `${stem}_debug.png`);

  await sharp(originalBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outPath);

  return outPath;
}

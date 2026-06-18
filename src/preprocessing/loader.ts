import * as fs from "fs";
import * as path from "path";
import { fromPath, fromBuffer } from "pdf2pic";
import sharp from "sharp";

export type SupportedFormat = "png" | "jpg" | "jpeg" | "pdf";

export interface LoadedImage {
  buffer: Buffer;
  width: number;
  height: number;
  pageIndex: number;
  sourcePath: string;
}

const SUPPORTED_FORMATS: SupportedFormat[] = ["png", "jpg", "jpeg", "pdf"];

function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(".", "");
}

function assertSupportedFormat(ext: string, filePath: string): void {
  if (!SUPPORTED_FORMATS.includes(ext as SupportedFormat)) {
    throw new Error(
      `Unsupported file format ".${ext}" for "${filePath}". Supported formats: ${SUPPORTED_FORMATS.join(", ")}`
    );
  }
}

async function loadImageFile(filePath: string): Promise<LoadedImage[]> {
  const buffer = fs.readFileSync(filePath);
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions from "${filePath}"`);
  }
  return [
    {
      buffer,
      width: metadata.width,
      height: metadata.height,
      pageIndex: 0,
      sourcePath: filePath,
    },
  ];
}

async function loadPdfFile(
  filePath: string,
  dpi: number
): Promise<LoadedImage[]> {
  const convert = fromPath(filePath, {
    density: dpi,
    saveFilename: "page",
    savePath: "/tmp/venue_map_agent_pdf_pages",
    format: "png",
    width: undefined,
    height: undefined,
  });

  // Get page count by attempting conversion of page 1 and catching bulk
  // pdf2pic does not expose page count directly; we convert all pages via bulk()
  const results = await convert.bulk(-1, { responseType: "buffer" });

  const images: LoadedImage[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result.buffer) {
      throw new Error(`PDF page ${i + 1} conversion produced no buffer`);
    }
    const buf = result.buffer as Buffer;
    const metadata = await sharp(buf).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Could not read dimensions from PDF page ${i + 1}`);
    }
    images.push({
      buffer: buf,
      width: metadata.width,
      height: metadata.height,
      pageIndex: i,
      sourcePath: filePath,
    });
  }
  return images;
}

/**
 * Loads a venue map file (PNG, JPEG, JPG, or PDF) and returns
 * one LoadedImage per page/frame.
 */
export async function loadVenueMap(
  filePath: string,
  dpi: number = 300
): Promise<LoadedImage[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: "${filePath}"`);
  }

  const ext = getExtension(filePath);
  assertSupportedFormat(ext, filePath);

  if (ext === "pdf") {
    return loadPdfFile(filePath, dpi);
  }
  return loadImageFile(filePath);
}

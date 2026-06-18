import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import { loadVenueMap } from "../src/preprocessing/loader";
import { prepareImage } from "../src/preprocessing/imagePrep";

describe("preprocessing/loader", () => {
  it("throws for a missing file", async () => {
    await expect(loadVenueMap("/nonexistent/file.png")).rejects.toThrow(
      "File not found"
    );
  });

  it("throws for an unsupported extension", async () => {
    const tmpFile = path.join("/tmp", "test.bmp");
    fs.writeFileSync(tmpFile, "dummy");
    await expect(loadVenueMap(tmpFile)).rejects.toThrow("Unsupported file format");
    fs.unlinkSync(tmpFile);
  });
});

describe("preprocessing/imagePrep", () => {
  it("returns float32 data in [0,1] for a simple PNG", async () => {
    // Create a 10×10 white PNG using sharp
    const sharp = (await import("sharp")).default;
    const buffer = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer();

    const loaded = {
      buffer,
      width: 10,
      height: 10,
      pageIndex: 0,
      sourcePath: "synthetic",
    };

    const prepared = await prepareImage(loaded, 2048);
    expect(prepared.width).toBe(10);
    expect(prepared.height).toBe(10);
    expect(prepared.data.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it("resizes images larger than maxDim", async () => {
    const sharp = (await import("sharp")).default;
    const buffer = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 128, g: 128, b: 128 } },
    })
      .png()
      .toBuffer();

    const loaded = {
      buffer,
      width: 3000,
      height: 2000,
      pageIndex: 0,
      sourcePath: "synthetic",
    };

    const prepared = await prepareImage(loaded, 1024);
    expect(prepared.width).toBeLessThanOrEqual(1024);
    expect(prepared.height).toBeLessThanOrEqual(1024);
  });
});

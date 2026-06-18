import Tesseract from "tesseract.js";

export interface RecognitionResult {
  text: string;
  /** Normalised confidence in [0, 1] */
  confidence: number;
}

/**
 * Wraps a Tesseract.js worker for single-crop text recognition.
 * Call load() once, then recognize() for each crop, then terminate() when done.
 */
export class TextRecognizer {
  private worker: Tesseract.Worker | null = null;

  async load(): Promise<void> {
    this.worker = await Tesseract.createWorker("eng", 1, {
      // Suppress Tesseract's own console output; we use our logger instead
      logger: () => undefined,
    });

    // PSM 6 = treat the image as a single uniform block of text.
    // Handles both single-line labels ("SEC101") and multi-line crops
    // (section name + row labels). Whitelist limits to characters found
    // on venue maps, preventing symbol hallucinations from colored backgrounds.
    await this.worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -/",
      preserve_interword_spaces: "1",
    });
  }

  /**
   * Recognise text in a single image crop (Buffer, PNG or JPEG).
   * Returns the trimmed text and a confidence score in [0, 1].
   */
  async recognize(cropBuffer: Buffer): Promise<RecognitionResult> {
    if (!this.worker) {
      throw new Error("TextRecognizer not loaded. Call load() first.");
    }

    const result = await this.worker.recognize(cropBuffer);
    const { text, confidence } = result.data;

    return {
      text: text.trim(),
      // Tesseract confidence is 0–100; normalise to [0, 1]
      confidence: confidence / 100,
    };
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export interface RecognitionResult {
    text: string;
    /** Normalised confidence in [0, 1] */
    confidence: number;
}
/**
 * Wraps a Tesseract.js worker for single-crop text recognition.
 * Call load() once, then recognize() for each crop, then terminate() when done.
 */
export declare class TextRecognizer {
    private worker;
    load(): Promise<void>;
    /**
     * Recognise text in a single image crop (Buffer, PNG or JPEG).
     * Returns the trimmed text and a confidence score in [0, 1].
     */
    recognize(cropBuffer: Buffer): Promise<RecognitionResult>;
    terminate(): Promise<void>;
}
//# sourceMappingURL=textRecognizer.d.ts.map
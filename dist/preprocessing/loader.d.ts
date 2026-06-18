export type SupportedFormat = "png" | "jpg" | "jpeg" | "pdf";
export interface LoadedImage {
    buffer: Buffer;
    width: number;
    height: number;
    pageIndex: number;
    sourcePath: string;
}
/**
 * Loads a venue map file (PNG, JPEG, JPG, or PDF) and returns
 * one LoadedImage per page/frame.
 */
export declare function loadVenueMap(filePath: string, dpi?: number): Promise<LoadedImage[]>;
//# sourceMappingURL=loader.d.ts.map
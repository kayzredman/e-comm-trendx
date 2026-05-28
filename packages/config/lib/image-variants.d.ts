/**
 * Canonical product image variants.
 *
 * Every uploaded product image is normalized into this fixed set of sizes
 * at upload time (by `sharp` in apps/api/src/images/images.service.ts).
 * The UI references variants by name (`'grid'`, `'detail'`, ...) — never by
 * hard-coded dimensions. Change the spec here, re-run the reprocess script,
 * and every surface picks up the new sizes automatically.
 *
 * Aspect ratio is fixed to square ('cover' crop) for catalog consistency.
 */
export declare const IMAGE_VARIANTS: {
    readonly thumb: {
        readonly width: 200;
        readonly height: 200;
        readonly quality: 75;
        readonly fit: "cover";
    };
    readonly grid: {
        readonly width: 480;
        readonly height: 480;
        readonly quality: 80;
        readonly fit: "cover";
    };
    readonly detail: {
        readonly width: 1000;
        readonly height: 1000;
        readonly quality: 85;
        readonly fit: "cover";
    };
    readonly zoom: {
        readonly width: 2000;
        readonly height: 2000;
        readonly quality: 90;
        readonly fit: "cover";
    };
};
export type ImageVariant = keyof typeof IMAGE_VARIANTS;
export declare const IMAGE_VARIANT_NAMES: ImageVariant[];
/** Browser-side accepted MIME types for upload. */
export declare const ALLOWED_UPLOAD_MIME: readonly ["image/jpeg", "image/png", "image/webp"];
export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME)[number];
//# sourceMappingURL=image-variants.d.ts.map
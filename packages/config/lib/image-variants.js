"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_UPLOAD_MIME = exports.IMAGE_VARIANT_NAMES = exports.IMAGE_VARIANTS = void 0;
exports.IMAGE_VARIANTS = {
    thumb: { width: 200, height: 200, quality: 75, fit: 'cover' },
    grid: { width: 480, height: 480, quality: 80, fit: 'cover' },
    detail: { width: 1000, height: 1000, quality: 85, fit: 'cover' },
    zoom: { width: 2000, height: 2000, quality: 90, fit: 'cover' },
};
exports.IMAGE_VARIANT_NAMES = Object.keys(exports.IMAGE_VARIANTS);
/** Browser-side accepted MIME types for upload. */
exports.ALLOWED_UPLOAD_MIME = ['image/jpeg', 'image/png', 'image/webp'];
//# sourceMappingURL=image-variants.js.map
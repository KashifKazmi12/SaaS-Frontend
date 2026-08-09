export interface UploadConfig {
  storage: "local" | "s3";
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
  publicBaseUrl: string;
  s3PublicUrlPrefix: string;
}

export interface ProductImage {
  path: string;
  isFeatured?: boolean;
}

export function normalizeMediaPath(value: string): string {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.replace(/^\/+/, "").replace(/\\/g, "/");
}

/**
 * Resolve a stored relative path or full URL for display.
 * Supports legacy full URLs and both local (/media) and S3/CDN bases.
 */
export function resolveMediaUrl(path: string): string {
  const normalized = normalizeMediaPath(path);
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const envBase = import.meta.env.VITE_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (envBase) {
    return `${envBase}/${normalized}`;
  }

  const s3Prefix = import.meta.env.VITE_S3_PUBLIC_URL_PREFIX?.replace(/\/$/, "");
  if (s3Prefix) {
    return `${s3Prefix}/${normalized}`;
  }

  return `/media/${normalized}`;
}

export function normalizeProductImages(
  images: ProductImage[] | undefined,
  legacyImageUrl?: string
): ProductImage[] {
  let rows: ProductImage[] = [];

  if (Array.isArray(images)) {
    rows = images
      .map((item) => {
        const path = normalizeMediaPath(item?.path || "");
        if (!path) return null;
        return { path, isFeatured: Boolean(item.isFeatured) };
      })
      .filter((item) => item !== null);
  }

  if (rows.length === 0 && legacyImageUrl?.trim()) {
    const path = normalizeMediaPath(legacyImageUrl);
    if (path) {
      rows = [{ path, isFeatured: true }];
    }
  }

  if (rows.length === 0) return [];

  const featuredIndex = rows.findIndex((item) => item.isFeatured);
  return rows.map((item, index) => ({
    path: item.path,
    isFeatured: featuredIndex === -1 ? index === 0 : index === featuredIndex,
  }));
}

export function getFeaturedImagePath(images: ProductImage[]): string {
  const featured = images.find((item) => item.isFeatured);
  return featured?.path || images[0]?.path || "";
}

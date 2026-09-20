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

/** Filled from GET /api/uploads/config so UI matches Backend UPLOAD_STORAGE / S3 settings. */
let runtimeS3Prefix = "";
let runtimePublicBaseUrl = "";

export function applyUploadMediaConfig(config: Partial<UploadConfig> | null | undefined) {
  runtimeS3Prefix = String(config?.s3PublicUrlPrefix || "")
    .trim()
    .replace(/\/$/, "");
  runtimePublicBaseUrl = String(config?.publicBaseUrl || "")
    .trim()
    .replace(/\/$/, "");
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

  const s3Prefix =
    runtimeS3Prefix ||
    String(import.meta.env.VITE_S3_PUBLIC_URL_PREFIX || "")
      .trim()
      .replace(/\/$/, "");
  if (s3Prefix) {
    return `${s3Prefix}/${normalized}`;
  }

  const envBase = String(import.meta.env.VITE_MEDIA_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const publicBase = runtimePublicBaseUrl || envBase;
  if (publicBase) {
    return `${publicBase}/media/${normalized}`;
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

/** Static asset used when a category has no uploaded image. */
export const DEFAULT_CATEGORY_IMAGE = "/category-default.svg";

export function resolveCategoryImageUrl(imagePath?: string): string {
  const path = normalizeMediaPath(imagePath || "");
  if (!path) return DEFAULT_CATEGORY_IMAGE;
  return resolveMediaUrl(path);
}

/**
 * Cross-origin S3/CDN URLs (especially SVG) need CORS mode so Chrome ORB
 * does not block them in <img>. Same-origin /media paths stay unset.
 */
export function crossOriginForMediaUrl(src: string): "anonymous" | undefined {
  if (/^https?:\/\//i.test(String(src || "").trim())) return "anonymous";
  return undefined;
}

export function isSvgMediaUrl(src: string): boolean {
  const value = String(src || "").trim().split("?")[0].split("#")[0];
  return /\.svg$/i.test(value);
}

/** Strip scripts/handlers so inlined SVG from S3 cannot run JS. */
export function sanitizeSvgMarkup(svg: string): string {
  return String(svg || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

/** Fetch SVG text with CORS (requires S3 CORS). Used to bypass <img> ORB blocks. */
export async function loadSvgMarkup(src: string): Promise<string> {
  const response = await fetch(src, { mode: "cors", credentials: "omit" });
  if (!response.ok) {
    throw new Error(`SVG fetch failed (${response.status})`);
  }
  const text = await response.text();
  if (!/<svg[\s>]/i.test(text)) {
    throw new Error("Response is not SVG markup");
  }
  return sanitizeSvgMarkup(text);
}

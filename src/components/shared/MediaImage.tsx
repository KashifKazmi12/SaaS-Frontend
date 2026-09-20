import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { crossOriginForMediaUrl, isSvgMediaUrl, loadSvgMarkup } from "@/lib/media";

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "crossOrigin"> & {
  src: string;
};

/**
 * Same-origin and raster S3 images use <img>.
 * Cross-origin SVGs are inlined (Chrome ORB often blanks S3 SVGs in <img> even with HTTP 200).
 */
export function MediaImage({ src, alt = "", className, ...imgProps }: MediaImageProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [svgFailed, setSvgFailed] = useState(false);
  const useInlineSvg = Boolean(src) && isSvgMediaUrl(src) && !svgFailed;

  useEffect(() => {
    if (!src || !isSvgMediaUrl(src)) {
      setSvgHtml(null);
      setSvgFailed(false);
      return;
    }

    let cancelled = false;
    setSvgHtml(null);
    setSvgFailed(false);

    loadSvgMarkup(src)
      .then((html) => {
        if (!cancelled) setSvgHtml(html);
      })
      .catch(() => {
        if (!cancelled) {
          setSvgHtml(null);
          setSvgFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (useInlineSvg && svgHtml) {
    return (
      <span
        role="img"
        aria-label={alt || undefined}
        className={cn("inline-flex items-center justify-center overflow-hidden [&_svg]:size-full", className)}
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    );
  }

  if (useInlineSvg && !svgHtml) {
    return <span className={cn("inline-block bg-muted", className)} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt={alt}
      crossOrigin={crossOriginForMediaUrl(src)}
      className={className}
      {...imgProps}
    />
  );
}

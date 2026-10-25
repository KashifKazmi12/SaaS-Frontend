import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { crossOriginForMediaUrl, isSvgMediaUrl, loadSvgMarkup } from "@/lib/media";

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "crossOrigin"> & {
  src: string;
};

/**
 * Same-origin and raster S3 images use <img>.
 * Cross-origin SVGs are inlined (Chrome ORB often blanks S3 SVGs in <img> even with HTTP 200).
 * Failed loads fall back to a no-image avatar instead of the browser broken-image icon.
 */
export function MediaImage({ src, alt = "", className, ...imgProps }: MediaImageProps) {
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [svgFailed, setSvgFailed] = useState(false);
  const [rasterFailed, setRasterFailed] = useState(false);
  const useInlineSvg = Boolean(src) && isSvgMediaUrl(src) && !svgFailed;

  useEffect(() => {
    setRasterFailed(false);
  }, [src]);

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

  if (!src || rasterFailed || (useInlineSvg && svgFailed && !svgHtml)) {
    return (
      <span
        className={cn("inline-flex items-center justify-center bg-muted text-muted-foreground", className)}
        aria-hidden={alt ? undefined : true}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        <ImageIcon className="size-4 opacity-70" />
      </span>
    );
  }

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

  const crossOrigin = crossOriginForMediaUrl(src);

  return (
    <img
      src={src}
      alt={alt}
      {...(crossOrigin ? { crossOrigin } : {})}
      className={className}
      onError={() => setRasterFailed(true)}
      {...imgProps}
    />
  );
}

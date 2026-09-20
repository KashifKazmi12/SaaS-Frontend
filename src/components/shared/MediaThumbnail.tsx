import { cn } from "@/lib/utils";
import { MediaImage } from "./MediaImage";

interface MediaThumbnailProps {
  src: string;
  alt?: string;
  size?: "sm" | "md";
  className?: string;
}

export function MediaThumbnail({
  src,
  alt = "",
  size = "sm",
  className,
}: MediaThumbnailProps) {
  return (
    <MediaImage
      src={src}
      alt={alt}
      className={cn(
        "rounded-md border bg-muted object-cover",
        size === "sm" ? "size-10" : "size-12",
        className
      )}
    />
  );
}

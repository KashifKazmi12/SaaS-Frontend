import { cn } from "@/lib/utils";

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
    <img
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

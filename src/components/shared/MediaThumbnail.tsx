import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaImage } from "./MediaImage";

interface MediaThumbnailProps {
  src?: string | null;
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
  const boxClass = cn(
    "flex items-center justify-center overflow-hidden rounded-md border bg-muted object-cover",
    size === "sm" ? "size-10" : "size-12",
    className
  );

  if (!src) {
    return (
      <div className={boxClass} aria-hidden="true">
        <ImageIcon className="text-muted-foreground size-4 opacity-70" />
      </div>
    );
  }

  return <MediaImage src={src} alt={alt} className={boxClass} />;
}

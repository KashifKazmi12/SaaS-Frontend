import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-5 border-[1.5px]",
  md: "size-8 border-2",
  lg: "size-10 border-2",
} as const;

export function Spinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: keyof typeof SIZE;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-muted border-t-primary",
        SIZE[size],
        className
      )}
    />
  );
}

export function PageLoader({
  fullScreen = false,
  className,
}: {
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen ? "min-h-screen bg-background" : "min-h-[40vh] w-full",
        className
      )}
    >
      <Spinner size="lg" />
    </div>
  );
}

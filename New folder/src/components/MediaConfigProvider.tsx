import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { applyUploadMediaConfig } from "@/lib/media";

/**
 * Loads Backend upload/media URL settings once so resolveMediaUrl uses S3 when enabled.
 */
export function MediaConfigProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getUploadConfig()
      .then((config) => {
        if (!cancelled) applyUploadMediaConfig(config);
      })
      .catch(() => {
        // Fall back to Vite env / local /media
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return children;
}

import { useEffect, useLayoutEffect, useState } from "react";

export function useInsightsSection<T>(
  enabled: boolean,
  requestKey: string,
  fetcher: () => Promise<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    if (enabled) setLoading(true);
  }, [enabled, requestKey]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher is created inline by the caller; requestKey captures its inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, requestKey]);

  return {
    data,
    loading: loading || (data === null && !error),
    error,
  };
}

"use client";

import { useCallback, useEffect, useState } from "react";

export function useAsyncData<T>({ loader, onError }: { loader: () => Promise<T>; onError?: (error: Error) => void }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchData = useCallback(async () => {
    try { setLoading(true); setError(null); setData(await loader()); }
    catch (reason) { const nextError = reason instanceof Error ? reason : new Error(String(reason)); setError(nextError); onError?.(nextError); }
    finally { setLoading(false); }
  }, [loader, onError]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
}

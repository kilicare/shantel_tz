"use client";

import { useEffect, useRef, useState } from "react";

export function useSearch<T>({ minChars = 2, debounceMs = 300, onSearch }: { minChars?: number; debounceMs?: number; onSearch: (query: string) => Promise<T[]> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  useEffect(() => {
    if (query.trim().length < minChars) { setResults([]); setLoading(false); return; }
    const currentRequest = ++request.current;
    const timer = setTimeout(async () => {
      try { setLoading(true); setError(null); const next = await onSearch(query.trim()); if (currentRequest === request.current) setResults(next); }
      catch (reason) { if (currentRequest === request.current) { setError(reason instanceof Error ? reason.message : "Search failed"); setResults([]); } }
      finally { if (currentRequest === request.current) setLoading(false); }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, minChars, debounceMs, onSearch]);
  return { query, setQuery, results, loading, error, clear: () => { setQuery(""); setResults([]); setError(null); } };
}

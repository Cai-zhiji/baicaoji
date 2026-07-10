"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  /** Re-fetch the data */
  refetch: () => void;
  /** Mutate the local cache (optimistic update) */
  mutate: (data: T) => void;
}

/**
 * Lightweight data-fetching hook with loading/error states.
 * Shared across all pages to replace manual fetch + useState + useEffect.
 */
export function useApi<T = unknown>(url: string): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchData = useCallback(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (mountedRef.current) {
          setState({ data: null, loading: false, error: err.message });
        }
      });

    return () => {
      controller.abort();
      mountedRef.current = false;
    };
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    const cleanup = fetchData();
    return () => {
      cleanup?.();
    };
  }, [fetchData]);

  const mutate = useCallback((data: T) => {
    setState({ data, loading: false, error: null });
  }, []);

  return { ...state, refetch: fetchData, mutate };
}

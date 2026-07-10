"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseMutationOptions<T> {
  url: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  /** 成功后的 toast 消息，不传则使用默认值 */
  successMessage?: string;
  /** 失败后的 toast 消息，不传则使用默认值 */
  errorMessage?: string;
  /** 成功回调 */
  onSuccess?: (data: T) => void;
  /** 失败回调 */
  onError?: (error: string) => void;
}

interface UseMutationReturn<T> {
  execute: (body?: unknown) => Promise<T | null>;
  loading: boolean;
  data: T | null;
  error: string | null;
  reset: () => void;
}

const DEFAULT_SUCCESS: Record<string, string> = {
  POST: "保存成功",
  PUT: "更新成功",
  PATCH: "更新成功",
  DELETE: "删除成功",
};
const DEFAULT_ERROR: Record<string, string> = {
  POST: "保存失败",
  PUT: "更新失败",
  PATCH: "更新失败",
  DELETE: "删除失败",
};

export function useMutation<T = unknown>(
  opts: UseMutationOptions<T>,
): UseMutationReturn<T> {
  const { url, method = "POST", successMessage, errorMessage, onSuccess, onError } = opts;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (body?: unknown): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
        if (body && method !== "DELETE") {
          init.body = JSON.stringify(body);
        }
        const res = await fetch(url, init);
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          setData(json);
          const msg = successMessage ?? DEFAULT_SUCCESS[method] ?? "操作成功";
          toast.success(msg);
          onSuccess?.(json);
          return json;
        } else {
          const msg = json?.error ?? errorMessage ?? DEFAULT_ERROR[method] ?? "操作失败";
          setError(msg);
          toast.error(msg);
          onError?.(msg);
          return null;
        }
      } catch {
        const msg = errorMessage ?? DEFAULT_ERROR[method] ?? "操作失败";
        setError(msg);
        toast.error(msg);
        onError?.(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [url, method, successMessage, errorMessage, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { execute, loading, data, error, reset };
}

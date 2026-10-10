import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";
import { useI18n } from "./i18n/i18n.ts";
import type { MessageKey } from "./i18n/messages.ts";

export interface ApiState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/**
 * GETs `path` (null = skip) and re-fetches when it changes or on reload().
 * Keeps the previous data while a new request is in flight; ignores stale responses.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [tick, setTick] = useState(0);
  const key = path === null ? null : `${tick}:${path}`;
  const [data, setData] = useState<T>();
  const [settled, setSettled] = useState<{ key: string; error?: unknown }>();

  useEffect(() => {
    if (key === null || path === null) return;
    let cancelled = false;
    api.get<T>(path).then(
      (value) => {
        if (cancelled) return;
        setData(value);
        setSettled({ key });
      },
      (error: unknown) => {
        if (!cancelled) setSettled({ key, error });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return {
    data,
    error: settled?.key === key ? settled.error : undefined,
    loading: key !== null && settled?.key !== key,
    reload,
    setData,
  };
}

/** Sets the browser tab title in the current language. */
export function useTitle(key: MessageKey, vars?: Record<string, string | number>): void {
  const { t } = useI18n();
  const title = t(key, vars);
  useEffect(() => {
    document.title = `${title} · Posventa`;
  }, [title]);
}

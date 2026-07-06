import { useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// loader 为 null 时不加载（例如 mock 模式下用同步数据）
export function useAsyncData<T>(loader: (() => Promise<T>) | null, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: !!loader, error: null });
  const [tick, setTick] = useState(0);
  const silentReloadRef = useRef(false);

  useEffect(() => {
    if (!loader) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let alive = true;
    const silentReload = silentReloadRef.current;
    silentReloadRef.current = false;
    setState((s) => ({ ...s, loading: !(silentReload && s.data !== null), error: null }));
    loader()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (alive) {
          setState((s) => ({
            data: silentReload && s.data !== null ? s.data : null,
            loading: false,
            error: e instanceof Error ? e.message : "加载失败"
          }));
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return {
    ...state,
    reload: () => {
      silentReloadRef.current = true;
      setTick((t) => t + 1);
    }
  };
}

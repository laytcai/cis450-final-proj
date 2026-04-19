import { useEffect, useRef, useState } from 'react';
import { apiGet } from '@/api/client';

export function useFetch(path, { params, enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled && path));
  const reloadRef = useRef(0);

  useEffect(() => {
    if (!enabled || !path) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiGet(path, { params, signal: controller.signal })
      .then((body) => {
        setData(body);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, reloadRef.current, ...deps]);

  const reload = () => {
    reloadRef.current += 1;
    setLoading(true);
  };

  return { data, error, loading, reload };
}

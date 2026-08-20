import { useEffect, useState } from 'react';
import axiosClient from './axiosClient';

/**
 * Minimal GET-and-render hook for the read-only pages.
 *
 * The result carries the url it belongs to, so `loading` is derived during
 * render rather than toggled from inside the effect - which also means a url
 * change reads as loading immediately, with no frame of stale data.
 */
export default function useFetch(url) {
  const [result, setResult] = useState({ url: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    axiosClient
      .get(url)
      .then((response) => {
        if (!cancelled) setResult({ url, data: response.data, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            url,
            data: null,
            error: err.response?.data?.detail ?? err.message ?? 'Request failed.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return {
    data: result.data,
    error: result.error,
    loading: result.url !== url,
  };
}

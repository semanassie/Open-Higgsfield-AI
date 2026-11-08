import { useCallback, useMemo, useState } from "react";

/**
 * Side-by-side compare selection (max 2 assets by default).
 *
 * Usage:
 *   const { selected, toggle, clear, canCompare, pair } = useCompare();
 *   // toggle(asset) on history cards; when canCompare → render CompareView
 */
export function useCompare({ max = 2 } = {}) {
  const [selected, setSelected] = useState([]);

  const toggle = useCallback(
    (asset) => {
      if (!asset?.id && !asset?.url) return;
      const key = asset.id || asset.url;
      setSelected((prev) => {
        const exists = prev.findIndex((a) => (a.id || a.url) === key);
        if (exists >= 0) {
          return prev.filter((_, i) => i !== exists);
        }
        const next = [...prev, asset];
        if (next.length > max) return next.slice(next.length - max);
        return next;
      });
    },
    [max],
  );

  const selectPair = useCallback((a, b) => {
    setSelected([a, b].filter(Boolean).slice(0, 2));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const isSelected = useCallback(
    (asset) => {
      const key = asset?.id || asset?.url;
      if (!key) return false;
      return selected.some((a) => (a.id || a.url) === key);
    },
    [selected],
  );

  const canCompare = selected.length === 2;
  const pair = canCompare ? selected : null;

  return useMemo(
    () => ({
      selected,
      toggle,
      selectPair,
      clear,
      isSelected,
      canCompare,
      pair,
      max,
    }),
    [selected, toggle, selectPair, clear, isSelected, canCompare, pair, max],
  );
}

export default useCompare;

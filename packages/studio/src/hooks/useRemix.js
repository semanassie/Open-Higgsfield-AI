import { useCallback, useMemo } from "react";
import { toHistoryMeta } from "../lib/assetsStore.js";

/**
 * Remix from history: apply stored prompt + refs + model + seed + aspect.
 *
 * Usage:
 *   const { remix, buildRemixState } = useRemix({
 *     onApply: ({ prompt, model, seed, refs, aspect_ratio }) => { ... }
 *   });
 *   remix(asset);
 */
export function useRemix({ onApply } = {}) {
  const buildRemixState = useCallback((assetOrMeta) => {
    const meta = assetOrMeta?.url
      ? toHistoryMeta(assetOrMeta)
      : assetOrMeta
        ? {
            prompt: assetOrMeta.prompt || "",
            model: assetOrMeta.model || "",
            seed: assetOrMeta.seed ?? null,
            refs: Array.isArray(assetOrMeta.refs) ? [...assetOrMeta.refs] : [],
            aspect_ratio: assetOrMeta.aspect_ratio || "",
            type: assetOrMeta.type,
            url: assetOrMeta.url,
            id: assetOrMeta.id,
          }
        : null;
    return meta;
  }, []);

  const remix = useCallback(
    (assetOrMeta) => {
      const state = buildRemixState(assetOrMeta);
      if (!state) return null;
      onApply?.(state);
      return state;
    },
    [buildRemixState, onApply],
  );

  return useMemo(() => ({ remix, buildRemixState }), [remix, buildRemixState]);
}

export default useRemix;

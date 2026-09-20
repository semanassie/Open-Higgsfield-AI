import { useCallback, useEffect, useState } from "react";
import {
  listAssets,
  deleteAsset,
  migrateFromLocalStorageOnce,
} from "../lib/assetsStore.js";

/**
 * Reactive list of assets from IndexedDB.
 */
export function useAssets({ type = null, studio = null, limit = 200 } = {}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await migrateFromLocalStorageOnce();
      const rows = await listAssets({
        type: type || undefined,
        studio: studio || undefined,
        limit,
      });
      setAssets(rows);
    } catch (err) {
      console.error("[useAssets]", err);
      setError(err?.message || "Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [type, studio, limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id) => {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    },
    [],
  );

  return { assets, loading, error, refresh, remove };
}

export default useAssets;

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listMoodboard,
  addMoodboardItem,
  removeMoodboardItem,
} from "../lib/assetsStore.js";

/**
 * Persistent moodboard wall (URL + optional label) via IndexedDB moodboard store.
 * No generation / reference wiring.
 */
export default function MoodboardPanel({ className = "" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listMoodboard();
      rows.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      setItems(rows);
    } catch (err) {
      console.error("[MoodboardPanel] list failed:", err);
      setError(
        err?.message || "IndexedDB unavailable — moodboard cannot load.",
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      await addMoodboardItem({ url: trimmed, label: label.trim() });
      setUrl("");
      setLabel("");
      await refresh();
    } catch (err) {
      console.error("[MoodboardPanel] add failed:", err);
      setError(err?.message || "Failed to save moodboard item.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id) => {
    setError(null);
    try {
      await removeMoodboardItem(id);
      setItems((prev) => prev.filter((row) => row.id !== id));
    } catch (err) {
      console.error("[MoodboardPanel] remove failed:", err);
      setError(err?.message || "Failed to remove item.");
    }
  };

  return (
    <div
      className={`flex flex-col h-full w-full bg-[#0a0a0a] text-white border border-white/10 rounded-xl overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">Moodboard</h2>
          <p className="text-[11px] text-white/40">
            Save image URLs for later — local to this browser
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-[11px] px-2 py-1 rounded border border-white/15 hover:border-white/40 text-white/70"
        >
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleAdd}
        className="px-4 py-3 border-b border-white/5 flex flex-col sm:flex-row gap-2"
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Image URL"
          className="flex-1 min-w-0 h-9 px-3 rounded-md bg-black/40 border border-white/10 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#22d3ee]/50"
        />
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="sm:w-40 h-9 px-3 rounded-md bg-black/40 border border-white/10 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#22d3ee]/50"
        />
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="h-9 px-4 rounded-md bg-[#22d3ee]/15 text-[#22d3ee] text-[12px] font-semibold border border-[#22d3ee]/30 hover:bg-[#22d3ee]/25 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : "Add"}
        </button>
      </form>

      {error && (
        <div className="px-4 py-2 text-[12px] text-red-400 border-b border-white/5">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-white/40">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-white/40">
            No moodboard items yet — paste an image URL above.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/40"
              >
                <div className="aspect-square bg-black/50">
                  <img
                    src={item.url}
                    alt={item.label || "Moodboard"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between gap-1">
                  {item.label ? (
                    <p className="text-[10px] text-white/80 truncate flex-1">
                      {item.label}
                    </p>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-red-500/40 text-white/80"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
